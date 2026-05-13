/**
 * Axiom Studio — Workspace File System Routes (Database Backed)
 * Server-side proxy for reading/writing workspace files.
 * 
 * SECURITY: All routes require auth.
 * DarkWave Studios LLC — Copyright 2026
 */
import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { workspaceFiles } from "../shared/schema.js";
import { eq, and, like, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import path from "path";

const router = Router();

// Auth middleware - strict JWT validation
async function requireAuth(req: any, res: any, next: any) {
  let token = req.query.token as string;
  const auth = req.headers.authorization;
  if (!token) {
    if (!auth?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing token" });
      return;
    }
    token = auth.split(" ")[1];
  }
  
  // Step 1: Verify JWT
  let decoded: any;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[Workspace Auth] JWT_SECRET is not set!");
      res.status(500).json({ error: "Server misconfiguration: JWT_SECRET missing" });
      return;
    }
    decoded = jwt.verify(token, secret);
  } catch (jwtErr: any) {
    console.warn("[Workspace Auth] JWT verification failed:", jwtErr.message);
    res.status(401).json({ error: `Unauthorized: ${jwtErr.message}` });
    return;
  }

  req.user = decoded;

  // Step 2: Extract user ID
  const uid = decoded.userId || decoded.id;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized: Token missing user identity" });
    return;
  }
  
  // Store the UID on the request
  req.uid = uid;
  
  next();
}

// Sanitize path — prevent directory traversal
function isSafePath(reqPath: string): boolean {
  if (!reqPath) return false;
  // Prevent directory traversal by normalizing posix path
  const normalized = path.posix.normalize(reqPath);
  if (normalized.startsWith("..") || normalized.startsWith("/")) return false;
  return true;
}

function normalizePath(p: string): string {
  if (!p || p === ".") return "";
  return path.posix.normalize(p).replace(/\/$/, "");
}

// Get the isolated project/conversation ID from headers or query
function getConvoId(req: any): string {
  const id = req.headers['x-convo-id'] || req.query.convoId || req.body?.convoId;
  return typeof id === 'string' && id.trim() ? id.trim() : 'default';
}

// Combine convoId and normalized path safely
function getIsolatedPath(req: any, p: string): string {
  const convoId = getConvoId(req);
  const norm = normalizePath(p);
  return norm ? `${convoId}/${norm}` : convoId;
}

