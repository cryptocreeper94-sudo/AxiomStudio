/**
 * Axiom Studio — Workspace File System Routes
 * Server-side proxy for reading/writing workspace files.
 * 
 * SECURITY: All routes require auth. File paths sandboxed to BASE_WORKSPACES_DIR / userId.
 * DarkWave Studios LLC — Copyright 2026
 */
import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import jwt from "jsonwebtoken";

const execAsync = promisify(exec);
const router = Router();

// Base directory for all workspaces
const BASE_WORKSPACES_DIR = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), "workspaces");
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  console.error("[Workspace] FATAL: JWT_SECRET env var is not set. All workspace requests will fail.");
}

// Ensure base workspaces directory exists
fs.mkdir(BASE_WORKSPACES_DIR, { recursive: true })
  .then(() => console.log(`[Workspace] Multi-Tenant Root: ${BASE_WORKSPACES_DIR}`))
  .catch((e) => console.warn(`[Workspace] Could not create root dir: ${e.message}`));

// Auth middleware - strict JWT validation
async function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }
  
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded; // { userId, username, ... }

    // Support both "userId" (current login payload) and legacy "id"
    const uid = decoded.userId || decoded.id;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: Token missing user identity" });
      return;
    }

    // Provision user workspace dynamically
    req.userWorkspace = path.join(BASE_WORKSPACES_DIR, uid);
    await fs.mkdir(req.userWorkspace, { recursive: true });
    
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

// Sanitize path — prevent directory traversal outside user's isolated workspace
function safePath(userWorkspace: string, reqPath: string): string | null {
  const resolved = path.resolve(userWorkspace, reqPath || ".");
  if (!resolved.startsWith(userWorkspace)) return null;
  return resolved;
}

// GET /api/workspace/tree — Directory tree
router.get("/tree", requireAuth, async (req: any, res) => {
  try {
    const tree = await buildTree(req.userWorkspace, req.userWorkspace, "workspace");
    res.json(tree);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function buildTree(userWorkspace: string, dirPath: string, name: string, depth = 0): Promise<any> {
  if (depth > 6) return { name, path: path.relative(userWorkspace, dirPath).replace(/\\/g, "/"), type: "directory", children: [] };
  
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const children = [];
  
  // Sort: directories first, then files, alphabetical
  const sorted = entries
    .filter(e => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "dist" && e.name !== ".git")
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(userWorkspace, fullPath).replace(/\\/g, "/");
    
    if (entry.isDirectory()) {
      children.push(await buildTree(userWorkspace, fullPath, entry.name, depth + 1));
    } else {
      children.push({ name: entry.name, path: relPath, type: "file" });
    }
  }

  return {
    name,
    path: path.relative(userWorkspace, dirPath).replace(/\\/g, "/") || ".",
    type: "directory",
    children,
  };
}

// GET /api/workspace/file?path=... — Read file
router.get("/file", requireAuth, async (req: any, res) => {
  const filePath = safePath(req.userWorkspace, req.query.path as string);
  if (!filePath) { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    const content = await fs.readFile(filePath, "utf-8");
    res.json({ content, path: req.query.path });
  } catch (err: any) {
    res.status(404).json({ error: `File not found: ${req.query.path}` });
  }
});

// PUT /api/workspace/file — Write file
router.put("/file", requireAuth, async (req: any, res) => {
  const { path: reqPath, content } = req.body;
  const filePath = safePath(req.userWorkspace, reqPath);
  if (!filePath) { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    res.json({ success: true, path: reqPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/mkdir — Create directory
router.post("/mkdir", requireAuth, async (req: any, res) => {
  const dirPath = safePath(req.userWorkspace, req.body.path);
  if (!dirPath) { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    await fs.mkdir(dirPath, { recursive: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspace/file — Delete file or directory
router.delete("/file", requireAuth, async (req: any, res) => {
  const filePath = safePath(req.userWorkspace, req.query.path as string);
  if (!filePath) { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  export default router;
