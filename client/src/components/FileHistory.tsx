/**
 * Axiom Studio — File History Panel
 * Shows version timeline for a file with revert functionality.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import { History, RotateCcw, FileCode, Clock, X, Check, ChevronDown, ChevronRight } from "lucide-react";

interface HistoryVersion {
  id: string;
  action: string;
  agentId: string | null;
  sizeBytes: number;
  createdAt: string;
}

interface Props {
  filePath: string;
  token: string;
  onRevert?: () => void;
  onClose?: () => void;
}

export default function FileHistory({ filePath, token, onRevert, onClose }: Props) {
  const [versions, setVersions] = useState<HistoryVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState<string | null>(null);
  const [reverted, setReverted] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/history?path=${encodeURIComponent(filePath)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setVersions(data.versions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filePath, token]);

  const handleRevert = async (versionId: string) => {
    setReverting(versionId);
    try {
      const res = await fetch("/api/history/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        setReverted(versionId);
        onRevert?.();
        setTimeout(() => setReverted(null), 2000);
      }
    } catch (err) {
      console.error("Revert error:", err);
    }
    setReverting(null);
  };

  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case "write": return "Modified";
      case "delete": return "Deleted";
      case "revert": return "Reverted";
      default: return action;
    }
  };

  const actionColor = (action: string) => {
    switch (action) {
      case "write": return "#06b6d4";
      case "delete": return "#ef4444";
      case "revert": return "#f59e0b";
      default: return "rgba(255,255,255,0.4)";
    }
  };

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(15,23,42,0.9)",
      overflow: "hidden",
      maxWidth: 360,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <History style={{ width: 13, height: 13, color: "#06b6d4" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>
          History: {fileName}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", padding: 2 }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>

      {/* Version list */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
            Loading history...
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
            No history yet. Changes will appear here after the agent modifies this file.
          </div>
        ) : (
          versions.map((v, i) => (
            <div
              key={v.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.02)",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Timeline dot */}
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: actionColor(v.action),
                flexShrink: 0,
                boxShadow: `0 0 6px ${actionColor(v.action)}33`,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: actionColor(v.action) }}>
                    {actionLabel(v.action)}
                  </span>
                  <span style={{
                    fontSize: 9, color: "rgba(255,255,255,0.2)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {(v.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 9, color: "rgba(255,255,255,0.2)",
                }}>
                  <Clock style={{ width: 8, height: 8 }} />
                  {formatTime(v.createdAt)}
                </div>
              </div>

              {/* Revert button */}
              <button
                onClick={() => handleRevert(v.id)}
                disabled={reverting === v.id}
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  padding: "3px 8px", borderRadius: 4,
                  background: reverted === v.id ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${reverted === v.id ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: reverted === v.id ? "#4ade80" : "rgba(255,255,255,0.4)",
                  fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                  opacity: reverting === v.id ? 0.5 : 1,
                }}
              >
                {reverted === v.id ? (
                  <><Check style={{ width: 9, height: 9 }} /> Done</>
                ) : (
                  <><RotateCcw style={{ width: 9, height: 9 }} /> Revert</>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
