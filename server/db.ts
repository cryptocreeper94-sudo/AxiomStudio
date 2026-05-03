/**
 * Axiom Studio — Database Connection
 * Shares Neon PostgreSQL with darkwavestudios.io
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const dbUrl = process.env.DATABASE_URL || "";
const needsSsl = dbUrl.includes("neon") || dbUrl.includes("render") || dbUrl.includes("amazonaws");

export const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

// Log connection status on first query
pool.query("SELECT 1").then(() => {
  console.log("[DB] PostgreSQL connected successfully");
}).catch((err) => {
  console.error("[DB] PostgreSQL connection FAILED:", err.message);
});

export const db = drizzle(pool, { schema });
