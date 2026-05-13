/**
 * Axiom Studio — Progress Tracker
 * Visual checklist sidebar that shows progress through a starter workflow.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState } from "react";
import {
  ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, X,
} from "lucide-react";

export interface ChecklistItem {
  label: string;
  status: "pending" | "active" | "complete";
}

interface Props {
  starterTitle: string;
  starterColor: string;
  checklist: ChecklistItem[];
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ProgressTracker({
  starterTitle, starterColor, checklist, onClose,
  collapsed = false, onToggleCollapse,
}: Props) {
  const completedCount = checklist.filter(c => c.status === "complete").length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600,
          cursor: "pointer", transition: "all 0.2s", width: "100%",
        }}
      >
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>{starterTitle}</span>
        <span style={{
          marginLeft: "auto", fontSize: 9,
          fontFamily: "'JetBrains Mono', monospace",
          color: starterColor,
        }}>
          {completedCount}/{checklist.length}
        </span>
        {/* Mini progress bar */}
        <div style={{
          width: 40, height: 3, borderRadius: 2,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: starterColor,
            borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
      </button>
    );
  }

  return (
    <div style={{
      borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
      animation: "trackerSlide 0.3s ease",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.3)", display: "flex", padding: 0,
          }}
        >
          <ChevronDown style={{ width: 14, height: 14 }} />
        </button>
        <span style={{
          fontSize: 11, fontWeight: 700, color: starterColor,
          letterSpacing: "0.04em", textTransform: "uppercase",
          flex: 1,
        }}>
          {starterTitle}
        </span>
        <span style={{
          fontSize: 9, color: "rgba(255,255,255,0.2)",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {completedCount}/{checklist.length}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.15)", display: "flex", padding: 0,
            transition: "color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 2, background: "rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: `linear-gradient(90deg, ${starterColor}, ${starterColor}88)`,
          borderRadius: 2,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Checklist items */}
      <div style={{ padding: "8px 6px" }}>
        {checklist.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", borderRadius: 6,
            background: item.status === "active" ? `rgba(${hexToRgbTracker(starterColor)}, 0.04)` : "transparent",
            transition: "all 0.2s",
          }}>
            {/* Status icon */}
            {item.status === "complete" ? (
              <CheckCircle2 style={{ width: 14, height: 14, color: "#22c55e", flexShrink: 0 }} />
            ) : item.status === "active" ? (
              <Loader2 style={{
                width: 14, height: 14, color: starterColor, flexShrink: 0,
                animation: "spin 2s linear infinite",
              }} />
            ) : (
              <Circle style={{ width: 14, height: 14, color: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
            )}

            {/* Label */}
            <span style={{
              fontSize: 11, fontWeight: item.status === "active" ? 600 : 400,
              color: item.status === "complete"
                ? "rgba(255,255,255,0.3)"
                : item.status === "active"
                  ? "rgba(255,255,255,0.8)"
                  : "rgba(255,255,255,0.2)",
              textDecoration: item.status === "complete" ? "line-through" : "none",
              transition: "all 0.2s",
            }}>
              {item.label}
            </span>

            {/* Step number */}
            <span style={{
              marginLeft: "auto", fontSize: 8,
              color: "rgba(255,255,255,0.08)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Completion message */}
      {progress === 100 && (
        <div style={{
          padding: "8px 14px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, color: "#22c55e", fontWeight: 600,
          background: "rgba(34,197,94,0.04)",
        }}>
          <CheckCircle2 style={{ width: 12, height: 12 }} />
          All steps complete!
        </div>
      )}

      {/* CSS */}
      <style>{`
        @keyframes trackerSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function hexToRgbTracker(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "255,255,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
