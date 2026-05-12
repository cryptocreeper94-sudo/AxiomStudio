/**
 * Axiom Studio — Local Mode Server
 * Runs on your machine with direct filesystem access.
 * No PostgreSQL, no Firebase, no Stripe, no rate limiting.
 * Same frontend, same agents — but with full local power.
 *
 * Usage: npm run local
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { localDb } from "./local-db.js";
import { LOCAL_ANTHROPIC_TOOLS, LOCAL_OPENAI_TOOLS, executeLocalTool, getWorkspaceRoot } from "./local-tools.js";
import localWorkspaceRoutes from "./local-workspace-routes.js";
import { AGENT_PROMPTS, AGENT_SEEDS } from "./agent-prompts.js";
import { getProviderStream, type ChatMessage } from "./agent-providers.js";
import { setupTerminalWebSocket } from "./pty.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Set local mode flag ──
process.env.AXIOM_LOCAL = "true";

// ── Generate a local JWT secret if not set ──
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "axiom-local-" + crypto.randomUUID();
}

// ── Local owner identity (no login needed) ──
const LOCAL_USER = {
  id: "local-owner",
  email: "owner@localhost",
  username: "owner",
  displayName: "Owner",
  role: "owner",
};

function localToken(): string {
  return jwt.sign(
    { userId: LOCAL_USER.id, email: LOCAL_USER.email, role: LOCAL_USER.role },
    process.env.JWT_SECRET!,
    { expiresIn: "365d" }
  );
}

const TOKEN = localToken();

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow localhost
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (_req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

// ── Local mode prompt injection ──
function getLocalPrompt(agentId: string): string {
  const base = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.opus;
  const localAddendum = `

## LOCAL MODE — Enhanced Capabilities
You are running in LOCAL MODE on the user's machine. This gives you additional powers:

- You have DIRECT ACCESS to the local filesystem at: ${getWorkspaceRoot()}
- You can read, write, and modify any file on disk
- You can run ANY shell command: git, npm, node, python, etc.
- You can push to GitHub directly using git push
- You can install packages, run builds, execute tests
- No credit limits, no rate limits — unlimited usage
- The terminal in the IDE is a real local shell

When reading/writing files, paths can be relative to the workspace root or absolute (e.g., "D:/hydrocore/index.html").
`;
  return base + localAddendum;
}

// ── Auth routes (simplified for local) ──
app.post("/api/agent/auth/login", (_req, res) => {
  res.json({
    success: true,
    token: TOKEN,
    user: LOCAL_USER,
  });
});

app.post("/api/agent/auth/register", (_req, res) => {
  res.json({ success: true, token: TOKEN, user: LOCAL_USER });
});

app.post("/api/agent/auth/firebase", (_req, res) => {
  res.json({ success: true, token: TOKEN, user: LOCAL_USER });
});

app.get("/api/agent/auth/me", (_req, res) => {
  res.json({
    ...LOCAL_USER,
    credits: 999999,
    subscription_tier: "unlimited",
    tier: "ENTERPRISE",
  });
});

// ── Credits (unlimited in local) ──
app.get("/api/agent/credits/balance", (_req, res) => {
  res.json({ credits: 999999, totalPurchased: 0, totalUsed: 0 });
});

app.get("/api/agent/credits/transactions", (_req, res) => {
  res.json([]);
});

// ── Agent definitions ──
app.get("/api/agent/agents", (_req, res) => {
  // Seed agents on first request
  for (const seed of AGENT_SEEDS) {
    localDb.upsertAgent({
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
    });
  }
  res.json(AGENT_SEEDS.map(s => ({
    ...s,
    isActive: true,
  })));
});

// ── Conversations ──
app.get("/api/agent/conversations", (_req, res) => {
  const convos = localDb.getConversations(LOCAL_USER.id);
  res.json(convos);
});

app.post("/api/agent/conversations", (req, res) => {
  const { title, agentId, model } = req.body;
  const convo = localDb.createConversation(
    LOCAL_USER.id,
    title || "New conversation",
    agentId || "opus",
    model || "claude-opus-4-7"
  );
  res.json(convo);
});

app.get("/api/agent/conversations/:id", (req, res) => {
  const convo = localDb.getConversation(req.params.id, LOCAL_USER.id);
  if (!convo) { res.status(404).json({ error: "Not found" }); return; }
  const messages = localDb.getMessages(req.params.id);
  res.json({ ...convo, messages });
});

app.delete("/api/agent/conversations/:id", (req, res) => {
  localDb.deleteConversation(req.params.id, LOCAL_USER.id);
  res.json({ success: true });
});

app.patch("/api/agent/conversations/:id", (req, res) => {
  localDb.updateConversation(req.params.id, LOCAL_USER.id, req.body);
  res.json({ success: true });
});

// ── Chat with SSE streaming (the core agent loop) ──
app.post("/api/agent/chat", async (req, res) => {
  const { conversationId, message, agentId, contextFiles } = req.body;

  if (!conversationId || !message) {
    res.status(400).json({ error: "conversationId and message required" });
    return;
  }

  // Get agent config
  const agent = AGENT_SEEDS.find(s => s.id === agentId) || AGENT_SEEDS[0];
  const systemPrompt = getLocalPrompt(agent.id);

  // Save user message
  localDb.addMessage(conversationId, "user", message);

  // Build message history
  const history = localDb.getMessages(conversationId);
  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  // Add context files if provided
  if (contextFiles?.length) {
    const contextContent = contextFiles.map((f: string) => {
      try {
        const content = require("fs").readFileSync(f, "utf-8");
        return `<file path="${f}">\n${content}\n</file>`;
      } catch {
        return `<file path="${f}">[Error reading file]</file>`;
      }
    }).join("\n\n");
    chatMessages.splice(1, 0, {
      role: "user",
      content: `Here are the current workspace files for context:\n\n${contextContent}`,
    });
  }

  // Choose tools based on provider
  const tools = agent.provider === "anthropic" ? LOCAL_ANTHROPIC_TOOLS : LOCAL_OPENAI_TOOLS;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    let fullResponse = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Agentic loop — keep going until the model stops using tools
    let loopCount = 0;
    const MAX_LOOPS = 15;

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const stream = await getProviderStream(
        agent.provider,
        agent.model,
        chatMessages,
        tools,
        agent.maxTokens,
        parseFloat(agent.temperature)
      );

      let chunkResponse = "";
      let toolCalls: any[] = [];

      for await (const event of stream) {
        if (event.type === "text") {
          chunkResponse += event.text;
          res.write(`data: ${JSON.stringify({ type: "text", text: event.text })}\n\n`);
        } else if (event.type === "tool_use") {
          toolCalls.push(event);
        } else if (event.type === "usage") {
          totalInputTokens += event.inputTokens || 0;
          totalOutputTokens += event.outputTokens || 0;
        }
      }

      if (toolCalls.length === 0) {
        // No tools used — model is done
        fullResponse += chunkResponse;
        break;
      }

      // Execute tools and continue
      chatMessages.push({ role: "assistant", content: chunkResponse, toolCalls });

      for (const tool of toolCalls) {
        res.write(`data: ${JSON.stringify({
          type: "tool_use",
          name: tool.name,
          input: tool.input,
        })}\n\n`);

        const result = await executeLocalTool(tool.name, tool.input);

        res.write(`data: ${JSON.stringify({
          type: "tool_result",
          name: tool.name,
          result: result.slice(0, 2000),
        })}\n\n`);

        chatMessages.push({
          role: "tool",
          content: result,
          toolCallId: tool.id,
        } as any);
      }

      fullResponse += chunkResponse;
    }

    // Save assistant response
    if (fullResponse.trim()) {
      localDb.addMessage(
        conversationId, "assistant", fullResponse,
        agent.model, totalInputTokens, totalOutputTokens
      );
    }

    // Auto-title if first exchange
    const msgCount = localDb.getMessages(conversationId).length;
    if (msgCount <= 2) {
      const title = message.slice(0, 80) + (message.length > 80 ? "..." : "");
      localDb.updateConversation(conversationId, LOCAL_USER.id, { title });
    }

    res.write(`data: ${JSON.stringify({ type: "done", usage: { input: totalInputTokens, output: totalOutputTokens } })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error("[Local Chat Error]", err);
    res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
    res.end();
  }
});

// ── Workspace routes (real filesystem) ──
app.use("/api/workspace", localWorkspaceRoutes);

// ── Health ──
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: "LOCAL",
    service: "axiom-studio-local",
    version: "2.0.0-local",
    workspaceRoot: getWorkspaceRoot(),
    timestamp: new Date().toISOString(),
  });
});

// ── Notification stubs (local mode doesn't need push notifications) ──
app.get("/api/agent/notifications", (_req, res) => res.json([]));
app.post("/api/agent/notifications/:id/read", (_req, res) => res.json({ success: true }));
app.post("/api/agent/notifications/read-all", (_req, res) => res.json({ success: true }));

// ── Billing stubs (unlimited in local) ──
app.post("/api/stripe/create-checkout-session", (_req, res) => res.json({ message: "Local mode — no billing needed" }));
app.get("/api/stripe/subscription-status", (_req, res) => res.json({ active: true, tier: "ENTERPRISE" }));

// ── Analytics stubs ──
app.get("/api/analytics/usage", (_req, res) => res.json({ total: 0, byAgent: {} }));
app.get("/api/analytics/costs", (_req, res) => res.json({ total: 0 }));

// ── Serve frontend ──
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const publicDir = path.resolve(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "../vite.config.ts"),
      server: { middlewareMode: true },
      root: path.resolve(__dirname, "../client"),
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || "5100");
  const server = app.listen(PORT, async () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   AXIOM STUDIO IDE — LOCAL MODE          ║`);
    console.log(`  ║   DarkWave Studios LLC                    ║`);
    console.log(`  ║   http://localhost:${PORT}                   ║`);
    console.log(`  ║                                            ║`);
    console.log(`  ║   Workspace: ${getWorkspaceRoot().padEnd(27)}║`);
    console.log(`  ║   Mode: FULL LOCAL ACCESS                  ║`);
    console.log(`  ║   Auth: Owner (auto)                       ║`);
    console.log(`  ║   Credits: Unlimited                       ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);

    // Auto-open browser
    try {
      const { default: openBrowser } = await import("open");
      openBrowser(`http://localhost:${PORT}`);
    } catch {
      console.log(`  → Open http://localhost:${PORT} in your browser`);
    }
  });

  // Attach terminal WebSocket
  setupTerminalWebSocket(server);
}

startServer();
