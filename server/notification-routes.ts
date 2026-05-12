/**
 * Axiom Studio — Notification Routes
 * SMS opt-in (Twilio) and email (Resend) notification endpoints.
 * DarkWave Studios LLC — Copyright 2026
 */
import { Router, Request, Response } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * POST /api/agent/sms-optin — Twilio SMS opt-in
 */
router.post("/sms-optin", async (req: Request, res: Response) => {
  try {
    const { phone, consent } = req.body;
    const userId = (req as any).userId;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!phone || !consent) return res.status(400).json({ error: "Phone and consent required" });

    // Store opt-in in database
    await pool.query(
      `UPDATE chat_users SET sms_phone = $1, sms_opted_in = true, sms_opted_in_at = NOW() WHERE id = $2`,
      [phone, userId]
    );

    // Send welcome SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: `Axiom Studio: You're opted in for SMS notifications. Reply STOP to unsubscribe. - DarkWave Studios`,
      });

      await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
        body: body.toString(),
      });
    }

    // Send confirmation email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const user = await pool.query(`SELECT email FROM chat_users WHERE id = $1`, [userId]);
      const email = user.rows[0]?.email;
      if (email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Axiom Studio Notifications <notifications@axiomstudio.dev>",
            to: email,
            subject: "SMS Notifications Enabled — Axiom Studio",
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #06b6d4; margin-bottom: 12px;">SMS Notifications Enabled</h2>
                <p style="color: #64748b; line-height: 1.7;">
                  You've opted in to receive SMS notifications at <strong>${phone}</strong>.
                  You'll receive alerts for usage limits, billing updates, and security notices.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                  Reply STOP to the SMS to unsubscribe at any time.
                </p>
                <hr style="border: 1px solid #1e293b; margin: 24px 0;" />
                <p style="color: #475569; font-size: 11px;">
                  DarkWave Studios LLC | <a href="https://axiomstudio.dev" style="color: #06b6d4;">axiomstudio.dev</a>
                </p>
                <p style="color: #334155; font-size: 10px; margin-top: 4px;">
                  <a href="https://darkwavestudios.io/terms" style="color: #475569; text-decoration: none;">Terms</a> &middot;
                  <a href="https://darkwavestudios.io/privacy" style="color: #475569; text-decoration: none;">Privacy</a> &middot;
                  <a href="mailto:support@axiomstudio.dev" style="color: #475569; text-decoration: none;">support@axiomstudio.dev</a>
                </p>
              </div>
            `,
          }),
        });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[SMS Opt-in Error]", err.message);
    res.status(500).json({ error: "Failed to process opt-in" });
  }
});

/**
 * GET /api/agent/subscription — Get user subscription info
 */
router.get("/subscription", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await pool.query(
      `SELECT subscription_tier, messages_used, stripe_customer_id FROM chat_users WHERE id = $1`,
      [userId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    const tierLimits: Record<string, { name: string; messages: number }> = {
      free: { name: "Free", messages: 30 },
      developer: { name: "Developer", messages: 500 },
      professional: { name: "Professional", messages: 2000 },
      business: { name: "Business", messages: 10000 },
      enterprise: { name: "Enterprise", messages: 999999 },
    };

    const tier = user.subscription_tier || "free";
    const limits = tierLimits[tier] || tierLimits.free;

    res.json({
      tier,
      tierName: limits.name,
      messagesUsed: user.messages_used || 0,
      messagesPerMonth: limits.messages,
      hasStripe: !!user.stripe_customer_id,
    });
  } catch (err: any) {
    console.error("[Subscription Error]", err.message);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

export default router;
