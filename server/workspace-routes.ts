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

// GET /api/workspace/tree — Directory tree
router.get("/tree", requireAuth, async (req: any, res) => {
  try {
    const files = await db.select({
      filePath: workspaceFiles.filePath,
      isDirectory: workspaceFiles.isDirectory,
    }).from(workspaceFiles).where(eq(workspaceFiles.userId, req.uid));

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
  const reqPath = normalizePath(req.query.path as string);
  if (!isSafePath(reqPath) || reqPath === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    const records = await db.select()
      .from(workspaceFiles)
      .where(and(
        eq(workspaceFiles.userId, req.uid),
        eq(workspaceFiles.filePath, reqPath)
      ))
      .limit(1);

    if (records.length === 0) {
      res.status(404).json({ error: `File not found: ${reqPath}` });
      return;
    }

    res.json({ content: records[0].content, path: reqPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workspace/file — Write file
router.put("/file", requireAuth, async (req: any, res) => {
  const reqPath = normalizePath(req.body.path);
  const content = req.body.content || "";
  
  if (!isSafePath(reqPath) || reqPath === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    // Upsert the file
    await db.insert(workspaceFiles)
      .values({
        userId: req.uid,
        filePath: reqPath,
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
    const parentParts = reqPath.split("/");
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

    res.json({ success: true, path: reqPath });
  } catch (err: any) {
    console.error("[Workspace PUT error]", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/mkdir — Create directory
router.post("/mkdir", requireAuth, async (req: any, res) => {
  const dirPath = normalizePath(req.body.path);
  if (!isSafePath(dirPath) || dirPath === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    await db.insert(workspaceFiles)
      .values({
        userId: req.uid,
        filePath: dirPath,
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
  const reqPath = normalizePath(req.query.path as string);
  if (!isSafePath(reqPath) || reqPath === "") { res.status(400).json({ error: "Invalid path" }); return; }
  
  try {
    // Delete the file itself and any nested children if it's a directory
    const pattern = `${reqPath}/%`;
    await db.execute(
      sql`DELETE FROM workspace_files WHERE user_id = ${req.uid} AND (file_path = ${reqPath} OR file_path LIKE ${pattern})`
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/serve/* — Serve raw file content for iframe previews
router.get("/serve/*", requireAuth, async (req: any, res: any) => {
  const rawPath = req.params[0] || "index.html";
  const reqPath = normalizePath(rawPath);
  if (!isSafePath(reqPath) || reqPath === "") {
    res.status(400).send("Invalid path");
    return;
  }
  
  try {
    const records = await db.select()
      .from(workspaceFiles)
      .where(and(
        eq(workspaceFiles.userId, req.uid),
        eq(workspaceFiles.filePath, reqPath)
      ))
      .limit(1);

    if (records.length === 0) {
      res.status(404).send(`File not found: ${reqPath}`);
      return;
    }

    const content = records[0].content || "";
    
    // Determine content type
    let contentType = "text/plain";
    if (reqPath.endsWith(".html")) contentType = "text/html";
    else if (reqPath.endsWith(".css")) contentType = "text/css";
    else if (reqPath.endsWith(".js") || reqPath.endsWith(".mjs")) contentType = "application/javascript";
    else if (reqPath.endsWith(".json")) contentType = "application/json";
    else if (reqPath.endsWith(".svg")) contentType = "image/svg+xml";

    res.setHeader("Content-Type", contentType);
    res.send(content);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

export default router;
