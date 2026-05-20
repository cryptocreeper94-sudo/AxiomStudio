/**
 * Axiom Studio — SMS Opt-In Page
 * Twilio SMS notifications opt-in with checkbox consent.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState } from "react";
import { Brain, MessageSquare, Check, Phone, ArrowLeft, Shield } from "lucide-react";

export default function SmsOptIn({ token, onBack }: { token: string; onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("You must agree to receive SMS messages"); return; }
    if (!phone || phone.length < 10) { setError("Enter a valid phone number"); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/agent/sms-optin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, consent: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to opt in");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#06060a", fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          maxWidth: "420px", width: "100%", margin: "0 16px", textAlign: "center",
          background: "rgba(8,12,21,0.8)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px", padding: "48px 32px", backdropFilter: "blur(40px)",
        }}>
          <div style={{
            width: "56px", height: "56px", margin: "0 auto 20px", borderRadius: "50%",
            background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check style={{ width: 24, height: 24, color: "#4ade80" }} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "white", marginBottom: "8px" }}>
            You're Opted In
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "24px", lineHeight: 1.6 }}>
            You'll receive SMS notifications for account alerts and usage updates.
            Reply STOP at any time to unsubscribe.
          </p>
          <button onClick={onBack} style={{
            padding: "12px 24px", borderRadius: "12px",
            background: "linear-gradient(135deg, #0891b2, #0369a1)",
            color: "white", fontWeight: 600, fontSize: "13px", border: "none", cursor: "pointer",
          }}>
            Back to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#06060a", fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        maxWidth: "460px", width: "100%", margin: "0 16px",
        background: "rgba(8,12,21,0.8)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px", padding: "40px 32px", backdropFilter: "blur(40px)",
      }}>
        {/* Header */}
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px",
          background: "none", border: "none", color: "rgba(255,255,255,0.3)",
          fontSize: "12px", cursor: "pointer",
        }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px",
            background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MessageSquare style={{ width: 22, height: 22, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white" }}>SMS Notifications</h1>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Powered by Twilio</p>
          </div>
        </div>

        <p style={{
          fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: "24px",
        }}>
          Opt in to receive SMS notifications for account alerts, usage limits,
          billing updates, and security notices from Axiom Studio.
        </p>

        {/* Benefits */}
        <div style={{
          background: "rgba(255,255,255,0.02)", borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.04)", padding: "16px", marginBottom: "24px",
        }}>
          {[
            "Usage limit alerts before you hit your cap",
            "Billing confirmations and payment receipts",
            "Security alerts for account activity",
            "Monthly usage summary",
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "6px 0", fontSize: "12px", color: "rgba(255,255,255,0.5)",
            }}>
              <Check style={{ width: 12, height: 12, color: "#4ade80", flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Phone */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "6px", display: "block" }}>
              Phone Number
            </label>
            <div style={{ position: "relative" }}>
              <Phone style={{
                position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                width: 14, height: 14, color: "rgba(255,255,255,0.2)",
              }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                style={{
                  width: "100%", padding: "14px 14px 14px 40px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <label style={{
            display: "flex", gap: "12px", alignItems: "flex-start",
            padding: "14px", borderRadius: "12px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer", marginBottom: "16px",
          }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0, marginTop: "1px",
              background: agreed ? "linear-gradient(135deg, #0891b2, #0369a1)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${agreed ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {agreed && <Check style={{ width: 12, height: 12, color: "white" }} />}
            </div>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
              I agree to receive SMS messages from Axiom Studio (DarkWave Studios LLC)
              at the phone number provided. Message and data rates may apply.
              Message frequency varies. Reply STOP to unsubscribe. Reply HELP for help.
              View our{" "}
              <a href="https://darkwavestudios.io/privacy" target="_blank" rel="noopener"
                style={{ color: "#67e8f9", textDecoration: "none" }}>
                Privacy Policy
              </a>{" "}and{" "}
              <a href="https://darkwavestudios.io/terms" target="_blank" rel="noopener"
                style={{ color: "#67e8f9", textDecoration: "none" }}>
                Terms of Service
              </a>.
            </span>
          </label>

          {error && (
            <p style={{
              color: "#f87171", fontSize: "12px", textAlign: "center", marginBottom: "12px",
              padding: "8px", borderRadius: "8px", background: "rgba(239,68,68,0.08)",
            }}>{error}</p>
          )}

          <button type="submit" disabled={submitting || !agreed} style={{
            width: "100%", padding: "14px", borderRadius: "14px",
            background: agreed ? "linear-gradient(135deg, #0891b2, #0369a1)" : "rgba(255,255,255,0.06)",
            color: agreed ? "white" : "rgba(255,255,255,0.2)",
            fontWeight: 600, fontSize: "14px", border: "none",
            cursor: agreed && !submitting ? "pointer" : "not-allowed",
            transition: "all 0.3s",
          }}>
            {submitting ? "Sending..." : "Opt In to SMS"}
          </button>
        </form>

        {/* Compliance footer */}
        <div style={{
          marginTop: "20px", paddingTop: "16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", gap: "6px", justifyContent: "center",
        }}>
          <Shield style={{ width: 10, height: 10, color: "rgba(255,255,255,0.12)" }} />
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.1)", textAlign: "center" }}>
            TCPA compliant. Your number is never shared or sold. DarkWave Studios LLC, Nashville TN.
          </p>
        </div>
      </div>
    </div>
  );
}
