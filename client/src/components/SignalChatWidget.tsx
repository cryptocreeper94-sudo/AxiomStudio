/**
 * Axiom Studio — Signal Chat Widget
 * Floating chat button that opens a connection to the DWTL Signal Chat.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState } from "react";
import { MessageSquare, X, ExternalLink } from "lucide-react";

export default function SignalChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: "20px", right: "20px", zIndex: 999,
          width: "48px", height: "48px", borderRadius: "50%",
          background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(6,182,212,0.3)",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Signal Chat"
      >
        {open
          ? <X style={{ width: 20, height: 20, color: "white" }} />
          : <MessageSquare style={{ width: 20, height: 20, color: "white" }} />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: "80px", right: "12px", zIndex: 998,
          width: "min(360px, calc(100vw - 24px))",
          height: "min(480px, calc(100vh - 120px))",
          borderRadius: "20px", overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          background: "#0a0e1a",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.12))",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "10px",
                background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquare style={{ width: 15, height: 15, color: "white" }} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Signal Chat</p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                  Trust Layer Community
                </p>
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "3px 8px", borderRadius: "8px",
              background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.15)",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80" }} />
              <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 500 }}>Live</span>
            </div>
          </div>

          {/* Chat iframe */}
          <iframe
            src="https://darkwavestudios.io/chat?embed=true&channel=axiom-studio"
            style={{
              flex: 1, width: "100%", border: "none",
              background: "#0a0e1a",
            }}
            title="Signal Chat"
          />

          {/* Footer */}
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.12)" }}>
              Powered by Signal Chat
            </span>
            <a
              href="https://darkwavestudios.io/chat"
              target="_blank"
              rel="noopener"
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                fontSize: "9px", color: "rgba(6,182,212,0.4)", textDecoration: "none",
              }}
            >
              Open Full Chat <ExternalLink style={{ width: 8, height: 8 }} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
