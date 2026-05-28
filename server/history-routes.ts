/**
 * Axiom Studio — File History Routes
 * Provides version history and revert functionality for workspace files.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { Router, Request, Response } from "express";
import { db, pool } from "./db.js";
import { workspaceFiles, workspaceFileHistory } from "../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// Auth helper (reuse pattern from workspace-routes)
function getAuthUserId(req: any, res: Response): string | null {
  const jwt = require("jsonwebtoken");
  let token = req.query.token as string;
  const auth = req.headers.authorization;
  if (!token) {
    if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return null; }
    token = auth.split(" ")[1];
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    return decoded.userId || decoded.id;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

// GET /api/history?path=... — Get version history for a file
router.get("/", async (req: Request, res: Response) => {
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  const filePath = String(req.query.path || "").trim();
  if (!filePath) { res.json({ versions: [] }); return; }

  try {
    const versions = await db
      .select({
        id: workspaceFileHistory.id,
        action: workspaceFileHistory.action,
        agentId: workspaceFileHistory.agentId,
        sizeBytes: workspaceFileHistory.sizeBytes,
        createdAt: workspaceFileHistory.createdAt,
      })
      .from(workspaceFileHistory)
      .where(and(
        eq(workspaceFileHistory.userId, userId),
        eq(workspaceFileHistory.filePath, filePath),
      ))
      .orderBy(desc(workspaceFileHistory.createdAt))
      .limit(50);

    res.json({ versions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/:id/content — Get content of a specific version
router.get("/:id/content", async (req: Request, res: Response) => {
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  try {
    const [version] = await db
      .select()
      .from(workspaceFileHistory)
      .where(and(
        eq(workspaceFileHistory.id, req.params.id),
        eq(workspaceFileHistory.userId, userId),
      ))
      .limit(1);

    if (!version) { res.status(404).json({ error: "Version not found" }); return; }

    res.json({ content: version.content, filePath: version.filePath, action: version.action, createdAt: version.createdAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history/revert — Revert a file to a specific version
router.post("/revert", async (req: Request, res: Response) => {
  const userId = getAuthUserId(req, res);
  if (!userId) return;

  const { versionId } = req.body;
  if (!versionId) { res.status(400).json({ error: "versionId required" }); return; }

  try {
    // Get the historical version
    const [version] = await db
      .select()
      .from(workspaceFileHistory)
      .where(and(
        eq(workspaceFileHistory.id, versionId),
        eq(workspaceFileHistory.userId, userId),
      ))
      .limit(1);

    if (!version) { res.status(404).json({ error: "Version not found" }); return; }

    // Snapshot the CURRENT content before reverting
    const [currentFile] = await db
      .select({ content: workspaceFiles.content })
      .from(workspaceFiles)
      .where(and(
        eq(workspaceFiles.userId, userId),
        eq(workspaceFiles.filePath, version.filePath),
      ))
      .limit(1);

    if (currentFile) {
      await db.insert(workspaceFileHistory).values({
        userId,
        filePath: version.filePath,
        content: currentFile.content ?? "",
        action: "revert",
        sizeBytes: Buffer.byteLength(currentFile.content ?? "", "utf8"),
      });
    }

    // Restore the historical content
    const sizeBytes = Buffer.byteLength(version.content, "utf8");
    await db
      .update(workspaceFiles)
      .set({ content: version.content, sizeBytes, updatedAt: new Date() })
      .where(and(
        eq(workspaceFiles.userId, userId),
        eq(workspaceFiles.filePath, version.filePath),
      ));

    res.json({ success: true, message: `Reverted "${version.filePath}" to version from ${version.createdAt}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
