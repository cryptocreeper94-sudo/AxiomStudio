/**
 * Axiom Studio — Agent Tools
 * Tool definitions and execution for the agentic loop.
 * Files: DB-backed (workspace_files table).
 * Commands: owner-only, real shell via child_process.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, readdirSync, statSync, existsSync, rmSync, mkdirSync } from "fs";
import { join, relative, extname } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { workspaceFiles, workspaceFileHistory } from "../shared/schema.js";
import { eq, and, like, ilike, sql } from "drizzle-orm";
import { computeDiff, compactDiff } from "./diff-utils.js";

const execAsync = promisify(exec);

// ─── Tool Definitions (Anthropic format) ──────────────────────────────

export const ANTHROPIC_TOOLS: any[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file in the user's workspace. Returns file content as text.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root, e.g. 'src/index.ts'",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create or overwrite a file in the user's workspace with new content. Creates parent directories automatically.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root, e.g. 'src/newfile.ts'",
        },
        content: {
          type: "string",
          description: "Full content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description:
      "List files and subdirectories in the workspace. Only shows immediate children, not recursive.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory path relative to workspace root. Use empty string or '.' for workspace root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description:
      "Search for a text string across all workspace files. Returns matching file paths and relevant line snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search for (case-insensitive)",
        },
        path_prefix: {
          type: "string",
          description:
            "Optional directory prefix to narrow search, e.g. 'src/'. Leave empty to search all files.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "run_command",
    description:
      "Execute a shell command on the server (owner-only). Returns stdout and stderr. Use for npm, git, build tools, tests. 30-second timeout.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to run, e.g. 'npm test', 'git status', 'ls -la'",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (optional). Defaults to server root.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "import_github",
    description:
      "Import a public GitHub repository into the user's cloud workspace. Clones the repo, reads all text files, and stores them persistently in the workspace database. Use this when the user wants to work with an existing project. Supports public repos only.",
    input_schema: {
      type: "object",
      properties: {
        repo_url: {
          type: "string",
          description: "GitHub repository URL, e.g. 'https://github.com/user/repo' or 'user/repo'",
        },
        target_dir: {
          type: "string",
          description: "Optional subdirectory in workspace to import into, e.g. 'my-project'. Defaults to repo name.",
        },
      },
      required: ["repo_url"],
    },
  },
  {
    name: "generate_image",
    description: "Generate an image. Defaults to Gemini Imagen 3 (free). Use provider='openai' for DALL-E 3 (higher quality, costs 2 credits).",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Text description of the image to generate" },
        size: { type: "string", description: "Optional size. For Gemini: '1:1','16:9','9:16','4:3','3:4'. For DALL-E: '1024x1024','1792x1024','1024x1792'. Defaults to square." },
        provider: { type: "string", enum: ["gemini", "openai"], description: "Image provider. 'gemini' = Imagen 3 (free), 'openai' = DALL-E 3 (premium, 2 credits). Defaults to gemini." }
      },
      required: ["prompt"],
    },
  },
  {
    name: "push_to_depot",
    description: "Push the current cloud workspace files to an Axiom Depot repository. Creates the repository if it does not exist, or creates a new snapshot if it does.",
    input_schema: {
      type: "object",
      properties: {
        repo_name: { type: "string", description: "Name of the repository" },
        message: { type: "string", description: "Snapshot commit message describing the changes" }
      },
      required: ["repo_name", "message"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for information. Returns relevant results with titles, URLs, and snippets. Use this when you need up-to-date information, documentation, or to research APIs and libraries.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        num_results: { type: "number", description: "Number of results to return (default 5, max 10)" }
      },
      required: ["query"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or directory from the workspace. Use with caution.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to workspace root" }
      },
      required: ["path"],
    },
  },
  {
    name: "delegate_task",
    description: "Delegate a subtask to another AI agent. The subagent runs independently with access to the same workspace, then returns its result. Use for research, boilerplate generation, code review, or parallel work. The subagent has a 2-minute timeout and max 20 tool iterations.",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Clear description of the subtask for the subagent to complete" },
        agent: {
          type: "string",
          enum: ["sonnet", "flash", "gemini", "deepseek"],
          description: "Which agent to delegate to. 'sonnet' for code tasks, 'deepseek' for budget code tasks, 'flash' for simple Q&A (free), 'gemini' for large context analysis",
        },
      },
      required: ["task", "agent"],
    },
  },
  {
    name: "edit_file",
    description: "Make a surgical edit to a file by replacing specific target content with new content. Much more efficient than write_file for small changes.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to workspace root" },
        target_content: { type: "string", description: "The EXACT string to find and replace. Must match precisely." },
        replacement_content: { type: "string", description: "The new content to replace the target with." },
      },
      required: ["path", "target_content", "replacement_content"],
    },
  },
  {
    name: "view_file",
    description: "View the contents of a file with optional line range. Returns numbered lines. More efficient than read_file for large files.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to workspace root" },
        start_line: { type: "number", description: "First line to show (1-based). Defaults to 1." },
        end_line: { type: "number", description: "Last line to show (1-based, inclusive). Max 500 lines." },
      },
      required: ["path"],
    },
  },
];

// Tools that require user approval before execution
export const TOOLS_REQUIRING_APPROVAL = new Set(["write_file", "edit_file", "delete_file", "run_command"]);

// OpenAI function-calling format (wraps Anthropic defs)
export const OPENAI_TOOLS: any[] = ANTHROPIC_TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

// ─── Tool Executor ─────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, any>,
  userId: string,
  userRole: string,
  conversationId: string
): Promise<string> {
  try {
    switch (name) {
      case "read_file":
        return await toolReadFile(args.path, userId, conversationId);
      case "write_file":
        return await toolWriteFile(args.path, args.content, userId, conversationId);
      case "list_directory":
        return await toolListDirectory(args.path ?? "", userId, conversationId);
      case "search_files":
        return await toolSearchFiles(args.query, args.path_prefix ?? "", userId, conversationId);
      case "run_command":
        if (userRole !== "owner") {
          return "Error: run_command is restricted to owner accounts only.";
        }
        return await toolRunCommand(args.command, args.cwd);
      case "import_github":
        if (userRole !== "owner") {
          return "Error: import_github is restricted to owner accounts only.";
        }
        return await toolImportGitHub(args.repo_url, args.target_dir, userId, conversationId);
      case "generate_image":
        return await toolGenerateImage(args.prompt, args.size, args.provider);
      case "push_to_depot":
        return await toolPushToDepot(args.repo_name, args.message, userId, conversationId);
      case "search_web":
        return await toolSearchWeb(args.query, args.num_results);
      case "delete_file":
        return await toolDeleteFile(args.path, userId, conversationId);
      case "delegate_task":
        return await toolDelegateTask(args.task, args.agent, userId, userRole, conversationId);
      case "edit_file":
        return await toolEditFile(args.path, args.target_content, args.replacement_content, userId, conversationId);
      case "view_file":
        return await toolViewFile(args.path, args.start_line, args.end_line, userId, conversationId);
      default:
        return `Error: Unknown tool "${name}"`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err.message}`;
  }
}

// ─── read_file ─────────────────────────────────────────────────────────

async function toolReadFile(filePath: string, userId: string, conversationId: string): Promise<string> {
  if (!filePath) return "Error: path is required";
  const normalized = normalizePath(filePath);

  const result = await db
    .select({ content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, normalized)))
    .limit(1);

  if (!result.length) {
    return `Error: File not found: "${normalized}". Use list_directory('') to see available files.`;
  }

  const content = result[0].content ?? "";
  if (content.length > 32768) {
    return content.slice(0, 32768) + `\n\n[truncated — file is ${content.length} chars total]`;
  }
  return content || "(empty file)";
}

// ─── write_file ────────────────────────────────────────────────────────

async function toolWriteFile(
  filePath: string,
  content: string,
  userId: string,
  conversationId: string
): Promise<string> {
  if (!filePath) return "Error: path is required";
  if (content == null) return "Error: content is required";

  const normalized = normalizePath(filePath);

  // Ensure parent directories exist in DB
  const parts = normalized.split("/");
  for (let i = 1; i < parts.length; i++) {
    const dirPath = parts.slice(0, i).join("/");
    const exists = await db
      .select({ id: workspaceFiles.id })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, dirPath)))
      .limit(1);
    if (!exists.length) {
      await db.insert(workspaceFiles).values({
        userId,
        conversationId,
        filePath: dirPath,
        isDirectory: true,
        content: "",
        sizeBytes: 0,
      }).onConflictDoNothing();
    }
  }

  // Read existing content for history snapshot + diff
  const existingRows = await db
    .select({ id: workspaceFiles.id, content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, normalized)))
    .limit(1);

  const oldContent = existingRows.length ? (existingRows[0].content ?? "") : null;
  let diffSummary = "";

  // Snapshot old content into history before overwriting
  if (oldContent !== null) {
    await db.insert(workspaceFileHistory).values({
      userId,
      conversationId,
      filePath: normalized,
      content: oldContent,
      action: "write",
      sizeBytes: Buffer.byteLength(oldContent, "utf8"),
    });

    // Compute diff for the response
    const diff = computeDiff(oldContent, content);
    diffSummary = ` (${diff.summary})`;

    // Prune old history — keep last 50 versions per file
    try {
      await db.execute(sql`
        DELETE FROM workspace_file_history
        WHERE user_id = ${userId} AND file_path = ${normalized}
        AND id NOT IN (
          SELECT id FROM workspace_file_history
          WHERE user_id = ${userId} AND file_path = ${normalized}
          ORDER BY created_at DESC LIMIT 50
        )
      `);
    } catch { /* best effort */ }
  }

  const sizeBytes = Buffer.byteLength(content, "utf8");

  if (existingRows.length) {
    await db
      .update(workspaceFiles)
      .set({ content, sizeBytes, updatedAt: new Date() })
      .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, normalized)));
  } else {
    await db.insert(workspaceFiles).values({
      userId,
      conversationId,
      filePath: normalized,
      isDirectory: false,
      content,
      sizeBytes,
    });
  }

  return `Successfully wrote ${sizeBytes} bytes to "${normalized}"${diffSummary}`;
}

