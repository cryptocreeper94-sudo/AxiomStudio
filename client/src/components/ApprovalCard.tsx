/**
 * Axiom Studio — Approval Card
 * Inline confirmation UI for destructive agent tool calls.
 * Shows tool name, args preview, and Accept/Reject buttons.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import { Check, X, Shield, FileCode, Terminal, Trash2, Clock } from "lucide-react";

interface Props {
  tool: string;
  args: Record<string, any>;
  approvalId: string;
  token: string;
  onResolved?: (approved: boolean) => void;
}

const TOOL_CONFIG: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  write_file: { icon: FileCode, label: "Write File", color: "#06b6d4", bgColor: "rgba(6,182,212,0.08)" },
  delete_file: { icon: Trash2, label: "Delete File", color: "#ef4444", bgColor: "rgba(239,68,68,0.08)" },
  run_command: { icon: Terminal, label: "Run Command", color: "#f59e0b", bgColor: "rgba(245,158,11,0.08)" },
};

export default function ApprovalCard({ tool, args, approvalId, token, onResolved }: Props) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "timeout">("pending");
  const [timeLeft, setTimeLeft] = useState(60);
  const config = TOOL_CONFIG[tool] || { icon: Shield, label: tool, color: "#06b6d4", bgColor: "rgba(6,182,212,0.08)" };
  const Icon = config.icon;

  // Countdown timer
  useEffect(() => {
    if (status !== "pending") return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("timeout");
          onResolved?.(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, onResolved]);

  const handleApproval = async (approved: boolean) => {
    try {
      await fetch(`/api/agent/approve/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approved }),
      });
      setStatus(approved ? "approved" : "rejected");
      onResolved?.(approved);
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const borderColor = status === "approved" ? "rgba(34,197,94,0.3)"
    : status === "rejected" || status === "timeout" ? "rgba(239,68,68,0.3)"
    : `${config.color}33`;

  return (
    <div style={{
      margin: "10px 0",
      borderRadius: 12,
      border: `1px solid ${borderColor}`,
      background: status === "pending" ? "rgba(15,23,42,0.8)" : "rgba(15,23,42,0.4)",
      overflow: "hidden",
      transition: "all 0.3s",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        background: config.bgColor,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <Icon style={{ width: 14, height: 14, color: config.color }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: config.color, letterSpacing: "0.05em" }}>
          {config.label.toUpperCase()} — APPROVAL REQUIRED
        </span>
        {status === "pending" && (
          <span style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, color: timeLeft <= 10 ? "#ef4444" : "rgba(255,255,255,0.3)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <Clock style={{ width: 10, height: 10 }} />
            {timeLeft}s
          </span>
        )}
        {status !== "pending" && (
          <span style={{
            marginLeft: "auto", fontSize: 10, fontWeight: 700,
            color: status === "approved" ? "#22c55e" : "#ef4444",
          }}>
            {status === "approved" ? "✓ APPROVED" : status === "rejected" ? "✗ REJECTED" : "⏱ TIMED OUT"}
          </span>
        )}
      </div>

      {/* Content preview */}
      <div style={{ padding: "8px 12px" }}>
        {tool === "write_file" && args.path && (
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.6)" }}>
            <span style={{ color: config.color }}>→</span> {args.path}
            {args.content && (
              <div style={{
                marginTop: 6, padding: 8, borderRadius: 6,
                background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)",
                fontSize: 10, color: "rgba(255,255,255,0.35)", maxHeight: 80, overflow: "hidden",
                whiteSpace: "pre-wrap",
              }}>
                {String(args.content).slice(0, 300)}{String(args.content).length > 300 ? "…" : ""}
              </div>
            )}
          </div>
        )}
        {tool === "delete_file" && (
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#ef4444" }}>
            <Trash2 style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle" }} /> Deleting: {args.path}
          </div>
        )}
        {tool === "run_command" && (
          <div style={{
            padding: 8, borderRadius: 6, background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(245,158,11,0.15)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "#fbbf24",
          }}>
            $ {args.command}
          </div>
        )}
      </div>

      {/* Actions */}
      {status === "pending" && (
        <div style={{
          display: "flex", gap: 8, padding: "8px 12px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          <button
            onClick={() => handleApproval(true)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "rgba(34,197,94,0.12)", color: "#4ade80",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s", fontFamily: "inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; }}
          >
            <Check style={{ width: 14, height: 14 }} /> Accept
          </button>
          <button
            onClick={() => handleApproval(false)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "rgba(239,68,68,0.08)", color: "#f87171",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s", fontFamily: "inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
          >
            <X style={{ width: 14, height: 14 }} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
