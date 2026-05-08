/**
 * Axiom Studio — Pricing & Credit Packs
 * Pay-as-you-go credit system with volume discounts.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

// ── Credit Costs Per Agent ──────────────────────────────────────────
export const AGENT_COSTS: Record<string, { credits: number; label: string }> = {
  opus:   { credits: 10, label: "Axiom (Opus)" },
  sonnet: { credits: 3, label: "Axiom Quick (Sonnet)" },
  gpt4:   { credits: 6, label: "Axiom GPT (GPT-4.1)" },
  lume:   { credits: 10, label: "Lume Agent (Opus)" },
  mini:   { credits: 0, label: "Axiom Free (Mini)" },
  auto:   { credits: 0, label: "Auto-routed (varies)" },  // cost determined at route time
};

// ── Credit Packs (Pay-As-You-Go) ────────────────────────────────────
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;           // cents
  priceDisplay: string;    // e.g. "$5"
  bonus: number;           // bonus percentage
  perCredit: string;       // e.g. "$0.10"
  popular?: boolean;
  stripePriceId: string;   // Stripe one-time price ID
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 500,
    priceDisplay: "$5",
    bonus: 0,
    perCredit: "$0.10",
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
  },
  {
    id: "builder",
    name: "Builder",
    credits: 225,
    price: 2000,
    priceDisplay: "$20",
    bonus: 12,
    perCredit: "$0.089",
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_BUILDER || "",
  },
  {
    id: "power",
    name: "Power",
    credits: 600,
    price: 5000,
    priceDisplay: "$50",
    bonus: 20,
    perCredit: "$0.083",
    stripePriceId: process.env.STRIPE_PRICE_POWER || "",
  },
  {
    id: "studio",
    name: "Studio",
    credits: 1300,
    price: 10000,
    priceDisplay: "$100",
    bonus: 30,
    perCredit: "$0.077",
    stripePriceId: process.env.STRIPE_PRICE_STUDIO || "",
  },
];

// ── Free Tier ───────────────────────────────────────────────────────
export const FREE_MONTHLY_CREDITS = 30;

// ── Legacy Tier Compat (for existing users) ─────────────────────────
export interface TierConfig {
  id: string;
  name: string;
  price: number;
  messagesPerMonth: number;
  forceOpus: boolean;
  overflowRate: number;
  features: string[];
}

export const TIERS: Record<string, TierConfig> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    messagesPerMonth: 30,
    forceOpus: false,
    overflowRate: 0,
    features: [
      "30 free credits/month",
      "Auto-routed (Mini only)",
      "Basic chat",
    ],
  },
  // Legacy tiers kept for existing subscribers
  developer: {
    id: "developer",
    name: "Developer",
    price: 2900,
    messagesPerMonth: 300,
    forceOpus: false,
    overflowRate: 25,
    features: ["300 messages/month", "Auto-routed (Sonnet + Mini)"],
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: 5900,
    messagesPerMonth: 1000,
    forceOpus: true,
    overflowRate: 20,
    features: ["1,000 messages/month", "All models"],
  },
};

// Stripe price IDs for legacy subscriptions (kept for existing subscribers)
export const STRIPE_PRICE_IDS: Record<string, string> = {
  developer: "",
  professional: "",
  business: "",
  enterprise: "",
};

export function getTierForUser(tier: string | null): TierConfig {
  return TIERS[tier || "free"] || TIERS.free;
}

export function canUseAgent(creditBalance: number, agentId: string): boolean {
  const cost = AGENT_COSTS[agentId]?.credits || 0;
  if (cost === 0) return true; // Free agents always available
  return creditBalance >= cost;
}

export function getPackById(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find(p => p.id === packId);
}