// ─── list_directory ────────────────────────────────────────────────────

async function toolListDirectory(dirPath: string, userId: string, conversationId: string): Promise<string> {
  const normalized = dirPath === "." || dirPath === "/" ? "" : normalizePath(dirPath);

  const allFiles = await db
    .select({ filePath: workspaceFiles.filePath, isDirectory: workspaceFiles.isDirectory })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId)));

  const children = allFiles.filter((f) => {
    if (normalized === "") {
      return !f.filePath.includes("/");
    }
    if (!f.filePath.startsWith(normalized + "/")) return false;
    const rest = f.filePath.slice(normalized.length + 1);
    return !rest.includes("/");
  });

  if (!children.length) {
    return normalized
      ? `"${normalized}" is empty or does not exist. Use list_directory('') to see all files.`
      : "Workspace is empty — no files have been created yet.";
  }

  const lines = children
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.filePath.localeCompare(b.filePath);
    })
    .map((f) => {
      const name = f.filePath.split("/").pop();
      return f.isDirectory ? `📁 ${name}/` : `📄 ${name}`;
    });

  return `Contents of "${normalized || "workspace root"}":\n${lines.join("\n")}`;
}

// ─── search_files ──────────────────────────────────────────────────────

async function toolSearchFiles(
  query: string,
  pathPrefix: string,
  userId: string,
  conversationId: string
): Promise<string> {
  if (!query) return "Error: query is required";

  const normalized = pathPrefix ? normalizePath(pathPrefix) : "";

  const conditions: any[] = [
    eq(workspaceFiles.userId, userId),
    eq(workspaceFiles.conversationId, conversationId),
    eq(workspaceFiles.isDirectory, false),
    ilike(workspaceFiles.content, `%${query}%`),
  ];
  if (normalized) {
    conditions.push(like(workspaceFiles.filePath, `${normalized}%`));
  }

  const results = await db
    .select({ filePath: workspaceFiles.filePath, content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(...conditions))
    .limit(20);

  if (!results.length) {
    return `No files found containing "${query}"${normalized ? ` in "${normalized}"` : ""}.`;
  }

  const output: string[] = [`Found "${query}" in ${results.length} file(s):\n`];
  for (const file of results) {
    output.push(`── ${file.filePath}`);
    const lines = (file.content ?? "").split("\n");
    const matches = lines
      .map((line, i) => ({ line, num: i + 1 }))
      .filter(({ line }) => line.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
    for (const { line, num } of matches) {
      output.push(`  L${num}: ${line.trim().slice(0, 120)}`);
    }
  }

  return output.join("\n");
}

// ─── run_command (owner-only) ──────────────────────────────────────────

async function toolRunCommand(command: string, cwd?: string): Promise<string> {
  if (!command) return "Error: command is required";

  // Whitelist of safe command prefixes
  const ALLOWED_COMMANDS = [
    'npm', 'npx', 'node', 'git', 'ls', 'dir', 'cat', 'type', 'echo',
    'mkdir', 'cp', 'mv', 'touch', 'head', 'tail', 'grep', 'find',
    'pwd', 'cd', 'which', 'where', 'tsc', 'tsx', 'python', 'python3',
    'pip', 'pip3', 'cargo', 'rustc', 'go', 'java', 'javac', 'make',
    'cmake', 'gcc', 'g++', 'clang', 'dotnet', 'ruby', 'perl',
    'curl', 'wget', 'tar', 'unzip', 'zip',
    'docker', 'docker-compose',
    'tree', 'wc', 'sort', 'uniq', 'diff', 'patch', 'sed', 'awk',
    'chmod', 'chown', 'ln',
    'sass', 'less', 'prettier', 'eslint', 'vitest', 'jest', 'mocha',
    'vite', 'webpack', 'rollup', 'esbuild', 'bun', 'deno',
  ];

  const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
  if (!ALLOWED_COMMANDS.includes(firstWord)) {
    return `Error: Command "${firstWord}" is not in the allowed command list. Allowed: ${ALLOWED_COMMANDS.slice(0, 15).join(', ')}...`;
  }

  // Block dangerous patterns even in allowed commands
  const dangerousPatterns = /\b(rm\s+-rf\s+\/|format\s+[a-z]:|>\s*\/dev\/|>\s*\/etc\/|\|\s*sh\b|\|\s*bash\b|eval\s|exec\s|`|;\s*rm\s|&&\s*rm\s)/i;
  if (dangerousPatterns.test(command)) {
    return `Error: Command contains dangerous patterns and was blocked for safety.`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout: 30000,
      maxBuffer: 128 * 1024,
      windowsHide: true,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
    });
    const out = [stdout, stderr].filter(Boolean).join("\n").trim();
    return out || "(command completed with no output)";
  } catch (err: any) {
    const out = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    return `Exit ${err.code ?? "?"}:\n${out || err.message}`;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function normalizePath(p: string): string {
  return p.replace(/^\/+/, "").replace(/\\/g, "/").replace(/\/+$/, "").trim();
}

// ─── import_github (owner-only) ────────────────────────────────────────

const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".next", "__pycache__", ".venv", "vendor", "build"]);
const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".svg", ".bmp",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".avi",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".pyc", ".class", ".o", ".a",
  ".glb", ".gltf", ".fbx", ".obj",
  ".lock",
]);
const MAX_FILE_SIZE = 512 * 1024; // 512KB per file
const MAX_FILES = 2000;

async function toolImportGitHub(
  repoUrl: string,
  targetDir: string | undefined,
  userId: string,
  conversationId: string
): Promise<string> {
  if (!repoUrl) return "Error: repo_url is required";

  // Normalize URL
  let url = repoUrl.trim();
  if (!url.startsWith("http")) {
    url = `https://github.com/${url}`;
  }
  url = url.replace(/\.git$/, "");
  if (!url.includes("github.com")) {
    return "Error: Only GitHub repositories are supported. Provide a URL like https://github.com/user/repo";
  }

  // Extract repo name for default target dir
  const repoName = url.split("/").pop() || "project";
  const dest = targetDir || repoName;

  // Create temp directory
  const tmpDir = join(tmpdir(), `axiom-import-${randomUUID()}`);

  try {
    mkdirSync(tmpDir, { recursive: true });

    // Clone (shallow, single branch for speed)
    console.log(`[Import] Cloning ${url} → ${tmpDir}`);
    await execAsync(`git clone --depth 1 --single-branch "${url}.git" repo`, {
      cwd: tmpDir,
      timeout: 60000, // 60s for large repos
      maxBuffer: 1024 * 1024,
    });

    const repoDir = join(tmpDir, "repo");
    if (!existsSync(repoDir)) {
      return "Error: Clone failed — repository not found or is private.";
    }

    // Walk the repo and collect text files
    const files: { path: string; content: string }[] = [];

    function walkDir(dir: string) {
      if (files.length >= MAX_FILES) return;
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry)) continue;
        const fullPath = join(dir, entry);
        let stat;
        try {
          stat = statSync(fullPath);
        } catch {
          continue;
        }
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (BINARY_EXTS.has(ext)) continue;
          if (stat.size > MAX_FILE_SIZE) continue;
          if (stat.size === 0) continue;

          try {
            const content = readFileSync(fullPath, "utf-8");
            // Skip files that look binary (contain null bytes)
            if (content.includes("\0")) continue;
            const relPath = relative(repoDir, fullPath).replace(/\\/g, "/");
            files.push({ path: `${dest}/${relPath}`, content });
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    walkDir(repoDir);

    if (files.length === 0) {
      return "Error: No importable text files found in the repository.";
    }

    // Insert all files into workspace_files
    let imported = 0;
    for (const file of files) {
      const sizeBytes = Buffer.byteLength(file.content, "utf8");

      // Ensure parent directories exist
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join("/");
        await db.insert(workspaceFiles).values({
          userId,
          conversationId,
          filePath: dirPath,
          isDirectory: true,
          content: "",
          sizeBytes: 0,
        }).onConflictDoNothing();
      }

      // Upsert file
      const existing = await db
        .select({ id: workspaceFiles.id })
        .from(workspaceFiles)
        .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, file.path)))
        .limit(1);

      if (existing.length) {
        await db
          .update(workspaceFiles)
          .set({ content: file.content, sizeBytes, updatedAt: new Date() })
          .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, file.path)));
      } else {
        await db.insert(workspaceFiles).values({
          userId,
          conversationId,
          filePath: file.path,
          isDirectory: false,
          content: file.content,
          sizeBytes,
        });
      }
      imported++;
    }

    console.log(`[Import] Successfully imported ${imported} files from ${url} → ${dest}/`);
    return `Successfully imported ${imported} files from ${url} into "${dest}/". Use list_directory("${dest}") to browse the project.`;

  } catch (err: any) {
    if (err.message?.includes("not found") || err.stderr?.includes("not found")) {
      return "Error: Repository not found. Make sure it's a valid public GitHub URL.";
    }
    return `Error importing repository: ${err.message}`;
  } finally {
    // Clean up temp directory
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}

