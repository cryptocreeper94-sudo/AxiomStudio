/**
 * Axiom Studio — Local Mode Agent Tools
 * Real filesystem operations instead of DB-backed workspace_files.
 * Direct read/write to disk. Native git. No abstraction layer.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { exec } from "child_process";
import { promisify } from "util";
import {
  readFileSync, writeFileSync, readdirSync, statSync,
  existsSync, mkdirSync, unlinkSync, rmSync,
} from "fs";
import { join, relative, resolve, extname } from "path";

const execAsync = promisify(exec);

// Workspace root — set via WORKSPACE_ROOT env or defaults to D:\
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "D:\\";

export function getWorkspaceRoot(): string {
  return WORKSPACE_ROOT;
}

// ─── Tool Definitions (Anthropic format) ──────────────────────────────

export const LOCAL_ANTHROPIC_TOOLS: any[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file from the local filesystem. Paths are relative to workspace root or absolute.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path — relative to workspace root or absolute, e.g. 'hydrocore/index.html' or 'D:/hydrocore/index.html'",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create or overwrite a file on the local filesystem. Creates parent directories automatically.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path — relative to workspace root or absolute",
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
      "List files and subdirectories. Shows immediate children with type indicators.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path — relative to workspace root or absolute. Use '' for workspace root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description:
      "Search for a text string across files in a directory. Returns matching file paths and line snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search for (case-insensitive)",
        },
        path_prefix: {
          type: "string",
          description: "Directory to search in — relative to workspace root or absolute. Defaults to workspace root.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "run_command",
    description:
      "Execute a shell command on the local machine. Full access to git, npm, node, and all local tools. 30-second timeout.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to run, e.g. 'git status', 'npm test', 'dir'",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command. Defaults to workspace root.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "generate_image",
    description:
      "Generate an image using DALL-E 3. Returns the URL of the generated image and optionally saves it to disk.",
    input_schema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text description of the image to generate",
        },
        save_path: {
          type: "string",
          description: "Optional file path to save the image to disk. If omitted, returns URL only.",
        },
        size: {
          type: "string",
          enum: ["1024x1024", "1792x1024", "1024x1792"],
          description: "Image dimensions. Defaults to 1024x1024.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for information. Returns a summary of search results with URLs.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "browse_url",
    description:
      "Fetch and read the content of a web page. Returns the text content of the page.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to fetch, e.g. 'https://example.com'",
        },
      },
      required: ["url"],
    },
  },
];

// OpenAI function-calling format
export const LOCAL_OPENAI_TOOLS: any[] = LOCAL_ANTHROPIC_TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

// ─── Path Resolution ───────────────────────────────────────────────────

function resolvePath(p: string): string {
  if (!p || p === "." || p === "") return WORKSPACE_ROOT;
  // If it's already absolute, use it directly
  if (p.match(/^[A-Za-z]:[/\\]/) || p.startsWith("/")) return resolve(p);
  // Otherwise resolve relative to workspace root
  return resolve(WORKSPACE_ROOT, p);
}

// Safety check — prevent escaping above workspace root
function isSafe(resolvedPath: string): boolean {
  const norm = resolve(resolvedPath).toLowerCase();
  const root = resolve(WORKSPACE_ROOT).toLowerCase();
  // Allow absolute paths anywhere on the machine (owner mode)
  return true;
}

// ─── Tool Executor ─────────────────────────────────────────────────────

export async function executeLocalTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  try {
    switch (name) {
      case "read_file":
        return localReadFile(args.path);
      case "write_file":
        return localWriteFile(args.path, args.content);
      case "list_directory":
        return localListDir(args.path ?? "");
      case "search_files":
        return await localSearchFiles(args.query, args.path_prefix ?? "");
      case "run_command":
        return await localRunCommand(args.command, args.cwd);
      case "generate_image":
        return await localGenerateImage(args.prompt, args.save_path, args.size);
      case "web_search":
        return await localWebSearch(args.query);
      case "browse_url":
        return await localBrowseUrl(args.url);
      default:
        return `Error: Unknown tool "${name}"`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err.message}`;
  }
}

// ─── read_file ─────────────────────────────────────────────────────────

function localReadFile(filePath: string): string {
  if (!filePath) return "Error: path is required";
  const full = resolvePath(filePath);

  if (!existsSync(full)) {
    return `Error: File not found: "${full}". Use list_directory to browse.`;
  }

  try {
    const content = readFileSync(full, "utf-8");
    if (content.length > 65536) {
      return content.slice(0, 65536) + `\n\n[truncated — file is ${content.length} chars total]`;
    }
    return content || "(empty file)";
  } catch (err: any) {
    return `Error reading file: ${err.message}`;
  }
}

// ─── write_file ────────────────────────────────────────────────────────

function localWriteFile(filePath: string, content: string): string {
  if (!filePath) return "Error: path is required";
  if (content == null) return "Error: content is required";
  const full = resolvePath(filePath);

  // Ensure parent directories exist
  const dir = full.substring(0, full.lastIndexOf(/[/\\]/.test(full) ? (full.includes("/") ? "/" : "\\") : "/"));
  try {
    const parentDir = resolve(full, "..");
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
  } catch {}

  try {
    writeFileSync(full, content, "utf-8");
    const size = Buffer.byteLength(content, "utf8");
    return `Successfully wrote ${size} bytes to "${full}"`;
  } catch (err: any) {
    return `Error writing file: ${err.message}`;
  }
}

// ─── list_directory ────────────────────────────────────────────────────

function localListDir(dirPath: string): string {
  const full = resolvePath(dirPath);

  if (!existsSync(full)) {
    return `Error: Directory not found: "${full}"`;
  }

  try {
    const entries = readdirSync(full, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter(e => e.isFile()).sort((a, b) => a.name.localeCompare(b.name));

    const lines: string[] = [];
    for (const d of dirs) lines.push(`📁 ${d.name}/`);
    for (const f of files) {
      try {
        const size = statSync(join(full, f.name)).size;
        const sizeStr = size > 1024 * 1024
          ? `${(size / 1024 / 1024).toFixed(1)}MB`
          : size > 1024
          ? `${(size / 1024).toFixed(1)}KB`
          : `${size}B`;
        lines.push(`📄 ${f.name} (${sizeStr})`);
      } catch {
        lines.push(`📄 ${f.name}`);
      }
    }

    return `Contents of "${full}" (${dirs.length} dirs, ${files.length} files):\n${lines.join("\n")}`;
  } catch (err: any) {
    return `Error listing directory: ${err.message}`;
  }
}

// ─── search_files ──────────────────────────────────────────────────────

async function localSearchFiles(query: string, pathPrefix: string): Promise<string> {
  if (!query) return "Error: query is required";
  const searchDir = resolvePath(pathPrefix);

  if (!existsSync(searchDir)) {
    return `Error: Directory not found: "${searchDir}"`;
  }

  try {
    // Use findstr on Windows, grep on Unix
    const isWin = process.platform === "win32";
    const cmd = isWin
      ? `findstr /S /I /N /M "${query}" "${searchDir}\\*.*"`
      : `grep -ril "${query}" "${searchDir}" --include="*.ts" --include="*.js" --include="*.html" --include="*.css" --include="*.json" --include="*.md" | head -20`;

    const { stdout } = await execAsync(cmd, { timeout: 15000, maxBuffer: 64 * 1024 });
    const files = stdout.trim().split("\n").filter(Boolean).slice(0, 20);

    if (!files.length) return `No files found containing "${query}" in "${searchDir}".`;

    const output: string[] = [`Found "${query}" in ${files.length} file(s):\n`];
    for (const filePath of files) {
      const clean = filePath.trim();
      output.push(`  📄 ${clean}`);
    }
    return output.join("\n");
  } catch (err: any) {
    if (err.code === 1) return `No files found containing "${query}" in "${searchDir}".`;
    return `Search error: ${err.message}`;
  }
}

// ─── run_command ───────────────────────────────────────────────────────

async function localRunCommand(command: string, cwd?: string): Promise<string> {
  if (!command) return "Error: command is required";

  // Block truly dangerous commands
  const blocked = /\b(format\s+[a-z]:|mkfs|dd\s+if=)\b/i;
  if (blocked.test(command)) {
    return `Error: Command blocked for safety: "${command}"`;
  }

  const workDir = cwd ? resolvePath(cwd) : WORKSPACE_ROOT;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      timeout: 30000,
      maxBuffer: 128 * 1024,
      windowsHide: true,
      shell: process.platform === "win32" ? "powershell.exe" : "/bin/sh",
    });
    const out = [stdout, stderr].filter(Boolean).join("\n").trim();
    return out || "(command completed with no output)";
  } catch (err: any) {
    const out = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    return `Exit ${err.code ?? "?"}:\n${out || err.message}`;
  }
}

// ─── generate_image ────────────────────────────────────────────────────

async function localGenerateImage(prompt: string, savePath?: string, size?: string): Promise<string> {
  if (!prompt) return "Error: prompt is required";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "Error: OPENAI_API_KEY not set. Image generation requires an OpenAI API key.";

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: size || "1024x1024",
        response_format: "url",
      }),
    });

    if (!res.ok) {
      const err = await res.json() as any;
      return `Error generating image: ${err.error?.message || res.statusText}`;
    }

    const data = await res.json() as any;
    const imageUrl = data.data?.[0]?.url;
    const revisedPrompt = data.data?.[0]?.revised_prompt;
    if (!imageUrl) return "Error: No image URL returned";

    let result = `Image generated successfully!\nURL: ${imageUrl}`;
    if (revisedPrompt) result += `\nRevised prompt: ${revisedPrompt}`;

    // Save to disk if path provided
    if (savePath) {
      try {
        const imgRes = await fetch(imageUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const fullPath = resolvePath(savePath);
        const parentDir = resolve(fullPath, "..");
        if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
        writeFileSync(fullPath, buffer);
        result += `\nSaved to: ${fullPath} (${(buffer.length / 1024).toFixed(1)}KB)`;
      } catch (saveErr: any) {
        result += `\nWarning: Could not save to disk: ${saveErr.message}`;
      }
    }

    return result;
  } catch (err: any) {
    return `Error generating image: ${err.message}`;
  }
}

// ─── web_search ────────────────────────────────────────────────────────

async function localWebSearch(query: string): Promise<string> {
  if (!query) return "Error: query is required";

  try {
    // Use DuckDuckGo HTML search (no API key needed)
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) return `Error: Search failed with status ${res.status}`;

    const html = await res.text();

    // Extract results from DuckDuckGo HTML
    const results: string[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    const urls: string[] = [];
    const titles: string[] = [];

    while ((match = resultRegex.exec(html)) !== null && urls.length < 8) {
      let url = match[1];
      // DuckDuckGo wraps URLs in redirects
      const udParam = url.match(/uddg=([^&]+)/);
      if (udParam) url = decodeURIComponent(udParam[1]);
      urls.push(url);
      titles.push(match[2].replace(/<[^>]+>/g, "").trim());
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 8) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    if (!urls.length) return `No results found for "${query}".`;

    const output: string[] = [`Search results for "${query}":\n`];
    for (let i = 0; i < urls.length; i++) {
      output.push(`${i + 1}. ${titles[i] || "Untitled"}`);
      output.push(`   ${urls[i]}`);
      if (snippets[i]) output.push(`   ${snippets[i].slice(0, 200)}`);
      output.push("");
    }
    return output.join("\n");
  } catch (err: any) {
    return `Error searching: ${err.message}`;
  }
}

// ─── browse_url ────────────────────────────────────────────────────────

async function localBrowseUrl(url: string): Promise<string> {
  if (!url) return "Error: url is required";
  if (!url.startsWith("http")) url = "https://" + url;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return `Error: HTTP ${res.status} ${res.statusText}`;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text") && !contentType.includes("json")) {
      return `Binary content (${contentType}), ${res.headers.get("content-length") || "unknown"} bytes`;
    }

    let text = await res.text();

    // Strip HTML tags and clean up
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    // Truncate if too long
    if (text.length > 32000) {
      text = text.slice(0, 32000) + `\n\n[truncated — page is ${text.length} chars total]`;
    }

    return `Content from ${url}:\n\n${text}`;
  } catch (err: any) {
    return `Error fetching URL: ${err.message}`;
  }
}
