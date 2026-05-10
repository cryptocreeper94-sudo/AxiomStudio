/**
 * Axiom Studio — Agent API Routes
 * SSE streaming, conversation management, credit gating.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import type { Express, Request, Response } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, pool } from "./db.js";
import {
  agentConversations,
  agentMessages,
  agentDefinitions,
  chatUsers,
  aiCreditBalances,
  aiCreditTransactions,
  AGENT_CREDIT_COSTS,
} from "../shared/schema.js";
import { getProviderStream, type ChatMessage } from "./agent-providers.js";
import { AGENT_PROMPTS, AGENT_SEEDS } from "./agent-prompts.js";
import { classifyMessage, ROUTE_MODELS } from "./auto-router.js";
import { verifyFirebaseToken } from "./firebase-admin.js";

// ─── Whitelist Check ─────────────────────────────────────────────────

async function checkWhitelist(email: string, app: string = "axiom-studio"): Promise<{ allowed: boolean; entry?: any }> {
  try {
    const result = await pool.query(
      `SELECT * FROM ecosystem_whitelist
       WHERE email = $1 AND active = true AND ($2 = ANY(apps) OR 'all' = ANY(apps))`,
      [email.toLowerCase().trim(), app]
    );
    if (result.rows.length > 0) {
      return { allowed: true, entry: result.rows[0] };
    }
    return { allowed: false };
  } catch (err: any) {
    // Fail closed
    console.error("[Whitelist] DB error — denying access:", err.message);
    return { allowed: false };
  }
}

// ─── Auth Middleware ──────────────────────────────────────────────────

function extractUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET as string
    ) as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

function requireAuth(req: Request, res: Response): string | null {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

// ─── Credit Management ───────────────────────────────────────────────

async function deductCreditsAtomic(
  userId: string,
  agentId: string,
  description: string
): Promise<boolean> {
  // Dev mode bypass — no credit gating without Firebase
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return true;

  // Owner bypass — unlimited access
  const [user] = await db.select().from(chatUsers).where(eq(chatUsers.id, userId)).limit(1);
  if (user?.role === "owner") return true;

  const costKey = `agent-${agentId}` as keyof typeof AGENT_CREDIT_COSTS;
  const cost = AGENT_CREDIT_COSTS[costKey]?.credits ?? 1;
  if (cost === 0) return true;

  // Atomic deduction
  const [result] = await db
    .update(aiCreditBalances)
    .set({
      credits: sql`${aiCreditBalances.credits} - ${cost}`,
      totalUsed: sql`${aiCreditBalances.totalUsed} + ${cost}`,
      updatedAt: new Date(),
    })
    .where(and(eq(aiCreditBalances.userId, userId), sql`${aiCreditBalances.credits} >= ${cost}`))
    .returning();

  if (!result) return false;

  await db.insert(aiCreditTransactions).values({
    userId,
    type: "usage",
    amount: -cost,
    balanceAfter: result.credits,
    description,
    category: "agent",
  });

  return true;
}

// ─── Seed Agent Definitions ──────────────────────────────────────────

async function seedAgents(): Promise<void> {
  for (const seed of AGENT_SEEDS) {
    const [existing] = await db
      .select()
      .from(agentDefinitions)
      .where(eq(agentDefinitions.id, seed.id))
      .limit(1);

    if (!existing) {
      await db.insert(agentDefinitions).values({
        id: seed.id,
        name: seed.name,
        description: seed.description,
        model: seed.model,
        provider: seed.provider,
        systemPrompt: AGENT_PROMPTS[seed.id] || "",
        maxTokens: seed.maxTokens,
        temperature: seed.temperature,
        creditCost: seed.creditCost,
        icon: seed.icon,
        color: seed.color,
        isActive: true,
      });
      console.log(`[Agent] Seeded agent: ${seed.name}`);
    }
  }
}

// ─── Route Registration ──────────────────────────────────────────────

export function registerAgentRoutes(app: Express): void {
  // Seed agents on startup
  seedAgents().catch(console.error);

  // ── Auth Login (email-based, with username backward compat) ────────
  app.post("/api/agent/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;
      const identifier = email || username;
      if (!identifier || !password) {
        res.status(400).json({ success: false, error: "Email and password required" });
        return;
      }

      // Look up by email first, fall back to username (backward compat)
      const userResult = await pool.query(
        `SELECT id, username, email, password_hash AS "passwordHash", 
                display_name AS "displayName", role 
         FROM chat_users 
         WHERE email = $1 OR username = $1 
         LIMIT 1`,
        [identifier.toLowerCase().trim()]
      );
      const user = userResult.rows[0];

      if (!user) {
        res.status(401).json({ success: false, error: "Invalid credentials" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, error: "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET as string,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, displayName: user.displayName },
      });
    } catch (err: any) {
      console.error("[Auth Login] Error:", err.message, err.stack);
      res.status(500).json({ success: false, error: "Server error during login" });
    }
  });

  // ── Auth Signup (email-primary, username auto-generated) ───────────
  app.post("/api/agent/auth/signup", async (req: Request, res: Response) => {
    try {
      const { username, email, password, displayName } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, error: "Email and password required" });
        return;
      }

      // Check password strength
      if (password.length < 8) {
        res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
        return;
      }

      // ── Whitelist gate ──
      const { allowed, entry } = await checkWhitelist(email, "axiom-studio");
      if (!allowed) {
        res.status(403).json({
          success: false,
          error: "Axiom Studio is in closed beta. Request access at darkwavestudios.io",
          code: "WHITELIST_REQUIRED",
        });
        return;
      }

      // Check if username or email already exists
      const [existingUser] = await db
        .select({ id: chatUsers.id })
        .from(chatUsers)
        .where(eq(chatUsers.username, username))
        .limit(1);

      if (existingUser) {
        res.status(409).json({ success: false, error: "Username already taken" });
        return;
      }

      const [existingEmail] = await db
        .select({ id: chatUsers.id })
        .from(chatUsers)
        .where(eq(chatUsers.email, email))
        .limit(1);

      if (existingEmail) {
        res.status(409).json({ success: false, error: "Email already registered" });
        return;
      }

      // Create user — whitelist access_level determines starting credits and role
      const passwordHash = await bcrypt.hash(password, 12);
      const colors = ["#06b6d4", "#14b8a6", "#a855f7", "#3b82f6", "#ec4899", "#f97316"];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      const isOwner = entry?.access_level === "owner";

      // Check for pre-granted credits in whitelist notes (e.g. "pre-granted 500 credits")
      const preGrantMatch = entry?.notes?.match(/pre-granted\s+(\d+)\s+credits/i);
      const preGrantedCredits = preGrantMatch ? parseInt(preGrantMatch[1]) : 0;
      const startingCredits = isOwner ? 999999 : preGrantedCredits > 0 ? preGrantedCredits : entry?.access_level === "full" ? 100 : 10;

      const [newUser] = await db
        .insert(chatUsers)
        .values({
          username,
          email: email.toLowerCase().trim(),
          passwordHash,
          displayName: displayName || username,
          avatarColor,
          role: isOwner ? "owner" : "member",
        })
        .returning();

      // Seed credits (whitelisted full-access users get 100)
      await db.insert(aiCreditBalances).values({
        userId: newUser.id,
        credits: startingCredits,
        totalPurchased: startingCredits,
        totalUsed: 0,
      });

      console.log(`[Whitelist] User ${email} signed up (access: ${entry?.access_level}, credits: ${startingCredits})`);

      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        process.env.JWT_SECRET as string,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        token,
        user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName },
      });
    } catch (err: any) {
      console.error("[Auth Signup] Error:", err.message, err.stack);
      res.status(500).json({ success: false, error: "Server error during signup", detail: err.message });
    }
  });

  // ── Firebase Auth (Google/GitHub OAuth) ─────────────────────────────
  app.post("/api/agent/auth/firebase", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        res.status(400).json({ success: false, error: "Firebase ID token required" });
        return;
      }

      // Verify the Firebase ID token
      const decoded = await verifyFirebaseToken(idToken);
      if (!decoded) {
        res.status(401).json({ success: false, error: "Invalid Firebase token" });
        return;
      }

      const firebaseUid = decoded.uid;
      const email = decoded.email || "";
      const name = decoded.name || decoded.email?.split("@")[0] || "User";
      const picture = decoded.picture || "";

      if (!email) {
        res.status(400).json({ success: false, error: "No email associated with this account" });
        return;
      }

      // Use raw SQL to avoid Drizzle referencing columns that may not exist in production DB
      // (e.g. ecosystem_pin_hash, trust_layer_id added to schema but db:push not run)
      const userResult = await pool.query(
        `SELECT id, username, email, display_name AS "displayName", role 
         FROM chat_users WHERE email = $1 LIMIT 1`,
        [email.toLowerCase().trim()]
      );
      let user = userResult.rows[0] || null;

      if (!user) {
        // Auto-create user from Firebase profile
        const { allowed, entry } = await checkWhitelist(email, "axiom-studio");
        
        if (!allowed) {
          res.status(403).json({ success: false, error: "Closed beta. Request access at darkwavestudios.io" });
          return;
        }

        const isOwner = entry?.access_level === "owner";
        const preGrantMatch = entry?.notes?.match(/pre-granted\s+(\d+)\s+credits/i);
        const preGrantedCredits = preGrantMatch ? parseInt(preGrantMatch[1]) : 0;
        const startingCredits = isOwner ? 999999 : preGrantedCredits > 0 ? preGrantedCredits : entry?.access_level === "full" ? 100 : 10;

        // Generate a unique username from email
        const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
        let username = baseUsername;
        let suffix = 1;
        while (true) {
          const check = await pool.query(`SELECT id FROM chat_users WHERE username = $1 LIMIT 1`, [username]);
          if (check.rows.length === 0) break;
          username = `${baseUsername}${suffix++}`;
        }

        const colors = ["#06b6d4", "#14b8a6", "#a855f7", "#3b82f6", "#ec4899", "#f97316"];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];
        const randomPass = await bcrypt.hash(crypto.randomUUID(), 10);

        // Raw INSERT — only core columns that definitely exist
        const insertResult = await pool.query(
          `INSERT INTO chat_users (id, username, email, password_hash, display_name, avatar_color, role, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
           RETURNING id, username, email, display_name AS "displayName", role`,
          [username, email.toLowerCase().trim(), randomPass, name, avatarColor, isOwner ? "owner" : "member"]
        );
        user = insertResult.rows[0];

        // Seed credits (non-fatal — table may not exist yet)
        try {
          await pool.query(
            `INSERT INTO ai_credit_balances (id, user_id, credits, total_purchased, total_used, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $2, 0, NOW())`,
            [user.id, startingCredits]
          );
        } catch (creditErr: any) {
          console.warn("[Firebase Auth] Could not seed credits (table may not exist):", creditErr.message);
        }

        console.log(`[Firebase Auth] New user created: ${email} (username: ${username}, credits: ${startingCredits})`);
      }

      // Issue app JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET as string,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error("[Firebase Auth] Error:", err.message, err.stack);
      res.status(500).json({ 
        success: false, 
        error: `Firebase authentication error: ${err.message}`,
        detail: err.message,
        code: err.code || "UNKNOWN",
      });
    }
  });

  // ── Profile Update (username, displayName, PIN) ─────────────────────
  app.patch("/api/agent/profile", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      const { username, displayName, pin } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (username) {
        // Check uniqueness
        const check = await pool.query(`SELECT id FROM chat_users WHERE username = $1 AND id != $2 LIMIT 1`, [username, decoded.userId]);
        if (check.rows.length > 0) { res.status(409).json({ error: "Username already taken" }); return; }
        updates.push(`username = $${paramIndex++}`);
        values.push(username);
      }
      if (displayName) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(displayName);
      }
      if (pin) {
        const pinHash = await bcrypt.hash(pin, 10);
        updates.push(`ecosystem_pin_hash = $${paramIndex++}`);
        values.push(pinHash);
      }

      if (updates.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

      values.push(decoded.userId);
      try {
        await pool.query(
          `UPDATE chat_users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
          values
        );
      } catch (dbErr: any) {
        // If ecosystem_pin_hash column doesn't exist, retry without it
        if (dbErr.message?.includes("ecosystem_pin_hash")) {
          const filteredUpdates = updates.filter(u => !u.includes("ecosystem_pin_hash"));
          const filteredValues = values.filter((_, i) => !updates[i]?.includes("ecosystem_pin_hash"));
          filteredValues.push(decoded.userId);
          if (filteredUpdates.length > 0) {
            await pool.query(
              `UPDATE chat_users SET ${filteredUpdates.join(", ")} WHERE id = $${filteredUpdates.length + 1}`,
              filteredValues
            );
          }
          console.warn("[Profile] ecosystem_pin_hash column missing, PIN not saved");
        } else throw dbErr;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Profile] Error:", err.message);
      res.status(500).json({ error: "Failed to update profile", detail: err.message });
    }
  });

  // ── List available agents ──────────────────────────────────────────
  app.get("/api/agent/models", async (_req: Request, res: Response) => {
    try {
      const agents = await db
        .select()
        .from(agentDefinitions)
        .where(eq(agentDefinitions.isActive, true));

      res.json(
        agents.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          model: a.model,
          provider: a.provider,
          maxTokens: a.maxTokens,
          creditCost: a.creditCost,
          icon: a.icon,
          color: a.color,
        }))
      );
    } catch (err) {
      console.warn("[Agent Models] DB query failed, returning seed agents:", (err as any).message);
      // Graceful fallback — return seed data if table doesn't exist yet
      res.json(
        AGENT_SEEDS.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          model: s.model,
          provider: s.provider,
          maxTokens: s.maxTokens,
          creditCost: s.creditCost,
          icon: s.icon,
          color: s.color,
        }))
      );
    }
  });

  // ── List conversations ─────────────────────────────────────────────
  app.get("/api/agent/conversations", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const convos = await db
      .select()
      .from(agentConversations)
      .where(eq(agentConversations.userId, userId))
      .orderBy(desc(agentConversations.updatedAt))
      .limit(50);

    res.json(convos);
  });

  // ── Create conversation ────────────────────────────────────────────
  app.post("/api/agent/conversations", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const { title, agentId, model } = req.body;

      const [convo] = await db
        .insert(agentConversations)
        .values({
          userId,
          title: title || "New conversation",
          agentId: agentId || "opus",
          model: model || "claude-opus-4-20250514",
        })
        .returning();

      res.json(convo);
    } catch (err: any) {
      console.error("[Create Conversation] Error:", err.message);
      res.status(500).json({ error: `Database error: ${err.message}` });
    }
  });

  // ── Get conversation messages ──────────────────────────────────────
  app.get(
    "/api/agent/conversations/:id/messages",
    async (req: Request, res: Response) => {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const messages = await db
        .select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, req.params.id))
        .orderBy(agentMessages.createdAt);

      res.json(messages);
    }
  );

  // ── Delete conversation ────────────────────────────────────────────
  app.delete(
    "/api/agent/conversations/:id",
    async (req: Request, res: Response) => {
      const userId = requireAuth(req, res);
      if (!userId) return;

      await db
        .delete(agentMessages)
        .where(eq(agentMessages.conversationId, req.params.id));
      await db
        .delete(agentConversations)
        .where(eq(agentConversations.id, req.params.id));

      res.json({ success: true });
    }
  );

  // ── Chat (SSE streaming) ───────────────────────────────────────────
  app.post("/api/agent/chat", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { conversationId, message, agentId, contextFiles, errorContext } =
      req.body;

    if (!message || !conversationId) {
      console.error("400 ERROR BODY:", req.body); res.status(400).json({ error: "message and conversationId required" });
      return;
    }

    try {

    let activeAgent = agentId || "auto";
    let routedModel: string | null = null;
    let routeScore: number | null = null;
    let routeReason: string | null = null;

    // ── Auto-Router: classify and pick optimal model ─────────────────
    if (activeAgent === "auto") {
      const history = await db
        .select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, conversationId))
        .orderBy(agentMessages.createdAt);

      const decision = await classifyMessage(
        message,
        !!errorContext,
        !!contextFiles?.length,
        history.length
      );

      activeAgent = decision.target;
      routedModel = ROUTE_MODELS[decision.target].model;
      routeScore = decision.score;
      routeReason = decision.reason;
      console.log(`[AutoRouter] Score: ${decision.score}/10 → ${decision.target} (${decision.reason})`);
    }



    // Get agent definition (with fallback to seeds)
    let agent: any;
    try {
      const [dbAgent] = await db
        .select()
        .from(agentDefinitions)
        .where(eq(agentDefinitions.id, activeAgent))
        .limit(1);
      agent = dbAgent;
    } catch (err) {
      console.warn("[Chat] Agent DB lookup failed, falling back to seeds:", (err as any).message);
    }

    if (!agent) {
      // Fallback to seed data
      const seed = AGENT_SEEDS.find(s => s.id === activeAgent) || AGENT_SEEDS[0];
      agent = {
        id: seed.id, name: seed.name, model: seed.model,
        provider: seed.provider, maxTokens: seed.maxTokens,
        temperature: 0.7, systemPrompt: AGENT_PROMPTS[seed.id] || AGENT_PROMPTS.opus,
        creditCost: seed.creditCost,
      };
      console.log(`[Chat] Using seed agent fallback: ${agent.name} (${agent.model})`);
    }

    // Build context-enriched user message
    let enrichedMessage = message;
    if (contextFiles?.length) {
      enrichedMessage = `[Context Files: ${contextFiles.join(", ")}]\n\n${message}`;
    }
    if (errorContext) {
      enrichedMessage = `[Error Report]\n${errorContext}\n\n[User Message]\n${message}`;
    }

    // Save user message
    await db.insert(agentMessages).values({
      conversationId,
      role: "user",
      content: message,
      errorContext: errorContext || null,
    });

    // Get conversation history (fresh fetch for non-auto path)
    const allHistory = await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.conversationId, conversationId))
      .orderBy(agentMessages.createdAt)
      .limit(40);

    const chatMessages: ChatMessage[] = allHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Override last user message with enriched version
    if (chatMessages.length > 0) {
      chatMessages[chatMessages.length - 1].content = enrichedMessage;
    }

    // Deduct credits atomically before streaming
    const hasCredits = await deductCreditsAtomic(userId, activeAgent, `${agent.name} - ${message.slice(0, 50)}`);
    if (!hasCredits) {
      res.status(402).json({
        error: "Insufficient credits",
        message: "Purchase more credits to continue using this agent.",
      });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send route decision to client (so UI can show which model was used)
    if (routeScore !== null) {
      res.write(`data: ${JSON.stringify({
        type: "route",
        model: routedModel,
        agent: activeAgent,
        score: routeScore,
        reason: routeReason,
      })}\n\n`);
    }

    // Stream response
    let fullResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = getProviderStream(agent.provider, chatMessages, {
      model: agent.model,
      maxTokens: agent.maxTokens ?? 8192,
      temperature: parseFloat(String(agent.temperature ?? "0.7")),
      systemPrompt: agent.systemPrompt,
    });

    for await (const chunk of stream) {
      if (chunk.type === "text" && chunk.content) {
        fullResponse += chunk.content;
        res.write(`data: ${JSON.stringify({ type: "text", content: chunk.content })}\n\n`);
      } else if (chunk.type === "usage") {
        inputTokens = chunk.inputTokens || 0;
        outputTokens = chunk.outputTokens || 0;
        res.write(`data: ${JSON.stringify({ type: "usage", inputTokens, outputTokens })}\n\n`);
      } else if (chunk.type === "error") {
        res.write(`data: ${JSON.stringify({ type: "error", error: chunk.error })}\n\n`);
      } else if (chunk.type === "done") {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      }
    }

    // Save assistant message
    await db.insert(agentMessages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      model: agent.model,
      inputTokens,
      outputTokens,
    });

    // Update conversation
    const title =
      allHistory.length <= 1
        ? message.slice(0, 80) + (message.length > 80 ? "..." : "")
        : undefined;

    await db
      .update(agentConversations)
      .set({
        ...(title ? { title } : {}),
        totalTokens: sql`${agentConversations.totalTokens} + ${inputTokens + outputTokens}`,
        updatedAt: new Date(),
      })
      .where(eq(agentConversations.id, conversationId));


    res.end();
    } catch (err: any) {
      console.error("[Chat] Unhandled error:", err.message, err.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: `Chat error: ${err.message}` });
      } else {
        res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
        res.end();
      }
    }
  });

  // ── User credit balance ────────────────────────────────────────────
  app.get("/api/agent/credits", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const [balance] = await db
      .select()
      .from(aiCreditBalances)
      .where(eq(aiCreditBalances.userId, userId))
      .limit(1);

    res.json({
      credits: balance?.credits ?? 0,
      totalPurchased: balance?.totalPurchased ?? 0,
      totalUsed: balance?.totalUsed ?? 0,
    });
  });

  console.log("[Axiom Studio] Agent routes registered");
}
