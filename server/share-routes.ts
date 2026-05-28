/**
 * Axiom Studio — Share Build Routes
 * Public shareable links for user-created projects.
 * Generates a unique URL with read-only preview of code + live output.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router = Router();

// Helper: get user from session
function getUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const token = auth.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

// ── Create a shared build ─────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { title, description, files, previewHtml } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "At least one file is required" });
  }

  try {
    const { rows } = await db.execute(sql`
      INSERT INTO shared_builds (user_id, title, description, files, preview_html)
      VALUES (${userId}, ${title || "Untitled Build"}, ${description || ""}, ${JSON.stringify(files)}::jsonb, ${previewHtml || null})
      RETURNING id, created_at
    `);

    const build = rows[0] as any;
    res.json({
      success: true,
      shareId: build.id,
      shareUrl: `/share/${build.id}`,
    });
  } catch (err: any) {
    console.error("[Share] Error creating share:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get a shared build (PUBLIC — no auth required) ────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT sb.*, u.username, u.display_name, u.avatar_url
      FROM shared_builds sb
      LEFT JOIN chat_users u ON u.id::text = sb.user_id
      WHERE sb.id = ${req.params.id}
      LIMIT 1
    `);

    if (!rows[0]) return res.status(404).json({ error: "Build not found" });

    // Increment view count (fire-and-forget)
    db.execute(sql`
      UPDATE shared_builds SET view_count = view_count + 1 WHERE id = ${req.params.id}
    `).catch(() => {});

    const build = rows[0] as any;
    res.json({
      id: build.id,
      title: build.title,
      description: build.description,
      files: typeof build.files === "string" ? JSON.parse(build.files) : build.files,
      previewHtml: build.preview_html,
      viewCount: build.view_count,
      createdAt: build.created_at,
      author: {
        username: build.username,
        displayName: build.display_name,
        avatarUrl: build.avatar_url,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── List user's shared builds ─────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { rows } = await db.execute(sql`
      SELECT id, title, description, view_count, created_at
      FROM shared_builds
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json({ builds: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete a shared build ─────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    await db.execute(sql`
      DELETE FROM shared_builds WHERE id = ${req.params.id} AND user_id = ${userId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