// ─── generate_image (dual provider) ────────────────────────────────────

async function toolGenerateImage(prompt: string, size?: string, provider?: string): Promise<string> {
  const useOpenAI = provider === "openai";

  // DALL-E 3 (premium)
  if (useOpenAI) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return "Error: OpenAI is not available. Use provider='gemini' for free image generation.";
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ prompt, n: 1, size: size || "1024x1024", model: "dall-e-3" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return `Image generated with DALL-E 3 (premium)!\nURL: ${data.data[0].url}`;
    } catch (err: any) {
      return `Error generating image with DALL-E 3: ${err.message}`;
    }
  }

  // Gemini Imagen 3 (free default)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return "Error: GEMINI_API_KEY not set. Cannot generate images.";

  try {
    // Map friendly aspect ratios
    const aspectRatio = size === "16:9" ? "16:9"
      : size === "9:16" ? "9:16"
      : size === "4:3" ? "4:3"
      : size === "3:4" ? "3:4"
      : "1:1";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio },
        }),
      }
    );
    const data = await res.json();

    if (data.error) {
      // Fallback: try Gemini 2.0 Flash for image generation
      const fallbackRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );
      const fallbackData = await fallbackRes.json();
      if (fallbackData.error) throw new Error(fallbackData.error.message || "Gemini image generation failed");

      // Extract image from multimodal response
      const parts = fallbackData.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
      if (imgPart) {
        const dataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
        return `Image generated with Gemini (free)!\nURL: ${dataUrl}`;
      }
      return "Image generation completed but no image was returned. Try a more descriptive prompt.";
    }

    // Imagen 3 returns predictions with bytesBase64Encoded
    const prediction = data.predictions?.[0];
    if (prediction?.bytesBase64Encoded) {
      const dataUrl = `data:image/png;base64,${prediction.bytesBase64Encoded}`;
      return `Image generated with Imagen 3 (free)!\nURL: ${dataUrl}`;
    }

    return "Image generation completed but no image data received. Try rephrasing your prompt.";
  } catch (err: any) {
    return `Error generating image: ${err.message}`;
  }
}

