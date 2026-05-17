/**
 * Axiom Studio — Migration Script
 * Creates agent tables in the shared Neon DB.
 * Run once: npx tsx shared/migrate.ts
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("[Migration] Creating Axiom Studio tables...");

    await client.query(`
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
    `);
    console.log("[Migration] ✓ agent_conversations");

    await client.query(`
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
    `);
    console.log("[Migration] ✓ agent_messages");

    await client.query(`
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
    `);
    console.log("[Migration] ✓ agent_definitions");

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_agent_convos_user ON agent_conversations(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_agent_msgs_convo ON agent_messages(conversation_id);`);
    console.log("[Migration] ✓ indexes");

    console.log("[Migration] Done! All Axiom Studio tables created.");
  } catch (err) {
    console.error("[Migration] Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
