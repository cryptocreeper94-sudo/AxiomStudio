/**
 * Axiom Studio — Server Entry Point
 * Express server with agent API routes.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { registerAgentRoutes } from "./agent-routes.js";
import { registerStripeRoutes } from "./stripe-routes.js";
import { registerCoinbaseRoutes } from "./coinbase-routes.js";
import notificationRoutes from "./notification-routes.js";
import analyticsRoutes from "./analytics-routes.js";
import workspaceRoutes from "./workspace-routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust proxy for Render (required for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS + COOP (allow Firebase OAuth popups to communicate back)
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  // Firebase OAuth uses popups — COOP must allow them to post back
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (_req.method === "OPTIONS") { res.sendStatus(200); return; }
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
// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "axiom-studio",
    version: "2.0.0",
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
      res.sendFile(path.join(publicDir, "index.html"));
    });
  } else {
    // Development: use Vite dev middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      root: path.resolve(__dirname, "../client"),
      appType: "spa",
      optimizeDeps: {
        noDiscovery: true,
        include: [],
      },
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || "5100");
  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║     AXIOM STUDIO IDE — v2.0.0        ║`);
    console.log(`  ║     DarkWave Studios LLC              ║`);
    console.log(`  ║     http://localhost:${PORT}             ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
  });
}

startServer();
