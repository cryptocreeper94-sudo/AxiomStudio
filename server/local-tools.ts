/**
 * Axiom Studio — Local Mode Agent Tools
 * Real filesystem operations instead of DB-backed workspace_files.
 * Direct read/write to disk. Native git. No abstraction layer.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import {
  readFileSync, writeFileSync, readdirSync, statSync,
  existsSync, mkdirSync, unlinkSync, rmSync,
} from "fs";
import { join, relative, resolve, extname } from "path";

const execAsync = promisify(exec);

import { homedir } from "os";

// Workspace root base — set via WORKSPACE_ROOT env or defaults to ~/.axiom-studio/projects
const WORKSPACE_BASE = process.env.WORKSPACE_ROOT || join(homedir(), ".axiom-studio", "projects");

export function getWorkspaceRoot(convoId?: string): string {
  const safeId = typeof convoId === 'string' && convoId.trim() ? convoId.trim().replace(/[^a-zA-Z0-9_-]/g, '') : 'default';
  const projectRoot = join(WORKSPACE_BASE, safeId);
  if (!existsSync(projectRoot)) {
    mkdirSync(projectRoot, { recursive: true });
  }
  return projectRoot;
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
  {
    name: "browser_action",
    description:
      "Control a headless browser. Navigate to URLs, click elements, type text, take screenshots, and read page content. The browser persists between calls.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["navigate", "click", "type", "screenshot", "read_page", "close"],
          description: "The browser action to perform",
        },
        url: {
          type: "string",
          description: "URL to navigate to (for 'navigate' action)",
        },
        selector: {
          type: "string",
          description: "CSS selector for the element to interact with (for 'click' and 'type' actions)",
        },
        text: {
          type: "string",
          description: "Text to type into the element (for 'type' action)",
        },
        save_path: {
          type: "string",
          description: "File path to save screenshot (for 'screenshot' action). Defaults to workspace/screenshot.png",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "edit_file",
    description:
      "Make a surgical edit to a file by replacing specific target content with new content. Much more efficient than write_file for small changes — avoids rewriting the entire file. Searches for the exact targetContent string within the specified line range and replaces it.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path — relative to workspace root or absolute",
        },
        target_content: {
          type: "string",
          description: "The EXACT string to find and replace. Must match the file content precisely, including whitespace and indentation.",
        },
        replacement_content: {
          type: "string",
          description: "The new content to replace the target with.",
        },
        start_line: {
          type: "number",
          description: "Optional: narrow the search to lines starting at this 1-based line number.",
        },
        end_line: {
          type: "number",
          description: "Optional: narrow the search to lines ending at this 1-based line number.",
        },
      },
      required: ["path", "target_content", "replacement_content"],
    },
  },
  {
    name: "view_file",
    description:
      "View the contents of a file with optional line range. More efficient than read_file for large files — read only the lines you need. Returns line numbers with each line.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path — relative to workspace root or absolute",
        },
        start_line: {
          type: "number",
          description: "Optional: first line to show (1-based). Defaults to 1.",
        },
        end_line: {
          type: "number",
          description: "Optional: last line to show (1-based, inclusive). Defaults to end of file. Max 500 lines per call.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "grep_search",
    description:
      "Search for a pattern across files using regex or literal text. Returns matching file paths with line numbers and content snippets. Much more powerful than search_files — supports regex, glob filters, and line-level results.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search pattern — text string or regex pattern",
        },
        search_path: {
          type: "string",
          description: "Directory or file to search in. Relative to workspace root or absolute.",
        },
        is_regex: {
          type: "boolean",
          description: "If true, treats query as a regex pattern. Default false (literal text).",
        },
        case_insensitive: {
          type: "boolean",
          description: "If true, performs case-insensitive search. Default false.",
        },
        includes: {
          type: "string",
          description: "Optional glob pattern to filter files, e.g. '*.ts' or '*.tsx'. Multiple patterns separated by commas.",
        },
      },
      required: ["query", "search_path"],
    },
  },
  {
    name: "start_background",
    description:
      "Start a long-running command as a background task. Returns a task ID you can use to check status, send input, or kill the process. Use for dev servers, builds, daemons, or any process that takes more than 30 seconds.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to run in the background, e.g. 'npm run dev', 'node server.js'",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command. Defaults to workspace root.",
        },
        label: {
          type: "string",
          description: "A human-readable label for this task, e.g. 'Dev Server', 'Build Process'",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "task_status",
    description:
      "Check the status of a background task. Returns whether it's running, its recent output, and any exit code.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID returned by start_background",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "send_input",
    description:
      "Send input (stdin) to a running background task. Use for interactive processes that need user input.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID of the background process",
        },
        input: {
          type: "string",
          description: "The text to send to the process stdin. A newline is automatically appended.",
        },
      },
      required: ["task_id", "input"],
    },
  },
  {
    name: "kill_task",
    description:
      "Kill a running background task. Use to stop dev servers, cancel builds, or terminate any background process.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID to kill",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_tasks",
    description:
      "List all currently running background tasks with their IDs, labels, and status.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
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

function resolvePath(p: string, convoId?: string): string {
  const root = getWorkspaceRoot(convoId);
  if (!p || p === "." || p === "") return root;
  // If it's already absolute, use it directly
  if (p.match(/^[A-Za-z]:[/\\]/) || p.startsWith("/")) return resolve(p);
  // Otherwise resolve relative to workspace root
  return resolve(root, p);
}

// Safety check — prevent escaping above workspace root
function isSafe(resolvedPath: string, convoId?: string): boolean {
  const norm = resolve(resolvedPath).toLowerCase();
  const root = resolve(getWorkspaceRoot(convoId)).toLowerCase();
  // Allow absolute paths anywhere on the machine (owner mode)
  return true;
}

// ─── Tool Executor ─────────────────────────────────────────────────────

export async function executeLocalTool(
  name: string,
  args: Record<string, any>,
  convoId?: string
): Promise<string> {
  try {
    switch (name) {
      case "read_file":
        return localReadFile(args.path, convoId);
      case "write_file":
        return localWriteFile(args.path, args.content, convoId);
      case "edit_file":
        return localEditFile(args.path, args.target_content, args.replacement_content, args.start_line, args.end_line, convoId);
      case "view_file":
        return localViewFile(args.path, args.start_line, args.end_line, convoId);
      case "list_directory":
        return localListDir(args.path ?? "", convoId);
      case "search_files":
        return await localSearchFiles(args.query, args.path_prefix ?? "", convoId);
      case "grep_search":
        return await localGrepSearch(args.query, args.search_path, args.is_regex, args.case_insensitive, args.includes, convoId);
      case "run_command":
        return await localRunCommand(args.command, args.cwd, convoId);
      case "generate_image":
        return await localGenerateImage(args.prompt, args.save_path, args.size, convoId);
      case "web_search":
        return await localWebSearch(args.query);
      case "browse_url":
        return await localBrowseUrl(args.url);
      case "browser_action":
        return await localBrowserAction(args.action, args, convoId);
      case "start_background":
        return localStartBackground(args.command, args.cwd, args.label, convoId);
      case "task_status":
        return localTaskStatus(args.task_id);
      case "send_input":
        return localSendInput(args.task_id, args.input);
      case "kill_task":
        return localKillTask(args.task_id);
      case "list_tasks":
        return localListTasks();
      default:
        return `Error: Unknown tool "${name}"`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err.message}`;
  }
}

// ─── read_file ─────────────────────────────────────────────────────────

function localReadFile(filePath: string, convoId?: string): string {
  if (!filePath) return "Error: path is required";
  const full = resolvePath(filePath, convoId);

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

function localWriteFile(filePath: string, content: string, convoId?: string): string {
  if (!filePath) return "Error: path is required";
  if (content == null) return "Error: content is required";
  const full = resolvePath(filePath, convoId);

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

function localListDir(dirPath: string, convoId?: string): string {
  const full = resolvePath(dirPath, convoId);

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

async function localSearchFiles(query: string, pathPrefix: string, convoId?: string): Promise<string> {
  if (!query) return "Error: query is required";
  const searchDir = resolvePath(pathPrefix, convoId);

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

async function localRunCommand(command: string, cwd?: string, convoId?: string): Promise<string> {
  if (!command) return "Error: command is required";

  // Block truly dangerous commands
  const blocked = /\b(format\s+[a-z]:|mkfs|dd\s+if=)\b/i;
  if (blocked.test(command)) {
    return `Error: Command blocked for safety: "${command}"`;
  }

  const workDir = cwd ? resolvePath(cwd, convoId) : getWorkspaceRoot(convoId);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      timeout: 120000,
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

async function localGenerateImage(prompt: string, savePath?: string, size?: string, convoId?: string): Promise<string> {
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
        const fullPath = resolvePath(savePath, convoId);
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

// ─── browser_action ────────────────────────────────────────────────────

let browserInstance: any = null;
let browserPage: any = null;

async function getBrowser() {
  if (browserInstance && browserPage) return { browser: browserInstance, page: browserPage };
  // @ts-ignore
  const puppeteer = await import("puppeteer");
  browserInstance = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  browserPage = await browserInstance.newPage();
  await browserPage.setViewport({ width: 1280, height: 720 });
  return { browser: browserInstance, page: browserPage };
}

async function localBrowserAction(action: string, args: Record<string, any>, convoId?: string): Promise<string> {
  if (!action) return "Error: action is required";

  try {
    if (action === "close") {
      if (browserInstance) { await browserInstance.close(); browserInstance = null; browserPage = null; }
      return "Browser closed.";
    }

    const { page } = await getBrowser();

    switch (action) {
      case "navigate": {
        if (!args.url) return "Error: url is required for navigate";
        const url = args.url.startsWith("http") ? args.url : "https://" + args.url;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const title = await page.title();
        return `Navigated to ${url}\nTitle: ${title}`;
      }
      case "click": {
        if (!args.selector) return "Error: selector is required for click";
        await page.waitForSelector(args.selector, { timeout: 5000 });
        await page.click(args.selector);
        return `Clicked element: ${args.selector}`;
      }
      case "type": {
        if (!args.selector) return "Error: selector is required for type";
        if (!args.text) return "Error: text is required for type";
        await page.waitForSelector(args.selector, { timeout: 5000 });
        await page.type(args.selector, args.text);
        return `Typed "${args.text}" into ${args.selector}`;
      }
      case "screenshot": {
        const savePath = args.save_path || "screenshot.png";
        const fullPath = resolvePath(savePath, convoId);
        const parentDir = resolve(fullPath, "..");
        if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
        await page.screenshot({ path: fullPath, fullPage: false });
        const size = statSync(fullPath).size;
        return `Screenshot saved to ${fullPath} (${(size / 1024).toFixed(1)}KB)`;
      }
      case "read_page": {
        const content = await page.evaluate(() => document.body?.innerText || "");
        const title = await page.title();
        const url = page.url();
        const truncated = content.length > 16000 ? content.slice(0, 16000) + "\n[truncated]" : content;
        return `Page: ${title}\nURL: ${url}\n\n${truncated}`;
      }
      default:
        return `Error: Unknown action "${action}". Use: navigate, click, type, screenshot, read_page, close`;
    }
  } catch (err: any) {
    return `Browser error: ${err.message}`;
  }
}

// ─── edit_file (surgical edits) ────────────────────────────────────────

function localEditFile(
  filePath: string,
  targetContent: string,
  replacementContent: string,
  startLine?: number,
  endLine?: number,
  convoId?: string
): string {
  if (!filePath) return "Error: path is required";
  if (targetContent == null) return "Error: target_content is required";
  if (replacementContent == null) return "Error: replacement_content is required";

  const full = resolvePath(filePath, convoId);
  if (!existsSync(full)) {
    return `Error: File not found: "${full}"`;
  }

  try {
    const content = readFileSync(full, "utf-8");
    
    // If line range specified, validate target is within range
    if (startLine || endLine) {
      const lines = content.split("\n");
      const start = Math.max(1, startLine || 1);
      const end = Math.min(lines.length, endLine || lines.length);
      const rangeContent = lines.slice(start - 1, end).join("\n");
      
      if (!rangeContent.includes(targetContent)) {
        // Try the full file as fallback
        if (!content.includes(targetContent)) {
          return `Error: target_content not found in file. Make sure it matches EXACTLY, including whitespace.\n\nSearched in lines ${start}-${end}. First 200 chars of that range:\n${rangeContent.slice(0, 200)}`;
        }
      }
    }

    // Count occurrences
    const occurrences = content.split(targetContent).length - 1;
    if (occurrences === 0) {
      return `Error: target_content not found in "${full}". Make sure it matches the file content EXACTLY, including whitespace and indentation.`;
    }
    if (occurrences > 1) {
      return `Error: target_content found ${occurrences} times in file. It must be unique. Use start_line/end_line to narrow the search, or include more surrounding context in target_content.`;
    }

    // Perform the replacement
    const newContent = content.replace(targetContent, replacementContent);
    writeFileSync(full, newContent, "utf-8");

    // Compute diff stats
    const oldLines = targetContent.split("\n").length;
    const newLines = replacementContent.split("\n").length;
    const added = Math.max(0, newLines - oldLines);
    const removed = Math.max(0, oldLines - newLines);
    
    return `Successfully edited "${full}" — replaced ${oldLines} line(s) with ${newLines} line(s) (+${added} -${removed})`;
  } catch (err: any) {
    return `Error editing file: ${err.message}`;
  }
}

// ─── view_file (line-range reading) ────────────────────────────────────

function localViewFile(
  filePath: string,
  startLine?: number,
  endLine?: number,
  convoId?: string
): string {
  if (!filePath) return "Error: path is required";
  const full = resolvePath(filePath, convoId);

  if (!existsSync(full)) {
    return `Error: File not found: "${full}"`;
  }

  try {
    const stat = statSync(full);
    if (stat.isDirectory()) {
      return `Error: "${full}" is a directory, not a file. Use list_directory instead.`;
    }

    const content = readFileSync(full, "utf-8");
    const allLines = content.split("\n");
    const totalLines = allLines.length;
    const totalBytes = stat.size;

    // Resolve line range
    let start = Math.max(1, startLine || 1);
    let end = Math.min(totalLines, endLine || totalLines);
    
    // Cap at 500 lines per request
    if (end - start + 1 > 500) {
      end = start + 499;
    }

    const selectedLines = allLines.slice(start - 1, end);
    const numberedLines = selectedLines.map((line, i) => `${start + i}: ${line}`).join("\n");

    const header = `File: ${full}\nTotal Lines: ${totalLines} | Total Bytes: ${totalBytes}\nShowing lines ${start} to ${end}:\n`;
    
    return header + numberedLines;
  } catch (err: any) {
    return `Error viewing file: ${err.message}`;
  }
}

// ─── grep_search (regex-powered search) ────────────────────────────────

async function localGrepSearch(
  query: string,
  searchPath: string,
  isRegex?: boolean,
  caseInsensitive?: boolean,
  includes?: string,
  convoId?: string
): Promise<string> {
  if (!query) return "Error: query is required";
  if (!searchPath) return "Error: search_path is required";

  const full = resolvePath(searchPath, convoId);
  if (!existsSync(full)) {
    return `Error: Path not found: "${full}"`;
  }

  try {
    // Try ripgrep first (fastest), fall back to PowerShell
    const isWin = process.platform === "win32";
    let cmd: string;

    // Build include args
    let includeArgs = "";
    if (includes) {
      const patterns = includes.split(",").map(p => p.trim()).filter(Boolean);
      includeArgs = patterns.map(p => `--include "${p}"`).join(" ");
    }

    // Escape query for shell
    const escapedQuery = query.replace(/"/g, '\\"');
    const flags = [
      caseInsensitive ? "-i" : "",
      isRegex ? "" : "-F",  // -F = fixed/literal string
      "-n",  // line numbers
      "--max-count=50",
      "--no-heading",
    ].filter(Boolean).join(" ");

    // Try ripgrep
    cmd = `rg ${flags} ${includeArgs} "${escapedQuery}" "${full}"`;

    try {
      const { stdout } = await execAsync(cmd, { timeout: 15000, maxBuffer: 256 * 1024 });
      return formatGrepResults(query, stdout, full);
    } catch (rgErr: any) {
      // ripgrep not found or returned no results (exit code 1)
      if (rgErr.code === 1) return `No matches found for "${query}" in "${full}".`;
      
      // Fall back to PowerShell/findstr
      if (isWin) {
        const psQuery = isRegex ? escapedQuery : escapedQuery.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        const psFlags = caseInsensitive ? "-CaseSensitive:$false" : "";
        
        let includeFilter = "";
        if (includes) {
          const patterns = includes.split(",").map(p => p.trim()).filter(Boolean);
          includeFilter = patterns.map(p => `-Include "${p}"`).join(",");
        }

        cmd = `Get-ChildItem -Path "${full}" -Recurse -File ${includeFilter} -ErrorAction SilentlyContinue | Select-Object -First 200 | Select-String -Pattern "${psQuery}" ${psFlags} -List | Select-Object -First 50 | ForEach-Object { "$($_.Path):$($_.LineNumber):$($_.Line)" }`;
        
        const { stdout } = await execAsync(`powershell -NoProfile -Command "${cmd.replace(/"/g, '\\"')}"`, { 
          timeout: 15000, maxBuffer: 256 * 1024 
        });
        return formatGrepResults(query, stdout, full);
      }
      
      // Unix fallback
      const grepFlags = [caseInsensitive ? "-i" : "", isRegex ? "-E" : "-F", "-rn"].filter(Boolean).join(" ");
      cmd = `grep ${grepFlags} "${escapedQuery}" "${full}" | head -50`;
      const { stdout } = await execAsync(cmd, { timeout: 15000, maxBuffer: 256 * 1024 });
      return formatGrepResults(query, stdout, full);
    }
  } catch (err: any) {
    if (err.code === 1 || err.stdout === "") return `No matches found for "${query}" in "${full}".`;
    return `Search error: ${err.message}`;
  }
}

function formatGrepResults(query: string, stdout: string, basePath: string): string {
  const lines = stdout.trim().split("\n").filter(Boolean);
  if (!lines.length) return `No matches found for "${query}" in "${basePath}".`;

  const results: string[] = [`Found "${query}" in ${lines.length} match(es):\n`];
  
  for (const line of lines.slice(0, 50)) {
    // Format: filepath:linenum:content
    const match = line.match(/^(.+?):(\d+):(.*)$/);
    if (match) {
      const [, filePath, lineNum, content] = match;
      // Make path relative if possible
      const rel = filePath.startsWith(basePath) ? filePath.slice(basePath.length + 1) : filePath;
      results.push(`  ${rel}:${lineNum}: ${content.trim().slice(0, 150)}`);
    } else {
      results.push(`  ${line.slice(0, 180)}`);
    }
  }

  if (lines.length >= 50) {
    results.push(`\n  (results capped at 50 matches)`);
  }

  return results.join("\n");
}

// ─── Background Process Manager ────────────────────────────────────────

interface BackgroundTask {
  id: string;
  label: string;
  command: string;
  cwd: string;
  process: ChildProcess;
  output: string[];
  status: "running" | "exited";
  exitCode: number | null;
  startedAt: Date;
}

const backgroundTasks: Map<string, BackgroundTask> = new Map();
let taskCounter = 0;

function localStartBackground(
  command: string,
  cwd?: string,
  label?: string,
  convoId?: string
): string {
  if (!command) return "Error: command is required";

  const workDir = cwd ? resolvePath(cwd, convoId) : getWorkspaceRoot(convoId);
  const taskId = `task-${++taskCounter}`;
  const isWin = process.platform === "win32";

  const proc = spawn(command, [], {
    cwd: workDir,
    shell: isWin ? "powershell.exe" : "/bin/sh",
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  const task: BackgroundTask = {
    id: taskId,
    label: label || command.slice(0, 40),
    command,
    cwd: workDir,
    process: proc,
    output: [],
    status: "running",
    exitCode: null,
    startedAt: new Date(),
  };

  // Capture output (keep last 200 lines)
  const appendOutput = (data: Buffer) => {
    const lines = data.toString().split("\n");
    task.output.push(...lines);
    if (task.output.length > 200) {
      task.output = task.output.slice(-200);
    }
  };

  proc.stdout?.on("data", appendOutput);
  proc.stderr?.on("data", appendOutput);
  proc.on("exit", (code) => {
    task.status = "exited";
    task.exitCode = code;
    task.output.push(`\n[Process exited with code ${code}]`);
  });
  proc.on("error", (err) => {
    task.status = "exited";
    task.exitCode = -1;
    task.output.push(`\n[Process error: ${err.message}]`);
  });

  backgroundTasks.set(taskId, task);
  console.log(`[Background] Started ${taskId}: ${command} in ${workDir}`);

  return `Background task started.\n  Task ID: ${taskId}\n  Label: ${task.label}\n  Command: ${command}\n  Working Dir: ${workDir}\n\nUse task_status("${taskId}") to check output, send_input("${taskId}", "text") to send stdin, or kill_task("${taskId}") to stop it.`;
}

function localTaskStatus(taskId: string): string {
  if (!taskId) return "Error: task_id is required";
  const task = backgroundTasks.get(taskId);
  if (!task) return `Error: Task "${taskId}" not found. Use list_tasks to see active tasks.`;

  const uptime = Math.round((Date.now() - task.startedAt.getTime()) / 1000);
  const recentOutput = task.output.slice(-30).join("\n");

  return `Task: ${taskId} (${task.label})\nStatus: ${task.status}${task.exitCode !== null ? ` (exit code: ${task.exitCode})` : ""}\nCommand: ${task.command}\nUptime: ${uptime}s\nCwd: ${task.cwd}\n\nRecent output (last 30 lines):\n${recentOutput || "(no output yet)"}`;
}

function localSendInput(taskId: string, input: string): string {
  if (!taskId) return "Error: task_id is required";
  if (input == null) return "Error: input is required";
  
  const task = backgroundTasks.get(taskId);
  if (!task) return `Error: Task "${taskId}" not found.`;
  if (task.status !== "running") return `Error: Task "${taskId}" is not running (status: ${task.status}).`;
  
  try {
    task.process.stdin?.write(input + "\n");
    return `Sent input to ${taskId}: "${input}"`;
  } catch (err: any) {
    return `Error sending input: ${err.message}`;
  }
}

function localKillTask(taskId: string): string {
  if (!taskId) return "Error: task_id is required";
  
  const task = backgroundTasks.get(taskId);
  if (!task) return `Error: Task "${taskId}" not found.`;
  if (task.status !== "running") return `Task "${taskId}" already exited (code: ${task.exitCode}).`;
  
  try {
    task.process.kill("SIGTERM");
    // Force kill after 5s
    setTimeout(() => {
      try { if (task.status === "running") task.process.kill("SIGKILL"); } catch {}
    }, 5000);
    return `Task "${taskId}" (${task.label}) killed.`;
  } catch (err: any) {
    return `Error killing task: ${err.message}`;
  }
}

function localListTasks(): string {
  if (backgroundTasks.size === 0) return "No background tasks running.";

  const lines: string[] = [`Background tasks (${backgroundTasks.size}):\n`];
  for (const [id, task] of backgroundTasks) {
    const uptime = Math.round((Date.now() - task.startedAt.getTime()) / 1000);
    const status = task.status === "running" 
      ? `● RUNNING (${uptime}s)` 
      : `○ EXITED (code ${task.exitCode})`;
    lines.push(`  ${id}: ${task.label} — ${status}`);
    lines.push(`    cmd: ${task.command}`);
  }
  return lines.join("\n");
}
