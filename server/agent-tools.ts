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
import { workspaceFiles } from "../shared/schema.js";
import { eq, and, like, ilike, sql } from "drizzle-orm";

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
    description: "Generate an image using DALL-E 3. Returns the URL of the generated image.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Text description of the image to generate" },
        size: { type: "string", description: "Optional size, default is 1024x1024" }
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
];

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
  userRole: string
): Promise<string> {
  try {
    switch (name) {
      case "read_file":
        return await toolReadFile(args.path, userId);
      case "write_file":
        return await toolWriteFile(args.path, args.content, userId);
      case "list_directory":
        return await toolListDirectory(args.path ?? "", userId);
      case "search_files":
        return await toolSearchFiles(args.query, args.path_prefix ?? "", userId);
      case "run_command":
        if (userRole !== "owner") {
          return "Error: run_command is restricted to owner accounts only.";
        }
        return await toolRunCommand(args.command, args.cwd);
      case "import_github":
        if (userRole !== "owner") {
          return "Error: import_github is restricted to owner accounts only.";
        }
        return await toolImportGitHub(args.repo_url, args.target_dir, userId);
      case "generate_image":
        return await toolGenerateImage(args.prompt, args.size);
      case "push_to_depot":
        return await toolPushToDepot(args.repo_name, args.message, userId);
      case "search_web":
        return await toolSearchWeb(args.query, args.num_results);
      case "delete_file":
        return await toolDeleteFile(args.path, userId);
      default:
        return `Error: Unknown tool "${name}"`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err.message}`;
  }
}

// ─── read_file ─────────────────────────────────────────────────────────

async function toolReadFile(filePath: string, userId: string): Promise<string> {
  if (!filePath) return "Error: path is required";
  const normalized = normalizePath(filePath);

  const result = await db
    .select({ content: workspaceFiles.content })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.filePath, normalized)))
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
  userId: string
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
      .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.filePath, dirPath)))
      .limit(1);
    if (!exists.length) {
      await db.insert(workspaceFiles).values({
        userId,
        filePath: dirPath,
        isDirectory: true,
        content: "",
        sizeBytes: 0,
      }).onConflictDoNothing();
    }
  }

  // Upsert the file
  const existing = await db
    .select({ id: workspaceFiles.id })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.filePath, normalized)))
    .limit(1);

  const sizeBytes = Buffer.byteLength(content, "utf8");

  if (existing.length) {
    await db
      .update(workspaceFiles)
      .set({ content, sizeBytes, updatedAt: new Date() })
      .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.filePath, normalized)));
  } else {
    await db.insert(workspaceFiles).values({
      userId,
      filePath: normalized,
      isDirectory: false,
      content,
      sizeBytes,
    });
  }

  return `Successfully wrote ${sizeBytes} bytes to "${normalized}"`;
}

// ─── list_directory ────────────────────────────────────────────────────

async function toolListDirectory(dirPath: string, userId: string): Promise<string> {
  const normalized = dirPath === "." || dirPath === "/" ? "" : normalizePath(dirPath);

  const allFiles = await db
    .select({ filePath: workspaceFiles.filePath, isDirectory: workspaceFiles.isDirectory })
    .from(workspaceFiles)
    .where(eq(workspaceFiles.userId, userId));

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
  userId: string
): Promise<string> {
  if (!query) return "Error: query is required";

  const normalized = pathPrefix ? normalizePath(pathPrefix) : "";

  const conditions: any[] = [
    eq(workspaceFiles.userId, userId),
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
  userId: string
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
        .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.filePath, file.path)))
        .limit(1);

      if (existing.length) {
        await db
          .update(workspaceFiles)
          .set({ content: file.content, sizeBytes, updatedAt: new Date() })
          .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.filePath, file.path)));
      } else {
        await db.insert(workspaceFiles).values({
          userId,
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

// ─── generate_image ────────────────────────────────────────────────────

async function toolGenerateImage(prompt: string, size?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "Error: OPENAI_API_KEY not set. Image generation requires an OpenAI API key.";
  
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: size || "1024x1024",
        model: "dall-e-3",
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const imageUrl = data.data[0].url;
    return `Image generated successfully!\nURL: ${imageUrl}`;
  } catch (err: any) {
    return `Error generating image: ${err.message}`;
  }
}

// ─── push_to_depot ─────────────────────────────────────────────────────

async function toolPushToDepot(repoName: string, message: string, userId: string): Promise<string> {
  if (!repoName) return "Error: repo_name is required";
  
  try {
    // 1. Get all files for user
    const files = await db
      .select({ path: workspaceFiles.filePath, content: workspaceFiles.content, isDirectory: workspaceFiles.isDirectory })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.userId, userId), eq(workspaceFiles.isDirectory, false)));
      
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

async function toolDeleteFile(filePath: string, userId: string): Promise<string> {
  if (!filePath) return "Error: path is required";
  const normalized = normalizePath(filePath);

  // Delete the file and any children (if directory)
  const pattern = `${normalized}/%`;
  const result = await db.execute(
    sql`DELETE FROM workspace_files WHERE user_id = ${userId} AND (file_path = ${normalized} OR file_path LIKE ${pattern})`
  );

  return `Deleted "${normalized}" from workspace.`;
}
