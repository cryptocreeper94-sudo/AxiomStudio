import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Schema points to agent-schema.ts intentionally — Axiom Studio only manages its own tables.
  // shared/schema.ts includes DWTL-owned tables (chat_users, ai_credit_balances, etc.)
  // that are managed by the DWTL repo. Do not change this to schema.ts.
  schema: "./shared/agent-schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
