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

// Log connection status on first query + auto-migrate agent tables
pool.query("SELECT 1").then(async () => {
  console.log("[DB] PostgreSQL connected successfully");
  // Auto-create agent tables if they don't exist (idempotent)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_conversations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        title TEXT NOT NULL DEFAULT 'New conversation',
        agent_id TEXT NOT NULL DEFAULT 'opus',
        model TEXT NOT NULL DEFAULT 'claude-opus-4-20250514',
        context_files TEXT[],
        total_tokens INTEGER DEFAULT 0,
        total_cost DECIMAL(10,4) DEFAULT 0,
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS agent_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id VARCHAR NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        artifacts TEXT,
        error_context TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS agent_definitions (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        max_tokens INTEGER DEFAULT 8192,
        temperature DECIMAL(2,1) DEFAULT 0.7,
        credit_cost INTEGER DEFAULT 1,
        icon TEXT,
        color TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agent_convos_user ON agent_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_agent_msgs_convo ON agent_messages(conversation_id);
    `);
    console.log("[DB] Agent tables verified/created");
  } catch (migErr: any) {
    console.warn("[DB] Auto-migration warning:", migErr.message);
  }
}).catch((err) => {
  console.error("[DB] PostgreSQL connection FAILED:", err.message);
});

export const db = drizzle(pool, { schema });