// ─── push_to_depot ─────────────────────────────────────────────────────

async function toolPushToDepot(repoName: string, message: string, userId: string, conversationId: string): Promise<string> {
  if (!repoName) return "Error: repo_name is required";
  
  try {
    // 1. Get all files for user
    const files = await db
      .select({ path: workspaceFiles.filePath, content: workspaceFiles.content, isDirectory: workspaceFiles.isDirectory })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.isDirectory, false)));
      
    if (!files.length) return "Error: Workspace is empty. Nothing to push.";

    const slug = repoName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    
    // 2. Find or create repo
    let repoId: string;
    const existing = await db.execute(sql`SELECT id FROM depot_repos WHERE user_id = ${userId} AND slug = ${slug}`);
    
    if (existing.rows && existing.rows.length > 0) {
      repoId = String(existing.rows[0].id);
    } else {
      const inserted = await db.execute(sql`
        INSERT INTO depot_repos (user_id, name, slug, description, is_private)
        VALUES (${userId}, ${repoName}, ${slug}, 'Pushed from Axiom Studio', false)
        RETURNING id
      `);
      repoId = String(inserted.rows[0].id);
    }

    // 3. Create snapshot
    const totalSize = files.reduce((acc, f) => acc + (f.content?.length || 0), 0);
    const snap = await db.execute(sql`
      INSERT INTO depot_snapshots (repo_id, user_id, message, file_count, total_size_bytes)
      VALUES (${repoId}, ${userId}, ${message || 'Update from Axiom Studio'}, ${files.length}, ${totalSize})
      RETURNING id
    `);
    const snapshotId = String(snap.rows[0].id);

    // 4. Update files
    await db.execute(sql`DELETE FROM depot_files WHERE repo_id = ${repoId}`);
    
    for (const f of files) {
      const ext = f.path?.match(/\.[a-z]+$/i)?.[0] || '';
      await db.execute(sql`
        INSERT INTO depot_files (repo_id, snapshot_id, file_path, content, size_bytes, language, is_directory)
        VALUES (${repoId}, ${snapshotId}, ${f.path}, ${f.content || ''}, ${f.content?.length || 0}, ${ext}, false)
      `);
    }

    // 5. Update stats
    await db.execute(sql`
      UPDATE depot_repos SET
        file_count = ${files.length},
        total_size_bytes = ${totalSize},
        snapshot_count = snapshot_count + 1,
        last_snapshot_at = NOW(),
        updated_at = NOW()
      WHERE id = ${repoId}
    `);

    // 6. Log activity
    await db.execute(sql`
      INSERT INTO depot_activity (repo_id, user_id, action, details)
      VALUES (${repoId}, ${userId}, 'push', 'Pushed from Axiom Studio IDE')
    `);

    return `Successfully pushed ${files.length} files to Axiom Depot repository '${repoName}'. You can view it at axiomdepot.tlid.io.`;
  } catch (err: any) {
    return `Error pushing to Depot: ${err.message}`;
  }
}

