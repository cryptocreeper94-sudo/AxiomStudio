/**
 * Axiom Depot — Code Repository & Backup Platform
 * API routes for repository management, file storage, and snapshots.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import { Router, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const router = Router();

// ── Auto-create Depot tables on first load ──
async function initDepotTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS depot_repos (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT DEFAULT '',
        is_private BOOLEAN DEFAULT false,
        language TEXT DEFAULT 'Unknown',
        default_branch TEXT DEFAULT 'main',
        stars INTEGER DEFAULT 0,
        forks INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        snapshot_count INTEGER DEFAULT 0,
        last_snapshot_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, slug)
      );
      CREATE INDEX IF NOT EXISTS idx_depot_repos_user ON depot_repos(user_id);
      CREATE INDEX IF NOT EXISTS idx_depot_repos_slug ON depot_repos(slug);

      CREATE TABLE IF NOT EXISTS depot_files (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        repo_id TEXT NOT NULL REFERENCES depot_repos(id) ON DELETE CASCADE,
        snapshot_id TEXT,
        file_path TEXT NOT NULL,
        content TEXT DEFAULT '',
        size_bytes INTEGER DEFAULT 0,
        language TEXT DEFAULT '',
        is_directory BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_depot_files_repo ON depot_files(repo_id);
      CREATE INDEX IF NOT EXISTS idx_depot_files_snapshot ON depot_files(snapshot_id);

      CREATE TABLE IF NOT EXISTS depot_snapshots (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        repo_id TEXT NOT NULL REFERENCES depot_repos(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT 'Snapshot',
        file_count INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        additions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_depot_snapshots_repo ON depot_snapshots(repo_id);

      CREATE TABLE IF NOT EXISTS depot_stars (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        repo_id TEXT NOT NULL REFERENCES depot_repos(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(repo_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS depot_activity (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        repo_id TEXT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_depot_activity_user ON depot_activity(user_id);
    `);
    console.log("[Depot] Tables verified/created");
  } catch (err: any) {
    console.warn("[Depot] Table init warning:", err.message);
  }
}

// Initialize on import
initDepotTables();

// ── Helper: get user from session ──
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

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function detectLanguage(files: string[]): string {
  const ext: Record<string, string> = {
    ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
    ".py": "Python", ".rs": "Rust", ".go": "Go", ".java": "Java", ".cpp": "C++",
    ".c": "C", ".cs": "C#", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift",
    ".kt": "Kotlin", ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
    ".md": "Markdown", ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
    ".sql": "SQL", ".sh": "Shell", ".dart": "Dart", ".vue": "Vue",
  };
  const counts: Record<string, number> = {};
  for (const f of files) {
    const match = f.match(/\.[a-z]+$/i);
    if (match && ext[match[0]]) {
      counts[ext[match[0]]] = (counts[ext[match[0]]] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "Unknown";
}

// ════════════════════════════════════════════════
// REPOS
// ════════════════════════════════════════════════

// List user's repos
router.get("/repos", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { rows } = await db.execute(sql`
      SELECT * FROM depot_repos WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `);
    res.json({ repos: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single repo
router.get("/repos/:slug", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { slug } = req.params;

  try {
    const { rows } = await db.execute(sql`
      SELECT r.*, u.username, u.display_name, u.avatar_url
      FROM depot_repos r
      LEFT JOIN chat_users u ON u.id::text = r.user_id
      WHERE r.slug = ${slug} AND (r.user_id = ${userId || ''} OR r.is_private = false)
      LIMIT 1
    `);
    if (!rows[0]) return res.status(404).json({ error: "Repository not found" });

    // Get files for latest snapshot (or all if no snapshots)
    const repo = rows[0] as any;
    const { rows: files } = await db.execute(sql`
      SELECT file_path, size_bytes, language, is_directory FROM depot_files
      WHERE repo_id = ${repo.id}
      ORDER BY is_directory DESC, file_path ASC
    `);

    const { rows: snapshots } = await db.execute(sql`
      SELECT id, message, file_count, total_size_bytes, additions, deletions, created_at
      FROM depot_snapshots WHERE repo_id = ${repo.id}
      ORDER BY created_at DESC LIMIT 20
    `);

    // Check if user starred
    let starred = false;
    if (userId) {
      const { rows: starRows } = await db.execute(sql`
        SELECT 1 FROM depot_stars WHERE repo_id = ${repo.id} AND user_id = ${userId}
      `);
      starred = starRows.length > 0;
    }

    res.json({ repo, files, snapshots, starred });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create repo
router.post("/repos", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { name, description, is_private } = req.body;
  if (!name) return res.status(400).json({ error: "Repository name is required" });

  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: "Invalid repository name" });

  try {
    const { rows } = await db.execute(sql`
      INSERT INTO depot_repos (user_id, name, slug, description, is_private)
      VALUES (${userId}, ${name}, ${slug}, ${description || ''}, ${is_private || false})
      RETURNING *
    `);

    // Log activity
    await db.execute(sql`
      INSERT INTO depot_activity (repo_id, user_id, action, details)
      VALUES (${(rows[0] as any).id}, ${userId}, 'create_repo', ${`Created repository ${name}`})
    `);

    res.json({ repo: rows[0] });
  } catch (err: any) {
    if (err.message?.includes("unique") || err.message?.includes("duplicate")) {
      return res.status(409).json({ error: "A repository with this name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete repo
router.delete("/repos/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    await db.execute(sql`
      DELETE FROM depot_repos WHERE id = ${req.params.id} AND user_id = ${userId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// FILES
// ════════════════════════════════════════════════

// Get file content
router.get("/repos/:repoId/file", async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: "path query param required" });

  try {
    const { rows } = await db.execute(sql`
      SELECT content, size_bytes, language FROM depot_files
      WHERE repo_id = ${req.params.repoId} AND file_path = ${filePath} AND is_directory = false
      LIMIT 1
    `);
    if (!rows[0]) return res.status(404).json({ error: "File not found" });
    res.json({ file: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// SNAPSHOTS (commits)
// ════════════════════════════════════════════════

// Push files + create snapshot
router.post("/repos/:repoId/push", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { message, files } = req.body;
  if (!files || !Array.isArray(files)) return res.status(400).json({ error: "files array required" });

  const repoId = req.params.repoId;

  try {
    // Verify ownership
    const { rows: repoRows } = await db.execute(sql`
      SELECT id FROM depot_repos WHERE id = ${repoId} AND user_id = ${userId}
    `);
    if (!repoRows[0]) return res.status(403).json({ error: "Not your repository" });

    // Create snapshot
    const totalSize = files.reduce((sum: number, f: any) => sum + (f.content?.length || 0), 0);
    const { rows: snapRows } = await db.execute(sql`
      INSERT INTO depot_snapshots (repo_id, user_id, message, file_count, total_size_bytes)
      VALUES (${repoId}, ${userId}, ${message || 'Snapshot'}, ${files.length}, ${totalSize})
      RETURNING id
    `);
    const snapshotId = (snapRows[0] as any).id;

    // Clear old files and insert new ones
    await db.execute(sql`DELETE FROM depot_files WHERE repo_id = ${repoId}`);

    for (const file of files) {
      const ext = file.path?.match(/\.[a-z]+$/i)?.[0] || '';
      await db.execute(sql`
        INSERT INTO depot_files (repo_id, snapshot_id, file_path, content, size_bytes, language, is_directory)
        VALUES (${repoId}, ${snapshotId}, ${file.path}, ${file.content || ''}, ${file.content?.length || 0}, ${ext}, ${file.isDirectory || false})
      `);
    }

    // Update repo stats
    const lang = detectLanguage(files.map((f: any) => f.path));
    await db.execute(sql`
      UPDATE depot_repos SET
        file_count = ${files.length},
        total_size_bytes = ${totalSize},
        snapshot_count = snapshot_count + 1,
        language = ${lang},
        last_snapshot_at = NOW(),
        updated_at = NOW()
      WHERE id = ${repoId}
    `);

    // Log activity
    await db.execute(sql`
      INSERT INTO depot_activity (repo_id, user_id, action, details)
      VALUES (${repoId}, ${userId}, 'push', ${`Pushed ${files.length} files: ${message || 'Snapshot'}`})
    `);

    res.json({ success: true, snapshotId, fileCount: files.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// STARS
// ════════════════════════════════════════════════

router.post("/repos/:repoId/star", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    await db.execute(sql`
      INSERT INTO depot_stars (repo_id, user_id) VALUES (${req.params.repoId}, ${userId})
      ON CONFLICT (repo_id, user_id) DO NOTHING
    `);
    await db.execute(sql`
      UPDATE depot_repos SET stars = (SELECT COUNT(*) FROM depot_stars WHERE repo_id = ${req.params.repoId}) WHERE id = ${req.params.repoId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/repos/:repoId/star", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    await db.execute(sql`DELETE FROM depot_stars WHERE repo_id = ${req.params.repoId} AND user_id = ${userId}`);
    await db.execute(sql`
      UPDATE depot_repos SET stars = (SELECT COUNT(*) FROM depot_stars WHERE repo_id = ${req.params.repoId}) WHERE id = ${req.params.repoId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// ANALYTICS / ACTIVITY
// ════════════════════════════════════════════════

router.get("/activity", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { rows } = await db.execute(sql`
      SELECT a.*, r.name as repo_name, r.slug as repo_slug
      FROM depot_activity a
      LEFT JOIN depot_repos r ON r.id = a.repo_id
      WHERE a.user_id = ${userId}
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    res.json({ activity: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contribution heatmap data (last 365 days)
router.get("/contributions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { rows } = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM depot_activity
      WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '365 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json({ contributions: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stats overview
router.get("/stats", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { rows: repoCount } = await db.execute(sql`
      SELECT COUNT(*) as count FROM depot_repos WHERE user_id = ${userId}
    `);
    const { rows: snapshotCount } = await db.execute(sql`
      SELECT COUNT(*) as count FROM depot_snapshots WHERE user_id = ${userId}
    `);
    const { rows: totalSize } = await db.execute(sql`
      SELECT COALESCE(SUM(total_size_bytes), 0) as total FROM depot_repos WHERE user_id = ${userId}
    `);
    const { rows: starCount } = await db.execute(sql`
      SELECT COUNT(*) as count FROM depot_stars s
      JOIN depot_repos r ON r.id = s.repo_id
      WHERE r.user_id = ${userId}
    `);

    res.json({
      repos: Number((repoCount[0] as any)?.count || 0),
      snapshots: Number((snapshotCount[0] as any)?.count || 0),
      totalSizeBytes: Number((totalSize[0] as any)?.total || 0),
      starsReceived: Number((starCount[0] as any)?.count || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Explore public repos
router.get("/explore", async (_req: Request, res: Response) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT r.*, u.username, u.display_name, u.avatar_url
      FROM depot_repos r
      LEFT JOIN chat_users u ON u.id::text = r.user_id
      WHERE r.is_private = false
      ORDER BY r.stars DESC, r.updated_at DESC
      LIMIT 50
    `);
    res.json({ repos: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
