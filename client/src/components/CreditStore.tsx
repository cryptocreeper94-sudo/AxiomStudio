/**
 * Axiom Studio — Credit Store
 * Pay-as-you-go credit pack purchase UI.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import {
  Zap, Crown, Rocket, Sparkles, ArrowLeft, Check, Loader2,
  Brain, MessageCircle, Code2, Info, TrendingUp, Shield,
} from "lucide-react";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceDisplay: string;
  bonus: number;
  perCredit: string;
  popular: boolean;
}

interface AgentCost {
  credits: number;
  label: string;
}

interface Props {
  token: string;
  currentCredits: number;
  onBack: () => void;
  onPurchased?: () => void;
}

const PACK_ICONS: Record<string, any> = {
  starter: Zap,
  builder: Sparkles,
  power: Rocket,
  studio: Crown,
};

const PACK_COLORS: Record<string, { gradient: string; glow: string; border: string }> = {
  starter: {
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    glow: "rgba(6,182,212,0.15)",
    border: "rgba(6,182,212,0.25)",
  },
  builder: {
    gradient: "linear-gradient(135deg, #a855f7, #7c3aed)",
    glow: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.25)",
  },
  power: {
    gradient: "linear-gradient(135deg, #f97316, #ea580c)",
    glow: "rgba(249,115,22,0.15)",
    border: "rgba(249,115,22,0.25)",
  },
  studio: {
    gradient: "linear-gradient(135deg, #eab308, #ca8a04)",
    glow: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.25)",
  },
};

export default function CreditStore({ token, currentCredits, onBack, onPurchased }: Props) {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [agentCosts, setAgentCosts] = useState<Record<string, AgentCost>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent/packs")
      .then(r => r.json())
      .then(data => {
        setPacks(data.packs || []);
        setAgentCosts(data.agentCosts || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePurchase = async (packId: string) => {
    setPurchasing(packId);
    try {
      const res = await fetch("/api/agent/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Failed to connect to payment server");
    }
    setPurchasing(null);
  };

  if (loading) {
    return (
      <div style={{
        height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#06060a", color: "rgba(255,255,255,0.3)",
      }}>
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#06060a", color: "#fff",
      overflowY: "auto", fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)", background: "#080c15",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", fontSize: "13px", padding: "6px 10px",
            borderRadius: "8px", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Studio
        </button>
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 14px", borderRadius: "10px",
          background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)",
        }}>
          <Zap style={{ width: 14, height: 14, color: "#06b6d4" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#67e8f9" }}>
            {currentCredits} credits
          </span>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            width: 64, height: 64, margin: "0 auto 16px",
            borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #06b6d4, #a855f7)",
            boxShadow: "0 0 40px rgba(6,182,212,0.2)",
          }}>
            <Zap style={{ width: 32, height: 32, color: "#fff" }} />
          </div>
          <h1 style={{
            fontSize: "28px", fontWeight: 800, marginBottom: "8px",
            background: "linear-gradient(135deg, #67e8f9, #c084fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Buy Credits
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.35)", maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>
            Pay only for what you use. No subscriptions, no commitments.
            <br />Credits never expire.
          </p>
        </div>

        {/* Credit Packs Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px", marginBottom: "48px",
        }}>
          {packs.map(pack => {
            const Icon = PACK_ICONS[pack.id] || Sparkles;
            const colors = PACK_COLORS[pack.id] || PACK_COLORS.starter;
            const isLoading = purchasing === pack.id;

            return (
              <div
                key={pack.id}
                style={{
                  position: "relative", padding: "24px 20px", borderRadius: "16px",
                  background: `rgba(255,255,255,0.02)`,
                  border: `1px solid ${pack.popular ? colors.border : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.3s", cursor: "pointer",
                  boxShadow: pack.popular ? `0 0 30px ${colors.glow}` : "none",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = `0 0 30px ${colors.glow}`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = pack.popular ? colors.border : "rgba(255,255,255,0.06)";
                  e.currentTarget.style.boxShadow = pack.popular ? `0 0 30px ${colors.glow}` : "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Popular badge */}
                {pack.popular && (
                  <div style={{
                    position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
                    padding: "3px 14px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    background: colors.gradient, color: "#fff",
                  }}>
                    Most Popular
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: "12px", marginBottom: "16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: colors.glow,
                }}>
                  <Icon style={{ width: 22, height: 22, color: colors.border.replace("0.25", "1") }} />
                </div>

                {/* Name + Credits */}
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>{pack.name}</h3>
                <p style={{ fontSize: "28px", fontWeight: 800, marginBottom: "2px" }}>
                  {pack.priceDisplay}
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
                  {pack.credits.toLocaleString()} credits
                  {pack.bonus > 0 && (
                    <span style={{
                      marginLeft: "6px", padding: "2px 6px", borderRadius: "4px",
                      fontSize: "10px", fontWeight: 700,
                      background: "rgba(34,197,94,0.1)", color: "#4ade80",
                    }}>
                      +{pack.bonus}%
                    </span>
                  )}
                </p>

                {/* Per-credit cost */}
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginBottom: "16px" }}>
                  {pack.perCredit} per credit
                </p>

                {/* Buy button */}
                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: "10px 16px", borderRadius: "10px",
                    border: "none", cursor: isLoading ? "wait" : "pointer",
                    background: colors.gradient, color: "#fff",
                    fontSize: "13px", fontWeight: 700, transition: "all 0.2s",
                    opacity: isLoading ? 0.6 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                >
                  {isLoading ? (
                    <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Processing...</>
                  ) : (
                    <><Zap style={{ width: 14, height: 14 }} /> Buy {pack.name}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Agent Cost Reference */}
        <div style={{
          padding: "24px", borderRadius: "16px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "32px",
        }}>
          <h3 style={{
            fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.6)",
            marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <Info style={{ width: 14, height: 14 }} />
            Credit Cost Per Message
          </h3>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "8px",
          }}>
            {Object.entries(agentCosts).map(([id, cost]) => (
              <div key={id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderRadius: "8px",
                background: "rgba(255,255,255,0.02)",
              }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                  {cost.label}
                </span>
                <span style={{
                  fontSize: "12px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: cost.credits === 0 ? "#4ade80" : "#67e8f9",
                }}>
                  {cost.credits === 0 ? "Free" : `${cost.credits} cr`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust signals */}
        <div style={{
          display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap",
          opacity: 0.3, fontSize: "11px", color: "rgba(255,255,255,0.5)",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Shield style={{ width: 12, height: 12 }} /> Secure Stripe checkout
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Check style={{ width: 12, height: 12 }} /> Credits never expire
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp style={{ width: 12, height: 12 }} /> Volume discounts
          </span>
        </div>
      </div>
    </div>
  );
}