// ─── search_web ────────────────────────────────────────────────────────

async function toolSearchWeb(query: string, numResults?: number): Promise<string> {
  if (!query) return "Error: query is required";
  const count = Math.min(Math.max(numResults || 5, 1), 10);

  try {
    // Use DuckDuckGo HTML search (no API key required)
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) throw new Error(`Search returned ${res.status}`);
    const html = await res.text();

    // Parse results from DuckDuckGo HTML
    const results: { title: string; url: string; snippet: string }[] = [];
    const resultBlocks = html.split('class="result__body"');

    for (let i = 1; i < resultBlocks.length && results.length < count; i++) {
      const block = resultBlocks[i];

      // Extract title
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
      const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim() : "";

      // Extract URL
      const urlMatch = block.match(/href="([^"]*uddg=([^&"]*))/);
      let url = "";
      if (urlMatch && urlMatch[2]) {
        try { url = decodeURIComponent(urlMatch[2]); } catch { url = urlMatch[2]; }
      }

      // Extract snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim() : "";

      if (title && (url || snippet)) {
        results.push({ title, url, snippet: snippet.substring(0, 200) });
      }
    }

    if (results.length === 0) {
      return `No search results found for "${query}". Try rephrasing your query.`;
    }

    const output: string[] = [`Web search results for "${query}":\n`];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      output.push(`${i + 1}. **${r.title}**`);
      if (r.url) output.push(`   URL: ${r.url}`);
      if (r.snippet) output.push(`   ${r.snippet}`);
      output.push("");
    }

    return output.join("\n");
  } catch (err: any) {
    return `Error searching web: ${err.message}`;
  }
}

