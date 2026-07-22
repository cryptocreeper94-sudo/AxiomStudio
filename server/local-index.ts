/**
 * Axiom Studio — Local Mode Server
 * Runs on your machine with direct filesystem access.
 * 
 * Two modes:
 * - OWNER MODE: You have API keys in .env → unlimited, no cloud needed
 * - TENANT MODE: Users login to axiomstudio.dev → keys fetched, credits billed
 *
 * Usage: npm run local          (owner mode, reads .env)
 *        npx axiom-studio       (tenant mode, login required)
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { classifyMessage, ROUTE_MODELS } from "./auto-router.js";
import { localDb } from "./local-db.js";
import { LOCAL_ANTHROPIC_TOOLS, LOCAL_OPENAI_TOOLS, executeLocalTool, getWorkspaceRoot } from "./local-tools.js";
import localWorkspaceRoutes from "./local-workspace-routes.js";
import exportRoutes from "./export-routes.js";
import depotRoutes from "./depot-routes.js";
import { AGENT_PROMPTS, AGENT_SEEDS } from "./agent-prompts.js";
import { setupTerminalWebSocket } from "./pty.js";
import {
  loadAuth, saveAuth, promptLogin, validateToken,
  fetchApiKeys, checkCredits, deductCredits
} from "./proxy-auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Set local mode flag ──
process.env.AXIOM_LOCAL = "true";

// ── Generate a local JWT secret if not set ──
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "axiom-local-" + crypto.randomUUID();
}

// ── Determine mode ──
const HAS_OWN_KEYS = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
// ⚠️  DISTRIBUTION NOTE: Remove the override below before public release.
// In public builds, IS_OWNER_MODE should be derived from HAS_OWN_KEYS.
const IS_OWNER_MODE = true; // TEMPORARY — owner personal build only

// ── API key cache (for tenant mode) ──
let cachedKeys: { anthropic: string | null; openai: string | null; expires: number } | null = null;
let cloudToken: string | null = null;

// ── Local user identity ──
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

// ── Initialize auth for tenant mode ──
async function initAuth(): Promise<boolean> {
  // Try saved token first
  const saved = loadAuth();
  if (saved?.token) {
    const validation = await validateToken(saved.token);
    if (validation.valid) {
      cloudToken = saved.token;
      LOCAL_USER.email = saved.email;
      LOCAL_USER.id = saved.userId;
      console.log(`  ✓ Authenticated as ${saved.email}`);

      // Fetch API keys
      const keys = await fetchApiKeys(saved.token);
      if (keys) {
        cachedKeys = keys;
        if (keys.anthropic) process.env.ANTHROPIC_API_KEY = keys.anthropic;
        if (keys.openai) process.env.OPENAI_API_KEY = keys.openai;
        if (keys.gemini) process.env.GEMINI_API_KEY = keys.gemini;
        console.log("  ✓ API keys loaded from cloud");
      }
      return true;
    }
  }

  if (IS_OWNER_MODE || process.env.IS_ELECTRON) return true;

  // Interactive login
  const auth = await promptLogin();
  if (!auth) return false;

  cloudToken = auth.token;
  LOCAL_USER.email = auth.email;
  LOCAL_USER.id = auth.userId;

  // Fetch API keys
  const keys = await fetchApiKeys(auth.token);
  if (keys) {
    cachedKeys = keys;
    if (keys.anthropic) process.env.ANTHROPIC_API_KEY = keys.anthropic;
    if (keys.openai) process.env.OPENAI_API_KEY = keys.openai;
    if (keys.gemini) process.env.GEMINI_API_KEY = keys.gemini;
    console.log("  ✓ API keys loaded from cloud");
  }

  return true;
}

// ── Refresh keys if expired ──
async function ensureKeys(): Promise<boolean> {
  if (cachedKeys && Date.now() < cachedKeys.expires) return true;

  if (!cloudToken) {
    if (IS_OWNER_MODE) return true;
    return false;
  }
  const keys = await fetchApiKeys(cloudToken);
  if (!keys) return false;

  cachedKeys = keys;
  if (keys.anthropic) process.env.ANTHROPIC_API_KEY = keys.anthropic;
  if (keys.openai) process.env.OPENAI_API_KEY = keys.openai;
  if (keys.gemini) process.env.GEMINI_API_KEY = keys.gemini;
  return true;
}

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'local', timestamp: Date.now() });
});

// ── Local mode prompt injection ──
function getLocalPrompt(agentId: string): string {
  const base = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.opus;
  const localAddendum = `

## LOCAL MODE — Enhanced Capabilities
You are running in LOCAL MODE on the user's machine. This gives you full system access.

**Workspace root**: ${getWorkspaceRoot()}

### File Operations — Best Practices
- **Use \`view_file\` with line ranges** to read specific sections. Don't read entire large files.
- **Use \`edit_file\` for surgical edits** — provide exact \`target_content\` and \`replacement_content\`. This is FAR more efficient than \`write_file\` for small changes.
- **Only use \`write_file\` for new files** or when you need to rewrite most of the content.
- **Use \`grep_search\` to find patterns** across codebases before editing. Supports regex, glob filters, and returns line numbers.
- Paths can be relative to workspace root or absolute (e.g., "D:/myproject/index.html").

### Terminal & Background Tasks
- **\`run_command\`**: For short commands (builds, git, npm). 120-second timeout.
- **\`start_background\`**: For long-running processes — dev servers, daemons, watchers. Returns a task ID.
- **\`task_status\`**: Check output and status of background tasks.
- **\`send_input\`**: Send stdin to interactive background processes.
- **\`kill_task\`**: Stop a background task.
- **\`list_tasks\`**: See all active background tasks.
- Use \`start_background\` for anything that runs indefinitely (servers, file watchers, etc.)

### Structured Work Pattern
For complex tasks, follow this pattern:
1. **Research**: Use \`view_file\`, \`grep_search\`, \`list_directory\` to understand the codebase
2. **Plan**: Describe your approach before making changes
3. **Edit**: Use \`edit_file\` for surgical changes, \`write_file\` for new files
4. **Verify**: Run tests, builds, or check output to confirm changes work
5. **Report**: Summarize what was done and any remaining items

### Important Rules
- Always preserve existing code comments and documentation unless explicitly asked to change them.
- When making multiple non-adjacent edits to the same file, make separate \`edit_file\` calls.
- If \`edit_file\` fails because target_content isn't unique, include more surrounding context.
- For web development, use modern design patterns — dark themes, gradients, micro-animations.
- Keep responses concise but thorough. Don't over-explain simple operations.
`;
  return base + localAddendum;
}

// ── Auth routes (simplified for local) ──
app.post("/api/agent/auth/login", (_req, res) => {
  res.json({ success: true, token: TOKEN, user: LOCAL_USER });
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
    credits: IS_OWNER_MODE ? 999999 : undefined,
    subscription_tier: IS_OWNER_MODE ? "unlimited" : undefined,
    tier: IS_OWNER_MODE ? "ENTERPRISE" : undefined,
  });
});

// ── Credits ──
app.get("/api/agent/credits/balance", async (_req, res) => {
  if (IS_OWNER_MODE) {
    res.json({ credits: 999999, totalPurchased: 0, totalUsed: 0 });
  } else if (cloudToken) {
    const check = await checkCredits(cloudToken, "opus");
    res.json({ credits: check.balance, totalPurchased: 0, totalUsed: 0 });
  } else {
    res.json({ credits: 0 });
  }
});
app.get("/api/agent/credits/transactions", (_req, res) => res.json([]));

// ── Credits (matches cloud endpoint path used by client api.ts) ──
app.get("/api/agent/credits", async (_req, res) => {
  if (IS_OWNER_MODE) {
    res.json({ credits: 999999, totalPurchased: 0, totalUsed: 0, agentCosts: {} });
  } else if (cloudToken) {
    const check = await checkCredits(cloudToken, "opus");
    res.json({ credits: check.balance, totalPurchased: 0, totalUsed: 0, agentCosts: {} });
  } else {
    res.json({ credits: 0, totalPurchased: 0, totalUsed: 0, agentCosts: {} });
  }
});

// ── Subscription stub (used by ProfileDashboard) ──
app.get("/api/agent/subscription", (_req, res) => {
  res.json({
    model: "payg",
    credits: IS_OWNER_MODE ? 999999 : 0,
    tierName: IS_OWNER_MODE ? "Owner" : "Local",
    tier: IS_OWNER_MODE ? "enterprise" : "free",
    agentCosts: {},
  });
});

// ── Agent definitions (both paths: client uses /models, legacy uses /agents) ──
const handleAgentsRequest = (_req: any, res: any) => {
  for (const seed of AGENT_SEEDS) {
    localDb.upsertAgent({
      id: seed.id, name: seed.name, description: seed.description,
      model: seed.model, provider: seed.provider,
      systemPrompt: AGENT_PROMPTS[seed.id] || "",
      maxTokens: seed.maxTokens, temperature: seed.temperature,
      creditCost: seed.creditCost, icon: seed.icon, color: seed.color,
    });
  }
  res.json(AGENT_SEEDS.map(s => ({ ...s, isActive: true })));
};
app.get("/api/agent/agents", handleAgentsRequest);
app.get("/api/agent/models", handleAgentsRequest);

// ── Conversations ──
app.get("/api/agent/conversations", (_req, res) => {
  res.json(localDb.getConversations(LOCAL_USER.id));
});
app.post("/api/agent/conversations", (req, res) => {
  const { title, agentId, model } = req.body;
  res.json(localDb.createConversation(LOCAL_USER.id, title || "New conversation", agentId || "opus", model || "claude-opus-4-7"));
});
app.get("/api/agent/conversations/:id", (req, res) => {
  const convo = localDb.getConversation(req.params.id, LOCAL_USER.id);
  if (!convo) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...convo, messages: localDb.getMessages(req.params.id) });
});
app.delete("/api/agent/conversations/:id", (req, res) => {
  localDb.deleteConversation(req.params.id, LOCAL_USER.id);
  res.json({ success: true });
});
app.patch("/api/agent/conversations/:id", (req, res) => {
  const updates = { ...req.body };
  if (updates.activeStarter !== undefined) {
    updates.active_starter = updates.activeStarter ? JSON.stringify(updates.activeStarter) : null;
    delete updates.activeStarter;
  }
  if (updates.checklist !== undefined) {
    updates.checklist = updates.checklist ? JSON.stringify(updates.checklist) : null;
  }
  if (updates.lastOpenFile !== undefined) {
    updates.last_open_file = updates.lastOpenFile || null;
    delete updates.lastOpenFile;
  }
  if (updates.workspacePath !== undefined) {
    updates.workspace_path = updates.workspacePath || null;
    delete updates.workspacePath;
  }
  localDb.updateConversation(req.params.id, LOCAL_USER.id, updates);
  res.json({ success: true });
});

// ── Chat with SSE streaming (the core agent loop) ──
app.post("/api/agent/chat", async (req, res) => {
  const { conversationId, message, agentId, contextFiles } = req.body;
  if (!conversationId || !message) {
    res.status(400).json({ error: "conversationId and message required" });
    return;
  }

  let agent = AGENT_SEEDS.find(s => s.id === agentId);
  let routeDecision: any = null;

  if (agentId === "auto") {
    // FORCE ALL AUTO-ROUTING TO CLAUDE TO BYPASS DRAINED OPENAI/GEMINI KEYS
    agent = AGENT_SEEDS.find(s => s.id === "opus");
  }
  if (!agent) agent = AGENT_SEEDS[0];
  
  // FORCE ALL AGENTS TO USE ANTHROPIC TO PREVENT CRASHES
  if (agent.provider !== "anthropic") {
      agent = AGENT_SEEDS.find(s => s.id === "opus") || agent;
  }

  // Credit check for tenant mode
  if (!IS_OWNER_MODE && cloudToken) {
    const creditCheck = await checkCredits(cloudToken, agent.id);
    if (!creditCheck.approved) {
      res.status(402).json({ error: "Insufficient credits. Purchase at axiomstudio.dev" });
      return;
    }
  }

  // Ensure API keys are fresh
  if (!(await ensureKeys())) {
    res.status(503).json({ error: "Unable to load API keys. Please restart and login." });
    return;
  }

  const systemPrompt = getLocalPrompt(agent.id);
  localDb.addMessage(conversationId, "user", message);

  const history = localDb.getMessages(conversationId);
  const chatMessages: any[] = history.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Add context files if provided
  if (contextFiles?.length) {
    const contextContent = contextFiles.map((f: string) => {
      try {
        return `<file path="${f}">\n${readFileSync(f, "utf-8")}\n</file>`;
      } catch {
        return `<file path="${f}">[Error reading file]</file>`;
      }
    }).join("\n\n");
    chatMessages.unshift({
      role: "user",
      content: `Here are the current workspace files for context:\n\n${contextContent}`,
    });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (routeDecision) {
    res.write(`data: ${JSON.stringify({ type: "route", ...routeDecision })}\n\n`);
  }

  try {
    const controller = new AbortController();
    req.on("close", () => controller.abort());

    let fullResponse = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    if (agent.provider === "anthropic") {
      // ── Anthropic agentic loop with local tools ──
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      let convoMessages: Anthropic.MessageParam[] = chatMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      for (let i = 0; i < 100; i++) {
        const stream = anthropic.messages.stream({
          model: agent.model,
          max_tokens: agent.maxTokens,
          temperature: parseFloat(agent.temperature),
          system: systemPrompt,
          messages: convoMessages,
          tools: LOCAL_ANTHROPIC_TOOLS,
          tool_choice: { type: "auto" },
        }, { signal: controller.signal });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
            res.write(`data: ${JSON.stringify({ type: "text", content: event.delta.text })}\n\n`);
          }
        }

        let finalMsg: Anthropic.Message;
        try {
          finalMsg = await stream.finalMessage();
        } catch (e: any) {
          console.warn("[Local Anthropic] finalMessage() failed:", e.message);
          res.write(`data: ${JSON.stringify({ type: "error", error: e.message || "Anthropic API error" })}\n\n`);
          break;
        }

        totalInputTokens += finalMsg.usage.input_tokens;
        totalOutputTokens += finalMsg.usage.output_tokens;

        if (finalMsg.stop_reason !== "tool_use") break;

        const toolBlocks = finalMsg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        if (!toolBlocks.length) break;

        convoMessages.push({ role: "assistant", content: finalMsg.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const tool of toolBlocks) {
          const args = tool.input as Record<string, any>;
          res.write(`data: ${JSON.stringify({ type: "tool_call", tool: tool.name, args })}\n\n`);
          const result = await executeLocalTool(tool.name, args, conversationId);
          res.write(`data: ${JSON.stringify({ type: "tool_result", tool: tool.name, result: result.slice(0, 2000) })}\n\n`);
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result });
        }

        convoMessages.push({ role: "user", content: toolResults });
      }
    } else {
      // ── OpenAI agentic loop with local tools ──
      const isGoogle = agent.provider === "google";
      const openai = new OpenAI({ 
        apiKey: isGoogle ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY,
        baseURL: isGoogle ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined
      });
      let convoMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...chatMessages,
      ];

      for (let i = 0; i < 100; i++) {
        const stream = await openai.chat.completions.create({
          model: agent.model,
          messages: convoMessages,
          max_tokens: agent.maxTokens,
          temperature: parseFloat(agent.temperature),
          tools: LOCAL_OPENAI_TOOLS,
          tool_choice: "auto",
          stream: true,
          stream_options: { include_usage: true },
        }, { signal: controller.signal });

        let chunkText = "";
        let toolCallsMap: Record<string, { name: string; arguments: string }> = {};
        let finishReason: string | null = null;

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta;
          const fr = chunk.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
          if (delta?.content) {
            chunkText += delta.content;
            fullResponse += delta.content;
            res.write(`data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`);
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = String(tc.index ?? 0);
              if (!toolCallsMap[idx]) toolCallsMap[idx] = { name: tc.function?.name ?? "", arguments: "" };
              if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
            }
          }
          if (chunk.usage) {
            totalInputTokens += chunk.usage.prompt_tokens ?? 0;
            totalOutputTokens += chunk.usage.completion_tokens ?? 0;
          }
        }

        if (finishReason !== "tool_calls") break;

        convoMessages.push({
          role: "assistant", content: chunkText || "",
          tool_calls: Object.entries(toolCallsMap).map(([idx, tc]) => ({
            id: `call_${idx}`, type: "function", function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        for (const [idx, tc] of Object.entries(toolCallsMap)) {
          const args = (() => { try { return JSON.parse(tc.arguments); } catch { return {}; } })();
          res.write(`data: ${JSON.stringify({ type: "tool_call", tool: tc.name, args })}\n\n`);
          const result = await executeLocalTool(tc.name, args, conversationId);
          res.write(`data: ${JSON.stringify({ type: "tool_result", tool: tc.name, result: result.slice(0, 2000) })}\n\n`);
          convoMessages.push({ role: "tool", content: result, tool_call_id: `call_${idx}`, name: tc.name });
        }
      }
    }

    // Save response
    if (fullResponse.trim()) {
      localDb.addMessage(conversationId, "assistant", fullResponse, agent.model, totalInputTokens, totalOutputTokens);
    }

    // Deduct credits for tenant mode
    if (!IS_OWNER_MODE && cloudToken) {
      await deductCredits(cloudToken, agent.id, `Chat: ${message.slice(0, 60)}`);
    }

    // Auto-title
    const msgCount = localDb.getMessages(conversationId).length;
    if (msgCount <= 2) {
      localDb.updateConversation(conversationId, LOCAL_USER.id, { title: message.slice(0, 80) + (message.length > 80 ? "..." : "") });
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
app.use("/api/workspace/export", exportRoutes);
app.use("/api/depot", depotRoutes);

// ── Health ──
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok", mode: IS_OWNER_MODE ? "OWNER" : "TENANT",
    service: "axiom-studio-local", version: "3.0.0-local",
    workspaceRoot: getWorkspaceRoot(), timestamp: new Date().toISOString(),
  });
});

// ── Stubs ──
app.get("/api/agent/notifications", (_req, res) => res.json([]));
app.post("/api/agent/notifications/:id/read", (_req, res) => res.json({ success: true }));
app.post("/api/agent/notifications/read-all", (_req, res) => res.json({ success: true }));
app.post("/api/stripe/create-checkout-session", (_req, res) => res.json({ message: "Purchase credits at axiomstudio.dev" }));
app.get("/api/stripe/subscription-status", (_req, res) => res.json({ active: true, tier: IS_OWNER_MODE ? "ENTERPRISE" : "local" }));
app.get("/api/analytics/usage", (_req, res) => res.json({ total: 0, byAgent: {} }));
app.get("/api/analytics/costs", (_req, res) => res.json({ total: 0 }));

// ── Serve frontend ──
async function startServer() {
  // In Electron local mode, cloud infrastructure env vars aren't needed
  // (no Stripe, no Firebase auth, no remote DB — uses local-db.ts / SQLite)
  if (!process.env.IS_ELECTRON && !IS_OWNER_MODE) {
    const REQUIRED_ENV = [
      "JWT_SECRET", "DATABASE_URL", "ANTHROPIC_API_KEY", "OPENAI_API_KEY",
      "FIREBASE_SERVICE_ACCOUNT", "APP_URL", "NODE_ENV", "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_STARTER", "STRIPE_PRICE_BUILDER",
      "STRIPE_PRICE_POWER", "STRIPE_PRICE_STUDIO", "WORKSPACE_ROOT"
    ];
    const missing = REQUIRED_ENV.filter(key => !process.env[key]);
    if (missing.length > 0) {
      console.error(`\n  [CRITICAL ERROR] Missing required environment variables: \n  ${missing.join(', ')}\n\n  Please configure your local .env file before starting the local engine.\n`);
      process.exit(1);
    }
  }

  // Auth init for tenant mode (skip in Electron — no terminal for interactive login)
  const authed = await initAuth();
  if (!authed) {
    console.error("\n  ✗ Authentication failed. Cannot start.\n");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" || process.env.IS_ELECTRON) {
    let publicDir = path.resolve(__dirname, "../public");
    // Inside asar, Node's fs can read directly — only use unpacked if it exists
    if (publicDir.includes("app.asar")) {
      const unpackedDir = publicDir.replace("app.asar", "app.asar.unpacked");
      if (fs.existsSync(unpackedDir)) {
        publicDir = unpackedDir;
      }
      // else: leave as-is, Node can serve from inside asar
    }
    app.use(express.static(publicDir));
    app.get(/.*/, (_req, res) => {
      try {
        const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
        res.send(html);
      } catch (err) {
        res.status(500).send("Error loading app shell: " + err);
      }
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
    const mode = IS_OWNER_MODE ? "OWNER (unlimited)" : `TENANT (${LOCAL_USER.email})`;
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   AXIOM STUDIO IDE — LOCAL MODE          ║`);
    console.log(`  ║   DarkWave Studios LLC                    ║`);
    console.log(`  ║   http://localhost:${PORT}                   ║`);
    console.log(`  ║                                            ║`);
    console.log(`  ║   Workspace: ${getWorkspaceRoot().padEnd(27)}║`);
    console.log(`  ║   Mode: ${mode.padEnd(33)}║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);

    if (!process.env.IS_ELECTRON) {
      try {
        const { default: openBrowser } = await import("open");
        openBrowser(`http://localhost:${PORT}`);
      } catch {
        console.log(`  → Open http://localhost:${PORT} in your browser`);
      }
    } else {
      console.log(`  → Electron app started.`);
    }
  });

  setupTerminalWebSocket(server);
}

startServer();
