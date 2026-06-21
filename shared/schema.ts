/**
 * Axiom Studio — Database Schema
 * Shares Neon DB with darkwavestudios.io
 * 
 * Tables prefixed with "agent_" are owned by Axiom Studio.
 * chatUsers, aiCreditBalances, aiCreditTransactions are shared with DWTL.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ SHARED TABLES (also in DWTL) ============
// These are READ from Axiom Studio, OWNED by DWTL schema

export const chatUsers = pgTable("chat_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull().default("#06b6d4"),
  role: text("role").notNull().default("member"),
  trustLayerId: text("trust_layer_id").unique(),
  ecosystemPinHash: text("ecosystem_pin_hash"),
  ecosystemApp: text("ecosystem_app"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  adFreeSubscription: boolean("ad_free_subscription").default(false),
  adFreeExpiresAt: timestamp("ad_free_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ChatUser = typeof chatUsers.$inferSelect;

export const aiCreditBalances = pgTable("ai_credit_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  credits: integer("credits").notNull().default(0),
  totalPurchased: integer("total_purchased").notNull().default(0),
  totalUsed: integer("total_used").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type AiCreditBalance = typeof aiCreditBalances.$inferSelect;

export const aiCreditTransactions = pgTable("ai_credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type AiCreditTransaction = typeof aiCreditTransactions.$inferSelect;

// ============ AXIOM STUDIO TABLES ============

// Agent Conversations
export const agentConversations = pgTable("agent_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull().default("New conversation"),
  agentId: text("agent_id").notNull().default("opus"),
  model: text("model").notNull().default("claude-opus-4-7"),
  lockedModel: text("locked_model"),
  contextFiles: text("context_files").array(),
  totalTokens: integer("total_tokens").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 4 }).default("0"),
  pinned: boolean("pinned").default(false),
  activeStarter: jsonb("active_starter"),
  checklist: jsonb("checklist"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentConversationSchema = createInsertSchema(agentConversations).omit({
  id: true,
  totalTokens: true,
  totalCost: true,
  pinned: true,
  createdAt: true,
  updatedAt: true,
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
  id: true,
  createdAt: true,
});
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentMessage = typeof agentMessages.$inferSelect;

// Agent Definitions (configurable agents/personas)
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

// Credit costs for agent operations
export const AGENT_CREDIT_COSTS = {
  "agent-opus": { credits: 3, label: "Claude Opus Message" },
  "agent-sonnet": { credits: 1, label: "Claude Sonnet Message" },
  "agent-gpt4": { credits: 2, label: "GPT-4.1 Message" },
  "agent-mini": { credits: 0, label: "GPT-4o-mini (Free)" },
  "agent-lume": { credits: 3, label: "Lume Agent Message" },
} as const;

// ============ WORKSPACE STORAGE ============

export const workspaceFiles = pgTable("workspace_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(), // References chat_users(id)
  conversationId: text("conversation_id").notNull().default('default-workspace'),
  filePath: text("file_path").notNull(),
  content: text("content").notNull().default(""),
  isDirectory: boolean("is_directory").notNull().default(false),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// File version history for undo/revert
export const workspaceFileHistory = pgTable("workspace_file_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  action: text("action").notNull(), // "write" | "delete" | "revert"
  agentId: text("agent_id"),
  conversationId: text("conversation_id"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});