// ─── delete_file ───────────────────────────────────────────────────────

async function toolDeleteFile(filePath: string, userId: string, conversationId: string): Promise<string> {
  if (!filePath) return "Error: path is required";
  const normalized = normalizePath(filePath);

  // Snapshot files before deleting for undo support
  const filesToDelete = await db
    .select({ filePath: workspaceFiles.filePath, content: workspaceFiles.content, isDirectory: workspaceFiles.isDirectory })
    .from(workspaceFiles)
    .where(and(
      eq(workspaceFiles.userId, userId),
      eq(workspaceFiles.conversationId, conversationId),
      eq(workspaceFiles.filePath, normalized),
    ));

  for (const f of filesToDelete) {
    if (!f.isDirectory) {
      await db.insert(workspaceFileHistory).values({
        userId,
        conversationId,
        filePath: f.filePath,
        content: f.content ?? "",
        action: "delete",
        sizeBytes: Buffer.byteLength(f.content ?? "", "utf8"),
      });
    }
  }

  // Delete the file and any children (if directory)
  const pattern = `${normalized}/%`;
  await db.execute(
    sql`DELETE FROM workspace_files WHERE user_id = ${userId} AND conversation_id = ${conversationId} AND (file_path = ${normalized} OR file_path LIKE ${pattern})`
  );

  return `Deleted "${normalized}" from workspace.`;
}

