/**
 * Axiom Studio — Coinbase Commerce Routes
 * Crypto payments for tier upgrades.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import type { Express, Request, Response } from "express";
import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { TIERS } from "./tiers.js";

const COINBASE_API = "https://api.commerce.coinbase.com";
const API_VERSION = "2018-03-22";

const coinbaseKey = process.env.COINBASE_COMMERCE_API_KEY;
const coinbaseWebhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

function extractUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET as string) as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

export function registerCoinbaseRoutes(app: Express): void {
  if (!coinbaseKey) {
    console.log("[Axiom Studio] Coinbase Commerce disabled (no API key)");
    return;
  }

  // ── Coming Soon flag — flip to false when Coinbase webhooks are configured ──
  const CRYPTO_COMING_SOON = true;

  // ── Create crypto checkout for tier upgrade ─────────────────────────
  app.post("/api/agent/subscribe/crypto", async (req: Request, res: Response) => {
    if (CRYPTO_COMING_SOON) {
      res.json({ comingSoon: true, message: "Crypto payments coming soon. Use card checkout for now." });
      return;
    }

    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Auth required" }); return; }

    const { tierId } = req.body;
    const tier = TIERS[tierId];

    if (!tier || tier.price === 0) {
      res.status(400).json({ error: "Invalid tier for crypto checkout" });
      return;
    }

    try {
      const response = await fetch(`${COINBASE_API}/charges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CC-Api-Key": coinbaseKey,
          "X-CC-Version": API_VERSION,
        },
        body: JSON.stringify({
          name: `Axiom Studio ${tier.name}`,
          description: `Axiom Studio — ${tier.name} tier subscription (DarkWave Studios LLC)`,
          pricing_type: "fixed_price",
          local_price: {
            amount: (tier.price / 100).toFixed(2),
            currency: "USD",
          },
          redirect_url: `${process.env.APP_URL || "https://axiomstudio.dev"}/billing?success=true&method=crypto`,
          cancel_url: `${process.env.APP_URL || "https://axiomstudio.dev"}/billing?canceled=true`,
          metadata: {
            type: "axiom_studio_subscription",
            userId,
            tierId,
            platform: "axiomstudio",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[Coinbase] Charge error:", error);
        res.status(500).json({ error: "Failed to create crypto checkout" });
        return;
      }

      const data = await response.json() as any;
      res.json({
        chargeId: data.data.id,
        hostedUrl: data.data.hosted_url,
        expiresAt: data.data.expires_at,
      });
    } catch (err: any) {
      console.error("[Coinbase] Checkout error:", err.message);
      res.status(500).json({ error: "Failed to create crypto checkout" });
    }
  });

  // ── Check charge status ─────────────────────────────────────────────
  app.get("/api/agent/crypto/status/:chargeId", async (req: Request, res: Response) => {
    try {
      const response = await fetch(`${COINBASE_API}/charges/${req.params.chargeId}`, {
        headers: {
          "X-CC-Api-Key": coinbaseKey,
          "X-CC-Version": API_VERSION,
        },
      });

      if (!response.ok) {
        res.status(404).json({ error: "Charge not found" });
        return;
      }

      const data = await response.json() as any;
      const timeline = data.data.timeline || [];
      const latestStatus = timeline[timeline.length - 1]?.status || "NEW";

      res.json({
        id: data.data.id,
        status: latestStatus,
        confirmedAt: data.data.confirmed_at,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Coinbase webhook ────────────────────────────────────────────────
  app.post("/api/agent/webhook/coinbase", async (req: Request, res: Response) => {
    const sig = req.headers["x-cc-webhook-signature"] as string;

    if (!sig || !coinbaseWebhookSecret) {
      res.status(400).json({ error: "Missing signature or webhook secret" });
      return;
    }

    try {
      // Verify signature
      const rawBody = typeof (req as any).rawBody === "string"
        ? (req as any).rawBody
        : JSON.stringify(req.body);

      const computedSig = createHmac("sha256", coinbaseWebhookSecret)
        .update(rawBody)
        .digest("hex");

      if (computedSig !== sig) {
        console.error("[Coinbase] Webhook signature mismatch");
        res.status(400).json({ error: "Invalid signature" });
        return;
      }

      const event = typeof rawBody === "string" ? JSON.parse(rawBody) : req.body;
      const eventType = event.event?.type;
      const data = event.event?.data;
      const metadata = data?.metadata || {};

      console.log(`[Coinbase] Webhook: ${eventType}`);

      if (eventType === "charge:confirmed" && metadata.userId && metadata.tierId) {
        // Upgrade user tier
        await db.execute(sql`
          UPDATE chat_users SET subscription_tier = ${metadata.tierId}
          WHERE id = ${metadata.userId}
        `);
        console.log(`[Coinbase] User ${metadata.userId} upgraded to ${metadata.tierId} (crypto)`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("[Coinbase] Webhook error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  console.log("[Axiom Studio] Coinbase Commerce routes registered");
}
