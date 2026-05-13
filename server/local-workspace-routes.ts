/**
 * Axiom Studio — Local Workspace Routes
 * Real filesystem-backed workspace for local mode.
 * No database, no abstraction — direct disk access.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { Router } from "express";
import {
  readFileSync, writeFileSync, readdirSync, statSync,
  existsSync, mkdirSync, rmSync,
} from "fs";
import { join, resolve, relative } from "path";
import { getWorkspaceRoot } from "./local-tools.js";

const router = Router();

// No auth needed in local mode — you ARE the owner

function resolvePath(req: any, p: string): string {
  const root = getWorkspaceRoot(req.headers['x-convo-id'] || req.query.convoId || req.body?.convoId);
  if (!p || p === "." || p === "") return root;
  if (p.match(/^[A-Za-z]:[/\\]/) || p.startsWith("/")) return resolve(p);
  return resolve(root, p);
}

// GET /api/workspace/tree — Directory tree from real filesystem
router.get("/tree", (req: any, res) => {
  const rootPath = (req.query.path as string) || getWorkspaceRoot(req.headers['x-convo-id'] || req.query.convoId || req.body?.convoId);
  const resolvedRoot = resolvePath(req, rootPath);

  try {
    const root: any = { name: resolvedRoot.split(/[/\\]/).pop() || "workspace", path: ".", type: "directory", children: [] };

    function walkDir(dir: string, node: any, depth: number = 0) {
      if (depth > 3) return; // Limit depth for performance
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        const skip = new Set([".git", "node_modules", "dist", ".next", "__pycache__", ".venv", "build", ".cache"]);

        for (const entry of entries) {
          if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
          if (skip.has(entry.name)) continue;

          const fullPath = join(dir, entry.name);
          const relPath = relative(resolvedRoot, fullPath).replace(/\\\\/g, "/");

          if (entry.isDirectory()) {
            const dirNode: any = { name: entry.name, path: relPath, type: "directory", children: [] };
            node.children.push(dirNode);
            walkDir(fullPath, dirNode, depth + 1);
          } else if (entry.isFile()) {
            node.children.push({ name: entry.name, path: relPath, type: "file" });
          }
        }

        // Sort: dirs first, then files
        node.children.sort((a: any, b: any) => {
          if (a.type === "directory" && b.type === "file") return -1;
          if (a.type === "file" && b.type === "directory") return 1;
          return a.name.localeCompare(b.name);
        });
      } catch {
        // Permission errors, etc.
      }
    }

    walkDir(resolvedRoot, root);
    res.json(root);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/file?path=... — Read file from disk
router.get("/file", (req: any, res) => {
  const reqPath = req.query.path as string;
  if (!reqPath) { res.status(400).json({ error: "path required" }); return; }

  const full = resolvePath(req, reqPath);
  if (!existsSync(full)) { res.status(404).json({ error: `File not found: ${reqPath}` }); return; }

  try {
    const content = readFileSync(full, "utf-8");
    res.json({ content, path: reqPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workspace/file — Write file to disk
router.put("/file", (req: any, res) => {
  const reqPath = req.body.path;
  const content = req.body.content ?? "";
  if (!reqPath) { res.status(400).json({ error: "path required" }); return; }

  const full = resolvePath(req, reqPath);

  try {
    const parentDir = resolve(full, "..");
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
    writeFileSync(full, content, "utf-8");
    res.json({ success: true, path: reqPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/mkdir — Create directory
router.post("/mkdir", (req: any, res) => {
  const dirPath = req.body.path;
  if (!dirPath) { res.status(400).json({ error: "path required" }); return; }

  const full = resolvePath(req, dirPath);

  try {
    if (!existsSync(full)) mkdirSync(full, { recursive: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspace/file — Delete file or directory
router.delete("/file", (req: any, res) => {
  const reqPath = req.query.path as string;
  if (!reqPath) { res.status(400).json({ error: "path required" }); return; }

  const full = resolvePath(req, reqPath);

  try {
    if (existsSync(full)) {
      rmSync(full, { recursive: true, force: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/serve/* — Serve raw file content for iframe previews
router.get("/serve/*filepath", (req: any, res: any) => {
  const rawPath = req.params.filepath || "index.html";
  const full = resolvePath(req, rawPath);
  
  if (!existsSync(full)) {
    res.status(404).send(`File not found: ${rawPath}`);
    return;
  }

  try {
    const content = readFileSync(full, "utf-8");
    
    // Determine content type
    let contentType = "text/plain";
    if (full.endsWith(".html")) contentType = "text/html";
    else if (full.endsWith(".css")) contentType = "text/css";
    else if (full.endsWith(".js") || full.endsWith(".mjs")) contentType = "application/javascript";
    else if (full.endsWith(".json")) contentType = "application/json";
    else if (full.endsWith(".svg")) contentType = "image/svg+xml";

    res.setHeader("Content-Type", contentType);
    res.send(content);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

export default router;
