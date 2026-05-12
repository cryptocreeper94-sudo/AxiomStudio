/**
 * Axiom Studio — Stripe Payment Routes
 * Pay-as-you-go credit packs + legacy subscription support.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { chatUsers, aiCreditBalances, aiCreditTransactions } from "../shared/schema.js";
import { CREDIT_PACKS, AGENT_COSTS, FREE_MONTHLY_CREDITS, getTierForUser, STRIPE_PRICE_IDS, getPackById } from "./tiers.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" as any })
  : null;

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

export function registerStripeRoutes(app: Express): void {

  // ── Get credit packs (pricing page) ─────────────────────────────
  app.get("/api/agent/packs", (_req: Request, res: Response) => {
    res.json({
      packs: CREDIT_PACKS.map(p => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        price: p.price,
        priceDisplay: p.priceDisplay,
        bonus: p.bonus,
        perCredit: p.perCredit,
        popular: p.popular || false,
      })),
      agentCosts: AGENT_COSTS,
      freeMonthlyCredits: FREE_MONTHLY_CREDITS,
    });
  });

  // ── Get user credit balance ─────────────────────────────────────
  app.get("/api/agent/credits", async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Auth required" }); return; }

    try {
      // Owner bypass
      const [user] = await db.select({ role: chatUsers.role }).from(chatUsers).where(eq(chatUsers.id, userId)).limit(1);
      if (user?.role === "owner") {
        res.json({
          credits: 999999,
          totalPurchased: 0,
          totalUsed: 0,
          agentCosts: AGENT_COSTS,
        });
        return;
      }

      const [balance] = await db
        .select({
          credits: aiCreditBalances.credits,
          totalPurchased: aiCreditBalances.totalPurchased,
          totalUsed: aiCreditBalances.totalUsed,
        })
        .from(aiCreditBalances)
        .where(eq(aiCreditBalances.userId, userId))
        .limit(1);

      res.json({
        credits: balance?.credits ?? FREE_MONTHLY_CREDITS,
        totalPurchased: balance?.totalPurchased ?? 0,
        totalUsed: balance?.totalUsed ?? 0,
        agentCosts: AGENT_COSTS,
      });
    } catch (err: any) {
      console.error("[Credits] Error:", err.message);
      res.status(500).json({ error: "Failed to fetch credits" });
    }
  });

  // ── Purchase credit pack (Stripe Checkout) ──────────────────────
  app.post("/api/agent/purchase", async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Auth required" }); return; }

    const { packId } = req.body;
    const pack = getPackById(packId);

    if (!pack) {
      res.status(400).json({ error: "Invalid credit pack" });
      return;
    }

    if (!stripe) {
      res.status(500).json({ error: "Stripe not configured" });
      return;
    }

    // Get user email for Stripe
    const [user] = await db
      .select({ email: chatUsers.email })
      .from(chatUsers)
      .where(eq(chatUsers.id, userId))
      .limit(1);

    try {
      // Create one-time checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user?.email || undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Axiom Studio — ${pack.name} Pack`,
              description: `${pack.credits} credits${pack.bonus > 0 ? ` (includes ${pack.bonus}% bonus)` : ""}`,
              images: ["https://axiomstudio.dev/icons/axiom-512.png"],
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        }],
        success_url: `${process.env.APP_URL || "https://axiomstudio.dev"}?purchase=success&pack=${packId}`,
        cancel_url: `${process.env.APP_URL || "https://axiomstudio.dev"}?purchase=canceled`,
        metadata: {
          type: "credit_purchase",
          userId,
          packId,
          credits: String(pack.credits),
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Checkout error:", err.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ── Get purchase history ────────────────────────────────────────
  app.get("/api/agent/purchases", async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Auth required" }); return; }

    try {
      const transactions = await db
        .select()
        .from(aiCreditTransactions)
        .where(eq(aiCreditTransactions.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(50);

      res.json({ transactions });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // ── Legacy: Get subscription tiers ──────────────────────────────
  app.get("/api/agent/tiers", (_req: Request, res: Response) => {
    // Return credit packs as the primary pricing, with legacy tiers
    res.json({
      model: "payg",  // pay-as-you-go
      packs: CREDIT_PACKS.map(p => ({
        id: p.id, name: p.name, credits: p.credits,
        price: p.price, priceDisplay: p.priceDisplay, bonus: p.bonus,
      })),
    });
  });

  // ── Legacy: Get subscription status ─────────────────────────────
  app.get("/api/agent/subscription", async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Auth required" }); return; }

    try {
      const [balance] = await db
        .select({ credits: aiCreditBalances.credits })
        .from(aiCreditBalances)
        .where(eq(aiCreditBalances.userId, userId))
        .limit(1);

      res.json({
        model: "payg",
        credits: balance?.credits ?? FREE_MONTHLY_CREDITS,
        agentCosts: AGENT_COSTS,
      });
    } catch (err: any) {
      console.error("[Subscription] Error:", err.message);
      res.json({
        model: "payg",
        credits: FREE_MONTHLY_CREDITS,
        agentCosts: AGENT_COSTS,
      });
    }
  });

  // ── Stripe Webhook ──────────────────────────────────────────────
  app.post("/api/agent/webhook/stripe", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    if (!stripe) { res.status(500).send("Stripe not configured"); return; }

    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody || req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error("[Stripe] Webhook signature failed:", err.message);
      res.status(400).send("Webhook signature failed");
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};

        if (meta.type === "credit_purchase") {
          // ── Credit pack purchase ──
          const userId = meta.userId;
          const packId = meta.packId;
          const credits = parseInt(meta.credits || "0");

          if (userId && credits > 0) {
            // Add credits to user balance
            const [existing] = await db
              .select({ credits: aiCreditBalances.credits, totalPurchased: aiCreditBalances.totalPurchased })
              .from(aiCreditBalances)
              .where(eq(aiCreditBalances.userId, userId))
              .limit(1);

            if (existing) {
              await db
                .update(aiCreditBalances)
                .set({
                  credits: existing.credits + credits,
                  totalPurchased: existing.totalPurchased + credits,
                  updatedAt: new Date(),
                })
                .where(eq(aiCreditBalances.userId, userId));
            } else {
              await db.insert(aiCreditBalances).values({
                userId,
                credits,
                totalPurchased: credits,
                totalUsed: 0,
              });
            }

            // Log transaction
            const newBalance = (existing?.credits ?? 0) + credits;
            await db.insert(aiCreditTransactions).values({
              userId,
              type: "purchase",
              amount: credits,
              balanceAfter: newBalance,
              description: `${packId} pack — ${credits} credits`,
              category: "credit_pack",
              stripeSessionId: session.id,
            });

            console.log(`[Stripe] Credit purchase: user=${userId} pack=${packId} credits=+${credits} balance=${newBalance}`);

            // Send purchase confirmation email via Resend
            const resendKey = process.env.RESEND_API_KEY;
            if (resendKey) {
              try {
                const userRow = await db.select({ email: chatUsers.email, displayName: chatUsers.displayName })
                  .from(chatUsers).where(eq(chatUsers.id, userId)).limit(1);
                const userEmail = userRow[0]?.email;
                const userName = userRow[0]?.displayName || "there";
                if (userEmail) {
                  await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
                    body: JSON.stringify({
                      from: "Axiom Studio Billing <billing@axiomstudio.dev>",
                      to: userEmail,
                      subject: `Your ${credits.toLocaleString()} Axiom credits are ready`,
                      html: `
                        <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:16px;overflow:hidden;">
                          <div style="background:linear-gradient(135deg,#06b6d4,#a855f7);padding:32px;text-align:center;">
                            <h1 style="margin:0;font-size:24px;font-weight:800;color:white;">Credits Added ⚡</h1>
                          </div>
                          <div style="padding:32px;">
                            <p style="font-size:16px;color:#94a3b8;margin:0 0 24px;">Hey ${userName},</p>
                            <p style="font-size:15px;color:#cbd5e1;line-height:1.6;">Your <strong style="color:#06b6d4;">${credits.toLocaleString()} credits</strong> from the <strong>${packId}</strong> pack have been added to your account.</p>
                            <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
                              <div style="font-size:36px;font-weight:800;color:#06b6d4;">${newBalance.toLocaleString()}</div>
                              <div style="font-size:13px;color:#64748b;margin-top:4px;">Total credits available</div>
                            </div>
                            <p style="font-size:13px;color:#475569;">Credits never expire. Use them on any Axiom agent at any time.</p>
                            <div style="text-align:center;margin-top:28px;">
                              <a href="https://axiomstudio.dev" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#06b6d4,#a855f7);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Open Axiom Studio</a>
                            </div>
                          </div>
                          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                            <p style="font-size:11px;color:#334155;margin:0;">DarkWave Studios LLC &middot; <a href="https://axiomstudio.dev" style="color:#06b6d4;">axiomstudio.dev</a></p>
                            <p style="font-size:10px;color:#1e293b;margin:6px 0 0;"><a href="https://darkwavestudios.io/terms" style="color:#475569;text-decoration:none;">Terms</a> &middot; <a href="https://darkwavestudios.io/privacy" style="color:#475569;text-decoration:none;">Privacy</a> &middot; <a href="mailto:support@axiomstudio.dev" style="color:#475569;text-decoration:none;">support@axiomstudio.dev</a></p>
                          </div>
                        </div>
                      `,
                    }),
                  });
                  console.log(`[Resend] Purchase confirmation sent to ${userEmail}`);
                }
              } catch (emailErr: any) {
                console.warn("[Resend] Email failed (non-fatal):", emailErr.message);
              }
            }

          }
        } else if (meta.type === "axiom_subscription") {
          // ── Legacy subscription handling ──
          const userId = meta.userId;
          const tierId = meta.tierId;
          if (userId && tierId) {
            await db.execute(sql`
              UPDATE chat_users SET subscription_tier = ${tierId},
              stripe_customer_id = ${session.customer as string},
              stripe_subscription_id = ${session.subscription as string}
              WHERE id = ${userId}
            `);
            console.log(`[Stripe] Legacy subscription: user=${userId} tier=${tierId}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.execute(sql`
          UPDATE chat_users SET subscription_tier = 'free'
          WHERE stripe_subscription_id = ${sub.id}
        `);
        console.log(`[Stripe] Subscription ${sub.id} canceled → free`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.status === "past_due" || sub.status === "unpaid") {
          await db.execute(sql`
            UPDATE chat_users SET subscription_tier = 'free'
            WHERE stripe_subscription_id = ${sub.id}
          `);
        }
        break;
      }
    }

    res.json({ received: true });
  });

  // ── Cancel legacy subscription ──────────────────────────────────
  app.post("/api/agent/subscription/cancel", async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Auth required" }); return; }

    const [user] = await db.select({ id: chatUsers.id }).from(chatUsers).where(eq(chatUsers.id, userId)).limit(1);

    if (!stripe) {
      res.status(400).json({ error: "Stripe not configured" });
      return;
    }

    try {
      // Look up Stripe subscription via raw SQL to avoid column issues
      const result = await db.execute(sql`
        SELECT stripe_subscription_id FROM chat_users WHERE id = ${userId}
      `);
      const subId = (result as any).rows?.[0]?.stripe_subscription_id;
      if (subId) {
        await stripe.subscriptions.cancel(subId);
      }
      await db.execute(sql`
        UPDATE chat_users SET subscription_tier = 'free' WHERE id = ${userId}
      `);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Axiom Studio] Stripe routes registered (PAYG + legacy subscriptions)");
}
