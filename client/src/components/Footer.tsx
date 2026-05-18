/**
 * Axiom Studio — Footer
 * Full ecosystem footer with legal, company, product, social, and easter egg.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useRef, useCallback } from "react";
import { Brain, ExternalLink, Shield, X } from "lucide-react";

const ecosystemLinks = [
  { name: "DarkWave Studios", href: "https://darkwavestudios.io" },
  { name: "Trust Layer", href: "https://dwtl.io" },
  { name: "Axiom42 API", href: "https://axiom42.com" },
  { name: "Signal Chat", href: "https://darkwavestudios.io/chat" },
  { name: "TrustGen 3D", href: "https://trustgen.design" },
  { name: "TrustVault", href: "https://trustvault.studio" },
  { name: "LumeLine", href: "https://lumeline.app" },
  { name: "Lume Language", href: "https://lume-lang.org" },
  { name: "Strata Registry", href: "https://strata.tlid.io" },
];

const productLinks = [
  { name: "Auto-Routing", href: "#" },
  { name: "Snippet Marketplace", href: "https://darkwavestudios.io/developers/marketplace" },
  { name: "Widget Builder", href: "https://darkwavestudios.io/developers/widget-builder" },
  { name: "Developer API", href: "https://darkwavestudios.io/developers/api" },
  { name: "Pricing", href: "/billing" },
];

const legalLinks = [
  { name: "Terms of Service", href: "https://darkwavestudios.io/terms" },
  { name: "Privacy Policy", href: "https://darkwavestudios.io/privacy" },
  { name: "Affiliate Disclosure", href: "https://darkwavestudios.io/affiliate-disclosure" },
  { name: "SMS Terms", href: "/sms-terms" },
];

const s = {
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    background: "#060810",
    padding: "48px 24px 24px",
  } as React.CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "24px",
    maxWidth: "1100px",
    margin: "0 auto",
  } as React.CSSProperties,
  heading: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.3)",
    marginBottom: "12px",
  } as React.CSSProperties,
  link: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    textDecoration: "none",
    padding: "4px 0",
    transition: "color 0.2s",
  } as React.CSSProperties,
  bottom: {
    maxWidth: "1100px",
    margin: "32px auto 0",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "12px",
  } as React.CSSProperties,
};

export default function Footer({ onOpenAnalytics }: { onOpenAnalytics?: () => void }) {
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const OWNER_PIN = "0424";

  const handleShieldClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setShowPinModal(true);
      setPin("");
      setPinError(false);
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 2000);
    }
  }, []);

  const handlePinSubmit = useCallback(() => {
    if (pin === OWNER_PIN) {
      setShowPinModal(false);
      setShowCommandCenter(true);
      setPin("");
    } else {
      setPinError(true);
      setPin("");
      setTimeout(() => setPinError(false), 600);
    }
  }, [pin]);

  return (
    <>
      <footer style={s.footer}>
        {/* Lume Banner */}
        <div style={{
          maxWidth: "1100px", margin: "0 auto 32px",
          padding: "10px 20px", borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(6,182,212,0.04), rgba(168,85,247,0.04))",
          border: "1px solid rgba(6,182,212,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4",
            boxShadow: "0 0 8px rgba(6,182,212,0.5)",
          }} />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            Built with{" "}
            <a href="https://lume-lang.org" target="_blank" rel="noopener"
              style={{ color: "#67e8f9", textDecoration: "none", fontWeight: 600 }}>
              Lume
            </a>
            {" "} — the deterministic natural-language programming language
          </span>
        </div>

        <div style={s.grid}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Brain style={{ width: 14, height: 14, color: "white" }} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                Axiom Studio
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", lineHeight: 1.6, maxWidth: "200px" }}>
              Multi-agent AI development environment. Part of the DarkWave Studios Trust Layer ecosystem.
            </p>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 style={s.heading}>Ecosystem</h4>
            {ecosystemLinks.map((link) => (
              <a key={link.name} href={link.href} target="_blank" rel="noopener" style={s.link}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                {link.name}
                <ExternalLink style={{ width: 9, height: 9, opacity: 0.5 }} />
              </a>
            ))}
          </div>

          {/* Product */}
          <div>
            <h4 style={s.heading}>Product</h4>
            {productLinks.map((link) => (
              <a key={link.name} href={link.href} style={s.link}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener" : undefined}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div>
            <h4 style={s.heading}>Legal</h4>
            {legalLinks.map((link) => (
              <a key={link.name} href={link.href} style={s.link}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener" : undefined}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={s.bottom}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)" }}>
              DarkWave Studios LLC. All rights reserved. 2026
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
            {["64/032,339","64/047,512","64/047,467","64/047,496","64/047,536"].map((n) => (
              <span key={n} style={{
                fontSize: "8px", fontFamily: "monospace", color: "rgba(239,68,68,0.4)",
                padding: "2px 6px", borderRadius: "8px",
                background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)",
              }}>Pat. App. {n}</span>
            ))}
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.06)" }}>|</span>
            <a href="https://darkwavestudios.io/terms" target="_blank" rel="noopener"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", textDecoration: "none" }}>Terms</a>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.06)" }}>|</span>
            <a href="https://darkwavestudios.io/privacy" target="_blank" rel="noopener"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", textDecoration: "none" }}>Privacy</a>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.06)" }}>|</span>
            <a href="https://dwtl.io" target="_blank" rel="noopener"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", textDecoration: "none" }}>Trust Layer</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a href="https://github.com/cryptocreeper94-sudo" target="_blank" rel="noopener"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)", textDecoration: "none" }}
            >GitHub</a>
            <a href="mailto:support@darkwavestudios.io"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)", textDecoration: "none" }}
            >support@darkwavestudios.io</a>
            {/* Easter Egg — 3 clicks opens Command Center */}
            <button
              onClick={handleShieldClick}
              data-testid="shield-easter-egg"
              aria-label="Shield"
              style={{
                background: "none", border: "none", cursor: "default",
                color: "rgba(255,255,255,0.06)", padding: "2px",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.06)")}
            >
              <Shield style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </div>
      </footer>

      {/* PIN Gate Modal — triggered by 3x shield click */}
      {showPinModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.9)", backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowPinModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "280px", padding: "32px 24px", borderRadius: "20px",
            background: "#0a0e1a", border: "1px solid rgba(6,182,212,0.15)",
            boxShadow: "0 32px 100px rgba(6,182,212,0.1)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
            animation: pinError ? "shake 0.4s ease" : undefined,
          }}>
            <Shield style={{ width: 28, height: 28, color: pinError ? "#ef4444" : "#06b6d4" }} />
            <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>
              Enter PIN
            </p>
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(v);
                if (v.length === 4) {
                  setTimeout(() => {
                    if (v === OWNER_PIN) {
                      setShowPinModal(false);
                      setShowCommandCenter(true);
                      setPin("");
                    } else {
                      setPinError(true);
                      setPin("");
                      setTimeout(() => setPinError(false), 600);
                    }
                  }, 100);
                }
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handlePinSubmit(); if (e.key === "Escape") setShowPinModal(false); }}
              style={{
                width: "140px", textAlign: "center", letterSpacing: "12px", fontSize: "24px",
                fontWeight: 800, padding: "12px 16px", borderRadius: "12px",
                background: "rgba(255,255,255,0.03)", color: "white",
                border: `2px solid ${pinError ? "rgba(239,68,68,0.5)" : "rgba(6,182,212,0.2)"}`,
                outline: "none", caretColor: "#06b6d4",
                transition: "border-color 0.3s",
              }}
              placeholder="····"
            />
            <p style={{ fontSize: "10px", color: pinError ? "#ef4444" : "rgba(255,255,255,0.15)" }}>
              {pinError ? "Incorrect PIN" : "4-digit developer access code"}
            </p>
          </div>
        </div>
      )}

      {/* Command Center Modal — triggered by correct PIN */}
      {showCommandCenter && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }} onClick={() => setShowCommandCenter(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "100%", maxWidth: "640px",
            background: "#0a0e1a", border: "1px solid rgba(6,182,212,0.15)",
            borderRadius: "20px", overflow: "hidden",
            boxShadow: "0 32px 100px rgba(6,182,212,0.1)",
          }}>
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(168,85,247,0.08))",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Shield style={{ width: 18, height: 18, color: "#06b6d4" }} />
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>Developer Command Center</p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>DarkWave Studios — Owner Access</p>
                </div>
              </div>
              <button onClick={() => setShowCommandCenter(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", padding: "4px",
              }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Quick Links */}
            <div className="ax-cmd-grid" style={{ padding: "20px", display: "grid", gap: "8px" }}>
              {/* Local Axiom Analytics */}
              {onOpenAnalytics && (
                <button onClick={() => { onOpenAnalytics(); setShowCommandCenter(false); }} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 14px", borderRadius: "12px",
                  background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                  textDecoration: "none", cursor: "pointer", gridColumn: "1 / -1",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.06)"; }}
                >
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.5)",
                  }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#4ade80" }}>Axiom Studio Analytics</span>
                </button>
              )}
              {[
                { label: "DWTL Command Center", href: "https://darkwavestudios.io/command", color: "#06b6d4" },
                { label: "Admin Dashboard", href: "https://darkwavestudios.io/admin", color: "#a855f7" },
                { label: "Analytics", href: "https://darkwavestudios.io/analytics", color: "#22c55e" },
                { label: "Ecosystem Dashboard", href: "https://darkwavestudios.io/ecosystem-dashboard", color: "#f59e0b" },
                { label: "Ecosystem Metrics", href: "https://darkwavestudios.io/ecosystem/metrics", color: "#ef4444" },
                { label: "Blog Admin", href: "https://darkwavestudios.io/admin/blog", color: "#ec4899" },
                { label: "Marketing Hub", href: "https://darkwavestudios.io/marketing", color: "#8b5cf6" },
                { label: "Shared Components", href: "https://darkwavestudios.io/admin/shared-components", color: "#14b8a6" },
              ].map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener" style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 14px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                  textDecoration: "none", transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = `${item.color}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                  }}
                >
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: item.color, flexShrink: 0,
                    boxShadow: `0 0 8px ${item.color}44`,
                  }} />
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
                  <ExternalLink style={{ width: 9, height: 9, color: "rgba(255,255,255,0.15)", marginLeft: "auto" }} />
                </a>
              ))}
            </div>

            {/* Meta */}
            <div style={{
              padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.1)" }}>
                Axiom Studio v1.0.0 — axiomstudio.dev
              </span>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.1)" }}>
                42 Apps | 42 Papers | 13.7M+ LOC
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
