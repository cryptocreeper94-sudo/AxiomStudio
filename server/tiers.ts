/**
 * Axiom Studio — Pricing & Credit Packs
 * Pay-as-you-go credit system. $0.01/credit, ~67% gross margin.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

// ── Credit Costs Per Agent (~67% gross margin at $0.01/credit) ─────────
// Based on actual API costs: Sonnet ~$0.018/msg, Opus ~$0.090/msg, GPT-4.1 ~$0.025/msg
export const AGENT_COSTS: Record<string, { credits: number; label: string }> = {
  opus:   { credits: 27, label: "Axiom (Opus 4.7)" },
  sonnet: { credits: 5,  label: "Axiom Quick (Sonnet 4.6)" },
  gpt4:   { credits: 8,  label: "Axiom GPT (GPT-4.1)" },
  lume:   { credits: 27, label: "Lume Agent (Opus 4.7)" },
  mini:   { credits: 0,  label: "Axiom Free (Mini)" },
  auto:   { credits: 0,  label: "Auto-routed (varies)" },
};

// ── Credit Packs (Pay-As-You-Go) ────────────────────────────────────────
// $0.01 per credit across all packs — volume discount via bonus credits
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;        // cents
  priceDisplay: string; // e.g. "$5"
  bonus: number;        // bonus percentage
  perCredit: string;    // e.g. "$0.01"
  popular?: boolean;
  stripePriceId: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 500,
    price: 500,
    priceDisplay: "$5",
    bonus: 0,
    perCredit: "$0.010",
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
  },
  {
    id: "builder",
    name: "Builder",
    credits: 2200,
    price: 2000,
    priceDisplay: "$20",
    bonus: 10,
    perCredit: "$0.009",
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_BUILDER || "",
  },
  {
    id: "power",
    name: "Power",
    credits: 5750,
    price: 5000,
    priceDisplay: "$50",
    bonus: 15,
    perCredit: "$0.0087",
    stripePriceId: process.env.STRIPE_PRICE_POWER || "",
  },
  {
    id: "studio",
    name: "Studio",
    credits: 12000,
    price: 10000,
    priceDisplay: "$100",
    bonus: 20,
    perCredit: "$0.0083",
    stripePriceId: process.env.STRIPE_PRICE_STUDIO || "",
  },
];

// ── Free Tier ────────────────────────────────────────────────────────────
export const FREE_MONTHLY_CREDITS = 50; // 10 free Sonnet messages/month

// ── Legacy Tier Compat (for existing users) ──────────────────────────────
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
    messagesPerMonth: 50,
    forceOpus: false,
    overflowRate: 0,
    features: [
      "50 free credits/month",
      "Auto-routed (Mini only)",
      "Basic chat",
    ],
  },
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
  if (cost === 0) return true;
  return creditBalance >= cost;
}

export function getPackById(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find(p => p.id === packId);
}
