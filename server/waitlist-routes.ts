/**
 * Axiom Studio — Email Waitlist Routes
 * Collects early access signups for the June 23 launch.
 * DarkWave Studios LLC — Copyright 2026
 */

import { Router, Request, Response } from "express";
import { pool } from "./db.js";

const router = Router();

// POST /api/waitlist — Submit email for early access
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, name, source } = req.body;
    if (!email || !email.includes("@")) {
      res.status(400).json({ success: false, error: "Valid email required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already on waitlist
    const existing = await pool.query(
      `SELECT id FROM axiom_waitlist WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      res.json({ success: true, message: "You're already on the list! We'll be in touch." });
      return;
    }

    // Get current position
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM axiom_waitlist`);
    const position = parseInt(countResult.rows[0]?.count || "0") + 1;

    await pool.query(
      `INSERT INTO axiom_waitlist (email, name, source, position, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [normalizedEmail, name || null, source || "landing_page", position]
    );

    console.log(`[Waitlist] #${position} — ${normalizedEmail}`);

    const isEarlyAccess = position <= 500;
    res.json({
      success: true,
      position,
      message: isEarlyAccess
        ? `You're #${position}! You're in the first 500 — you'll get early access on June 23.`
        : `You're #${position} on the waitlist. We'll notify you when access opens.`,
      earlyAccess: isEarlyAccess,
    });
  } catch (err: any) {
    console.error("[Waitlist] Error:", err.message);
    res.status(500).json({ success: false, error: "Server error. Please try again." });
  }
});

// GET /api/waitlist/count — Public count for social proof
router.get("/count", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM axiom_waitlist`);
    res.json({ count: parseInt(result.rows[0]?.count || "0") });
  } catch {
    res.json({ count: 0 });
  }
});

export default router;