// ─── delegate_task (subagent) ─────────────────────────────────────────

async function toolDelegateTask(
  task: string,
  agentId: string,
  userId: string,
  userRole: string,
  conversationId: string
): Promise<string> {
  if (!task) return "Error: task description is required";
  if (!agentId) return "Error: agent is required (sonnet, mini, or gemini)";

  try {
    // Dynamic import to avoid circular dependency
    const { executeSubagent } = await import("./subagent-executor.js");
    const result = await executeSubagent(task, agentId, userId, userRole, conversationId);
    return result;
  } catch (err: any) {
    return `Error delegating task: ${err.message}`;
  }
}

// ─── edit_file (surgical edits on DB-backed files) ─────────────────────

async function toolEditFile(
  filePath: string,
  targetContent: string,
  replacementContent: string,
  userId: string,
  conversationId: string
): Promise<string> {
  if (!filePath) return "Error: path is required";
  if (targetContent == null) return "Error: target_content is required";
  if (replacementContent == null) return "Error: replacement_content is required";

  const normalized = normalizePath(filePath);

  const result = await db
    .select({ id: workspaceFiles.id, content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, normalized)))
    .limit(1);

  if (!result.length) {
    return `Error: File not found: "${normalized}". Use list_directory('') to see available files.`;
  }

  const content = result[0].content ?? "";
  
  // Count occurrences
  const occurrences = content.split(targetContent).length - 1;
  if (occurrences === 0) {
    return `Error: target_content not found in "${normalized}". Make sure it matches EXACTLY, including whitespace.`;
  }
  if (occurrences > 1) {
    return `Error: target_content found ${occurrences} times. Include more context to make it unique.`;
  }

  // Snapshot old content for history
  await db.insert(workspaceFileHistory).values({
    userId,
    conversationId,
    filePath: normalized,
    content: content,
    action: "edit",
    sizeBytes: Buffer.byteLength(content, "utf8"),
  });

  // Perform replacement
  const newContent = content.replace(targetContent, replacementContent);
  const sizeBytes = Buffer.byteLength(newContent, "utf8");

  await db
    .update(workspaceFiles)
    .set({ content: newContent, sizeBytes, updatedAt: new Date() })
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, normalized)));

  const oldLines = targetContent.split("\n").length;
  const newLines = replacementContent.split("\n").length;
  return `Successfully edited "${normalized}" — replaced ${oldLines} line(s) with ${newLines} line(s)`;
}

// ─── view_file (line-range reading on DB-backed files) ─────────────────

async function toolViewFile(
  filePath: string,
  startLine?: number,
  endLine?: number,
  userId?: string,
  conversationId?: string
): Promise<string> {
  if (!filePath) return "Error: path is required";
  if (!userId || !conversationId) return "Error: userId and conversationId are required";

  const normalized = normalizePath(filePath);

  const result = await db
    .select({ content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.conversationId, conversationId), eq(workspaceFiles.filePath, normalized)))
    .limit(1);

  if (!result.length) {
    return `Error: File not found: "${normalized}"`;
  }

  const content = result[0].content ?? "";
  const allLines = content.split("\n");
  const totalLines = allLines.length;

  let start = Math.max(1, startLine || 1);
  let end = Math.min(totalLines, endLine || totalLines);
  if (end - start + 1 > 500) end = start + 499;

  const selectedLines = allLines.slice(start - 1, end);
  const numberedLines = selectedLines.map((line, i) => `${start + i}: ${line}`).join("\n");

  return `File: ${normalized}\nTotal Lines: ${totalLines}\nShowing lines ${start} to ${end}:\n${numberedLines}`;
}
