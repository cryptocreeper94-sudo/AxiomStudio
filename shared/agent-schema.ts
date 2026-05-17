/**
 * Axiom Studio — Agent-Only Schema
 * Only the NEW tables owned by Axiom Studio.
 * Used by drizzle-kit push to avoid conflicts with DWTL-owned tables.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Agent Conversations
export const agentConversations = pgTable("agent_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull().default("New conversation"),
  agentId: text("agent_id").notNull().default("opus"),
  model: text("model").notNull().default("claude-opus-4-7"),
  contextFiles: text("context_files").array(),
  totalTokens: integer("total_tokens").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 4 }).default("0"),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentConversationSchema = createInsertSchema(agentConversations).omit({
  id: true, totalTokens: true, totalCost: true, pinned: true, createdAt: true, updatedAt: true,
});
export type InsertAgentConversation = z.infer<typeof insertAgentConversationSchema>;
export type AgentConversation = typeof agentConversations.$inferSelect;

// Agent Messages
export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  artifacts: text("artifacts"),
  errorContext: text("error_context"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({
  id: true, createdAt: true,
});
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentMessage = typeof agentMessages.$inferSelect;

// Agent Definitions
export const agentDefinitions = pgTable("agent_definitions", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  maxTokens: integer("max_tokens").default(8192),
  temperature: decimal("temperature", { precision: 2, scale: 1 }).default("0.7"),
  creditCost: integer("credit_cost").default(1),
  icon: text("icon"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentDefinitionSchema = createInsertSchema(agentDefinitions).omit({
  createdAt: true,
});
export type InsertAgentDefinition = z.infer<typeof insertAgentDefinitionSchema>;
export type AgentDefinition = typeof agentDefinitions.$inferSelect;
