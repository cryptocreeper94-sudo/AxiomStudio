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
import { db } from "./db.js";
import { workspaceFiles } from "../shared/schema.js";
import { eq, and, like, ilike } from "drizzle-orm";

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

  const blocked = /\b(rm\s+-rf\s+\/|format\s+[a-z]:|shutdown|reboot|mkfs|dd\s+if=)\b/i;
  if (blocked.test(command)) {
    return `Error: Command blocked for safety: "${command}"`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout: 30000,
      maxBuffer: 8 * 1024,
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
