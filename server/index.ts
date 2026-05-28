/**
 * Axiom Studio — Server Entry Point
 * Express server with agent API routes.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { registerAgentRoutes } from "./agent-routes.js";
import { registerStripeRoutes } from "./stripe-routes.js";
import { registerCoinbaseRoutes } from "./coinbase-routes.js";
import notificationRoutes from "./notification-routes.js";
import analyticsRoutes from "./analytics-routes.js";
import workspaceRoutes from "./workspace-routes.js";
import depotRoutes from "./depot-routes.js";
import waitlistRoutes from "./waitlist-routes.js";
import historyRoutes from "./history-routes.js";
import { setupTerminalWebSocket } from "./pty.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Security: Enforce JWT_SECRET on boot
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is missing.");
  console.error("The application cannot start without a secure JWT secret.");
  process.exit(1);
}

const app = express();

// Trust proxy for Render (required for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS + COOP (allow Firebase OAuth popups to communicate back)
const ALLOWED_ORIGINS = [
  "https://axiomstudio.dev",
  "https://axiom-studio.app",
  "http://localhost:5100",
  "http://localhost:5101",
  "http://localhost:5173",
  process.env.APP_URL,
].filter(Boolean) as string[];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow non-browser clients (like curl or postman during dev if needed)
    // but default to APP_URL for credentials
    res.header("Access-Control-Allow-Origin", process.env.APP_URL || "http://localhost:5173");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  // Firebase OAuth uses popups — COOP must allow them to post back
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

// ── Rate Limiting ───────────────────────────────────────────────────
// Auth: strict — 5 login attempts per 15 minutes per IP
app.use("/api/agent/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many auth attempts. Try again in 15 minutes." },
}));

// Chat: moderate — 30 messages per minute per IP (covers streaming hold time)
app.use("/api/agent/chat", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Slow down — 30 messages per minute max." },
}));

// Workspace exec: strict — prevent command flooding
app.use("/api/workspace/exec", rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many commands. Wait a moment." },
}));

// General API: baseline — 200 req/min per IP
app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Please slow down." },
}));

console.log("[Axiom Studio] Rate limiting enabled (auth: 20/15m, chat: 30/m, api: 200/m)");

// Register API routes
registerAgentRoutes(app);
registerStripeRoutes(app);
registerCoinbaseRoutes(app);
app.use("/api/agent", notificationRoutes);
console.log("[Axiom Studio] Notification routes registered");
app.use("/api/analytics", analyticsRoutes);
console.log("[Axiom Studio] Analytics routes registered");
app.use("/api/workspace", workspaceRoutes);
console.log("[Axiom Studio] Workspace FS routes registered");
app.use("/api/depot", depotRoutes);
console.log("[Axiom Studio] Depot routes registered");
app.use("/api/waitlist", waitlistRoutes);
console.log("[Axiom Studio] Waitlist routes registered");
app.use("/api/history", historyRoutes);
console.log("[Axiom Studio] File history routes registered");
// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "axiom-studio",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    // Production: serve pre-built static files
    const publicDir = path.resolve(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("/{*splat}", (_req, res) => {
      try {
        const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
        res.send(html);
      } catch (err) {
        res.status(500).send("Error loading app shell: " + err);
      }
    });
  } else {
    // Development: use Vite dev middleware
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
  const server = app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║     AXIOM STUDIO IDE — v3.0.0        ║`);
    console.log(`  ║     DarkWave Studios LLC              ║`);
    console.log(`  ║     http://localhost:${PORT}             ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
  });

  // Attach WebSocket server for terminal
  setupTerminalWebSocket(server);
}

startServer();
