/**
 * Axiom Studio — Local Mode Database (SQLite)
 * Stores chat history locally at ~/.axiom-studio/data.db
 * No PostgreSQL, no cloud — everything stays on your machine.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const DATA_DIR = join(homedir(), ".axiom-studio");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "data.db");
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
sqlite.pragma("journal_mode = WAL");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS agent_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New conversation',
    agent_id TEXT NOT NULL DEFAULT 'opus',
    model TEXT NOT NULL DEFAULT 'claude-opus-4-7',
    context_files TEXT,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    artifacts TEXT,
    error_context TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    max_tokens INTEGER DEFAULT 8192,
    temperature REAL DEFAULT 0.7,
    credit_cost INTEGER DEFAULT 1,
    icon TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_local_convos_user ON agent_conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_local_msgs_convo ON agent_messages(conversation_id);
`);

console.log(`[Local DB] SQLite initialized: ${DB_PATH}`);

// ─── Query helpers that match the Drizzle-like interface ─────────────

function genId(): string {
  return crypto.randomUUID();
}

export const localDb = {
  // ── Conversations ──
  createConversation(userId: string, title: string, agentId: string, model: string) {
    const id = genId();
    sqlite.prepare(
      `INSERT INTO agent_conversations (id, user_id, title, agent_id, model)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, title, agentId, model);
    return sqlite.prepare("SELECT * FROM agent_conversations WHERE id = ?").get(id) as any;
  },

  getConversations(userId: string) {
    return sqlite.prepare(
      "SELECT * FROM agent_conversations WHERE user_id = ? ORDER BY updated_at DESC"
    ).all(userId) as any[];
  },

  getConversation(id: string, userId: string) {
    return sqlite.prepare(
      "SELECT * FROM agent_conversations WHERE id = ? AND user_id = ?"
    ).get(id, userId) as any;
  },

  updateConversation(id: string, userId: string, updates: Record<string, any>) {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [k, v] of Object.entries(updates)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
    sets.push("updated_at = datetime('now')");
    vals.push(id, userId);
    sqlite.prepare(
      `UPDATE agent_conversations SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...vals);
  },

  deleteConversation(id: string, userId: string) {
    sqlite.prepare("DELETE FROM agent_messages WHERE conversation_id = ?").run(id);
    sqlite.prepare("DELETE FROM agent_conversations WHERE id = ? AND user_id = ?").run(id, userId);
  },

  // ── Messages ──
  addMessage(conversationId: string, role: string, content: string, model?: string, inputTokens?: number, outputTokens?: number) {
    const id = genId();
    sqlite.prepare(
      `INSERT INTO agent_messages (id, conversation_id, role, content, model, input_tokens, output_tokens)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, conversationId, role, content, model ?? null, inputTokens ?? null, outputTokens ?? null);
    return { id };
  },

  getMessages(conversationId: string) {
    return sqlite.prepare(
      "SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC"
    ).all(conversationId) as any[];
  },

  // ── Agent Definitions ──
  upsertAgent(agent: any) {
    sqlite.prepare(
      `INSERT OR REPLACE INTO agent_definitions (id, name, description, model, provider, system_prompt, max_tokens, temperature, credit_cost, icon, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(agent.id, agent.name, agent.description, agent.model, agent.provider, agent.systemPrompt, agent.maxTokens, agent.temperature, agent.creditCost, agent.icon, agent.color);
  },

  getAgents() {
    return sqlite.prepare("SELECT * FROM agent_definitions WHERE is_active = 1").all() as any[];
  },

  getAgent(id: string) {
    return sqlite.prepare("SELECT * FROM agent_definitions WHERE id = ?").get(id) as any;
  },
};

export default localDb;
