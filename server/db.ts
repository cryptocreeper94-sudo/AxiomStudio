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
        model TEXT NOT NULL DEFAULT 'claude-opus-4-7',
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
      
      -- Chat Users schema updates (for shared DWTL tables)
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS ecosystem_pin_hash TEXT;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS trust_layer_id TEXT;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS ecosystem_app TEXT;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS ad_free_subscription BOOLEAN DEFAULT false;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS ad_free_expires_at TIMESTAMP;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS messages_this_month INTEGER DEFAULT 0;
      ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS month_reset_at TIMESTAMP;

      -- AI Credits
      CREATE TABLE IF NOT EXISTS ai_credit_balances (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE,
        credits INTEGER NOT NULL DEFAULT 0,
        total_purchased INTEGER NOT NULL DEFAULT 0,
        total_used INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ai_credit_transactions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        stripe_session_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_credit_trans_user ON ai_credit_transactions(user_id);

      -- Ecosystem whitelist (open beta — table must exist even if unused)
      CREATE TABLE IF NOT EXISTS ecosystem_whitelist (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        apps TEXT[] DEFAULT ARRAY['all'],
        access_level TEXT DEFAULT 'full',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_whitelist_email ON ecosystem_whitelist(email);

      -- Waitlist for early access
      CREATE TABLE IF NOT EXISTS axiom_waitlist (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        source TEXT DEFAULT 'landing_page',
        position INTEGER NOT NULL DEFAULT 0,
        notified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON axiom_waitlist(email);

      -- File version history for undo/revert
      CREATE TABLE IF NOT EXISTS workspace_file_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL DEFAULT 'write',
        agent_id TEXT,
        conversation_id TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_file_history_user_path ON workspace_file_history(user_id, file_path, created_at DESC);

      -- Force upgrade specific admin accounts to owner
      UPDATE chat_users SET role = 'owner' WHERE email = 'cryptocreeper94@gmail.com';

      -- Workspace Files storage
      CREATE TABLE IF NOT EXISTS workspace_files (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        is_directory BOOLEAN NOT NULL DEFAULT false,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, file_path)
      );
      CREATE INDEX IF NOT EXISTS idx_ws_files_user ON workspace_files(user_id);
    `);
    console.log("[DB] Agent tables verified/created");
  } catch (migErr: any) {
    console.warn("[DB] Auto-migration warning:", migErr.message);
  }
}).catch((err) => {
  console.error("[DB] PostgreSQL connection FAILED:", err.message);
});

export const db = drizzle(pool, { schema });
