/**
 * Axiom Studio — Export Routes
 * ZIP download of workspace files for both cloud and local modes.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { Router } from "express";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { getWorkspaceRoot } from "./local-tools.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");

const router = Router();

// Skip patterns for export
const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", ".next", "__pycache__",
  ".venv", "build", ".cache", ".DS_Store",
]);

function collectFiles(dir: string, rootDir: string, files: { path: string; fullPath: string }[] = []): typeof files {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".env.example" && entry.name !== ".gitignore") continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      const relPath = relative(rootDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        collectFiles(fullPath, rootDir, files);
      } else if (entry.isFile()) {
        const stat = statSync(fullPath);
        // Skip files > 10MB
        if (stat.size < 10 * 1024 * 1024) {
          files.push({ path: relPath, fullPath });
        }
      }
    }
  } catch { /* permission errors */ }
  return files;
}

// GET /api/workspace/export — Download workspace as ZIP
router.get("/export", (req: any, res: any) => {
  const convoId = req.headers['x-convo-id'] || req.query.convoId || "default";
  const rootDir = getWorkspaceRoot(convoId);

  if (!existsSync(rootDir)) {
    res.status(404).json({ error: "Workspace directory not found" });
    return;
  }

  const projectName = rootDir.split(/[\\/]/).pop() || "axiom-project";

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${projectName}.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err: any) => {
    console.error("[Export] Archive error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  });

  archive.pipe(res);

  const files = collectFiles(rootDir, rootDir);
  for (const file of files) {
    archive.file(file.fullPath, { name: file.path });
  }

  archive.finalize();
});

export default router;
