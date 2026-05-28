/**
 * Axiom Studio — Diff View
 * Renders inline diffs for file changes in the chat.
 * Shows additions/deletions with syntax coloring and line numbers.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, FileCode } from "lucide-react";

interface DiffLine {
  type: "add" | "remove" | "same";
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface Props {
  filePath: string;
  lines: DiffLine[];
  summary: string;
  additions: number;
  deletions: number;
  onRevert?: () => void;
}

export default function DiffView({ filePath, lines, summary, additions, deletions, onRevert }: Props) {
  const [expanded, setExpanded] = useState(false);

  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <div style={{
      margin: "8px 0",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(15,23,42,0.6)",
      overflow: "hidden",
      fontSize: 11,
    }}>
      {/* Collapse header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", background: "none", border: "none",
          color: "rgba(255,255,255,0.6)", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          textAlign: "left",
        }}
      >
        {expanded
          ? <ChevronDown style={{ width: 12, height: 12, flexShrink: 0 }} />
          : <ChevronRight style={{ width: 12, height: 12, flexShrink: 0 }} />
        }
        <FileCode style={{ width: 12, height: 12, color: "#06b6d4", flexShrink: 0 }} />
        <span style={{ color: "#e2e8f0" }}>{fileName}</span>
        <span style={{ color: "#4ade80", fontWeight: 700 }}>+{additions}</span>
        <span style={{ color: "#f87171", fontWeight: 700 }}>-{deletions}</span>
        <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{summary}</span>
        {onRevert && (
          <button
            onClick={(e) => { e.stopPropagation(); onRevert(); }}
            title="Revert to previous version"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 4,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
              color: "#f87171", fontSize: 9, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RotateCcw style={{ width: 10, height: 10 }} /> Revert
          </button>
        )}
      </button>

      {/* Diff lines */}
      {expanded && (
        <div style={{
          maxHeight: 400, overflowY: "auto", overflowX: "auto",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          {lines.map((line, idx) => (
            <div
              key={idx}
              style={{
                display: "flex", alignItems: "stretch",
                background: line.type === "add" ? "rgba(34,197,94,0.06)"
                  : line.type === "remove" ? "rgba(239,68,68,0.06)"
                  : "transparent",
                borderLeft: line.type === "add" ? "3px solid rgba(34,197,94,0.4)"
                  : line.type === "remove" ? "3px solid rgba(239,68,68,0.4)"
                  : "3px solid transparent",
              }}
            >
              {/* Line numbers */}
              <span style={{
                width: 36, padding: "0 4px", textAlign: "right",
                color: "rgba(255,255,255,0.15)", userSelect: "none",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                flexShrink: 0, lineHeight: "20px",
              }}>
                {line.oldLine || ""}
              </span>
              <span style={{
                width: 36, padding: "0 4px", textAlign: "right",
                color: "rgba(255,255,255,0.15)", userSelect: "none",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                flexShrink: 0, lineHeight: "20px",
              }}>
                {line.newLine || ""}
              </span>
              {/* Prefix */}
              <span style={{
                width: 16, textAlign: "center", flexShrink: 0,
                color: line.type === "add" ? "#4ade80" : line.type === "remove" ? "#f87171" : "transparent",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                lineHeight: "20px", fontWeight: 700,
              }}>
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
              </span>
              {/* Content */}
              <span style={{
                flex: 1, padding: "0 8px",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: line.type === "add" ? "#86efac"
                  : line.type === "remove" ? "#fca5a5"
                  : "rgba(255,255,255,0.45)",
                whiteSpace: "pre", lineHeight: "20px",
              }}>
                {line.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