// GET /api/workspace/tree — Directory tree
router.get("/tree", requireAuth, async (req: any, res) => {
  try {
    const convoId = getConvoId(req);
    const prefix = `${convoId}/`;
    
    let files = await db.select({
      filePath: workspaceFiles.filePath,
      isDirectory: workspaceFiles.isDirectory,
    }).from(workspaceFiles).where(
      and(
        eq(workspaceFiles.userId, req.uid),
        like(workspaceFiles.filePath, `${prefix}%`)
      )
    );

    // Strip prefix so frontend sees isolated root
    files = files.map(f => ({
      ...f,
      filePath: f.filePath.substring(prefix.length)
    })).filter(f => f.filePath !== ""); // exclude the root dir record itself if any

    // Build tree structure
    const root: any = { name: "workspace", path: ".", type: "directory", children: [] };
    
    // Create a map to easily look up directories
    const dirMap = new Map<string, any>();
    dirMap.set("", root);

    // Sort files to ensure parent dirs come before children (shortest path first)
    files.sort((a, b) => a.filePath.length - b.filePath.length);

    for (const file of files) {
      const parts = file.filePath.split("/");
      const name = parts.pop()!;
      const parentPath = parts.join("/");

      // If parent dir doesn't exist in map yet, we might need to create virtual parents
      let currentParentPath = "";
      let currentParent = root;
      
      for (const part of parts) {
        currentParentPath = currentParentPath ? `${currentParentPath}/${part}` : part;
        if (!dirMap.has(currentParentPath)) {
          const newDir = { name: part, path: currentParentPath, type: "directory", children: [] };
          currentParent.children.push(newDir);
          dirMap.set(currentParentPath, newDir);
        }
        currentParent = dirMap.get(currentParentPath);
      }

      // Add the actual file/dir
      if (file.isDirectory) {
        if (!dirMap.has(file.filePath)) {
          const dirNode = { name, path: file.filePath, type: "directory", children: [] };
          currentParent.children.push(dirNode);
          dirMap.set(file.filePath, dirNode);
        }
      } else {
        currentParent.children.push({ name, path: file.filePath, type: "file" });
      }
    }

    // Sort children
    const sortChildren = (node: any) => {
      node.children.sort((a: any, b: any) => {
        if (a.type === "directory" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
      for (const child of node.children) {
        if (child.type === "directory") {
          sortChildren(child);
        }
      }
    };
    sortChildren(root);

    res.json(root);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/file?path=... — Read file
router.get("/file", requireAuth, async (req: any, res) => {
  const rawPath = req.query.path as string;
  if (!isSafePath(normalizePath(rawPath))) { res.status(400).json({ error: "Invalid path" }); return; }
  
  const isolatedPath = getIsolatedPath(req, rawPath);
  
  try {
    const records = await db.select()
      .from(workspaceFiles)
      .where(and(
        eq(workspaceFiles.userId, req.uid),
        eq(workspaceFiles.filePath, isolatedPath)
      ))
      .limit(1);

    if (records.length === 0) {
      res.status(404).json({ error: `File not found: ${rawPath}` });
      return;
    }

    res.json({ content: records[0].content, path: rawPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workspace/file — Write file
router.put("/file", requireAuth, async (req: any, res) => {
  const rawPath = req.body.path;
  const content = req.body.content || "";
  if (!isSafePath(normalizePath(rawPath)) || normalizePath(rawPath) === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  const isolatedPath = getIsolatedPath(req, rawPath);
  
  try {
    // Upsert the file
    await db.insert(workspaceFiles)
      .values({
        userId: req.uid,
        filePath: isolatedPath,
        content: content,
        isDirectory: false,
        sizeBytes: Buffer.byteLength(content, 'utf8')
      })
      .onConflictDoUpdate({
        target: [workspaceFiles.userId, workspaceFiles.filePath],
        set: { 
          content: content,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
          updatedAt: sql`NOW()`
        }
      });

    // Also optionally ensure parent directories exist
    const parentParts = isolatedPath.split("/");
    parentParts.pop(); // Remove file name
    let currentPath = "";
    
    for (const part of parentParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      await db.insert(workspaceFiles)
        .values({
          userId: req.uid,
          filePath: currentPath,
          isDirectory: true
        })
        .onConflictDoNothing();
    }

    res.json({ success: true, path: rawPath });
  } catch (err: any) {
    console.error("[Workspace PUT error]", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/mkdir — Create directory
router.post("/mkdir", requireAuth, async (req: any, res) => {
  const rawPath = req.body.path;
  if (!isSafePath(normalizePath(rawPath)) || normalizePath(rawPath) === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  const isolatedPath = getIsolatedPath(req, rawPath);

  try {
    await db.insert(workspaceFiles)
      .values({
        userId: req.uid,
        filePath: isolatedPath,
        isDirectory: true
      })
      .onConflictDoNothing();
      
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspace/file — Delete file or directory
router.delete("/file", requireAuth, async (req: any, res) => {
  const rawPath = req.query.path as string;
  if (!isSafePath(normalizePath(rawPath)) || normalizePath(rawPath) === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  const isolatedPath = getIsolatedPath(req, rawPath);
  
  try {
    // Delete the file itself and any nested children if it's a directory
    const pattern = `${isolatedPath}/%`;
    await db.execute(
      sql`DELETE FROM workspace_files WHERE user_id = ${req.uid} AND (file_path = ${isolatedPath} OR file_path LIKE ${pattern})`
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/serve/* — Serve raw file content for iframe previews
router.get("/serve/*filepath", requireAuth, async (req: any, res: any) => {
  const rawPath = req.params.filepath || "index.html";
  if (!isSafePath(normalizePath(rawPath)) || normalizePath(rawPath) === "") {
    res.status(400).send("Invalid path");
    return;
  }
  
  const isolatedPath = getIsolatedPath(req, rawPath);
  
  try {
    const records = await db.select()
      .from(workspaceFiles)
      .where(and(
        eq(workspaceFiles.userId, req.uid),
        eq(workspaceFiles.filePath, isolatedPath)
      ))
      .limit(1);

    if (records.length === 0) {
      res.status(404).send(`File not found: ${rawPath}`);
      return;
    }

    const content = records[0].content || "";
    
    // Determine content type
    let contentType = "text/plain";
    if (rawPath.endsWith(".html")) contentType = "text/html";
    else if (rawPath.endsWith(".css")) contentType = "text/css";
    else if (rawPath.endsWith(".js") || rawPath.endsWith(".mjs")) contentType = "application/javascript";
    else if (rawPath.endsWith(".json")) contentType = "application/json";
    else if (rawPath.endsWith(".svg")) contentType = "image/svg+xml";

    res.setHeader("Content-Type", contentType);
    res.send(content);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

export default router;
