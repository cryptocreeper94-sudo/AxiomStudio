/**
 * Axiom Studio — Agent Thinking Indicator
 * Rich visual cue showing the agent is working, with elapsed timer,
 * animated brain waves, and contextual status messages.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useRef } from "react";
import { Brain, Loader2, Zap, Code2, Search, FileEdit, Terminal } from "lucide-react";

interface Props {
  agentName?: string;
  agentColor?: string;
  toolActivity?: Array<{ tool: string; args?: any; result?: string; isError?: boolean; done: boolean }>;
  streamingContent: string;
  isStreaming: boolean;
}

const THINKING_PHASES = [
  "Analyzing your request...",
  "Reasoning through the problem...",
  "Planning the approach...",
  "Formulating response...",
  "Working through details...",
];

const TOOL_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  run_command: { label: "Running command", icon: <Terminal style={{ width: 11, height: 11 }} /> },
  read_file: { label: "Reading file", icon: <Search style={{ width: 11, height: 11 }} /> },
  write_file: { label: "Writing file", icon: <FileEdit style={{ width: 11, height: 11 }} /> },
  list_directory: { label: "Exploring files", icon: <Search style={{ width: 11, height: 11 }} /> },
  search_files: { label: "Searching code", icon: <Search style={{ width: 11, height: 11 }} /> },
  generate_image: { label: "Generating image", icon: <Zap style={{ width: 11, height: 11 }} /> },
};

export default function ThinkingIndicator({ agentName = "Axiom", agentColor = "#06b6d4", toolActivity = [], streamingContent, isStreaming }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (!isStreaming) {
      setElapsed(0);
      startTimeRef.current = Date.now();
      return;
    }
    startTimeRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isStreaming]);

  // Phase rotation
  useEffect(() => {
    if (!isStreaming || streamingContent) return;
    const interval = setInterval(() => {
      setPhaseIndex(prev => (prev + 1) % THINKING_PHASES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isStreaming, streamingContent]);

  if (!isStreaming) return null;

  // Determine current status
  const activeTool = toolActivity.find(t => !t.done);
  const completedTools = toolActivity.filter(t => t.done && !t.isError).length;
  const hasContent = !!streamingContent;
  const isTooling = !!activeTool;

  // Don't show if we have streaming content (the content itself is visible)
  if (hasContent && !isTooling) return null;

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const getToolInfo = (toolName: string) => {
    return TOOL_LABELS[toolName] || { label: toolName, icon: <Code2 style={{ width: 11, height: 11 }} /> };
  };

  return (
    <div style={{
      margin: "8px 14px",
      borderRadius: 12,
      background: "rgba(6,182,212,0.03)",
      border: "1px solid rgba(6,182,212,0.08)",
      overflow: "hidden",
      animation: "thinkFadeIn 0.3s ease",
    }}>
      {/* Main thinking bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
      }}>
        {/* Animated brain icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: "rgba(6,182,212,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          <Brain style={{
            width: 16, height: 16, color: "#22d3ee",
            animation: "brainPulse 2s ease-in-out infinite",
          }} />
          {/* Orbiting dot */}
          <div style={{
            position: "absolute", width: 4, height: 4, borderRadius: "50%",
            background: "#22d3ee",
            animation: "orbitDot 2s linear infinite",
            boxShadow: "0 0 6px rgba(34,211,238,0.6)",
          }} />
        </div>

        {/* Status text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)",
            }}>
              {agentName}
            </span>

            {/* Status pill */}
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "2px 8px",
              borderRadius: 4, letterSpacing: "0.04em",
              background: isTooling ? "rgba(99,102,241,0.1)" : "rgba(6,182,212,0.08)",
              color: isTooling ? "rgba(56,189,248,0.8)" : "rgba(34,211,238,0.6)",
              border: `1px solid ${isTooling ? "rgba(99,102,241,0.15)" : "rgba(6,182,212,0.1)"}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {isTooling ? "EXECUTING" : hasContent ? "WRITING" : "THINKING"}
            </span>

            {/* Elapsed timer */}
            <span style={{
              fontSize: 9, color: "rgba(255,255,255,0.15)",
              fontFamily: "'JetBrains Mono', monospace",
              marginLeft: "auto",
            }}>
              {formatTime(elapsed)}
            </span>
          </div>

          {/* Contextual message */}
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.25)",
            marginTop: 2, fontStyle: "italic",
            animation: "textFade 0.5s ease",
          }}>
            {isTooling
              ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {getToolInfo(activeTool!.tool).icon}
                  {getToolInfo(activeTool!.tool).label}
                  {activeTool!.args?.CommandLine && (
                    <code style={{ fontSize: 9, color: "rgba(56,189,248,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(activeTool!.args.CommandLine).slice(0, 40)}
                    </code>
                  )}
                  {activeTool!.args?.TargetFile && (
                    <code style={{ fontSize: 9, color: "rgba(56,189,248,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(activeTool!.args.TargetFile).split("/").pop()?.split("\\").pop()}
                    </code>
                  )}
                </span>
              : THINKING_PHASES[phaseIndex]
            }
          </div>
        </div>

        {/* Animated wave bars */}
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 3, borderRadius: 2,
              background: isTooling ? "rgba(99,102,241,0.4)" : "rgba(6,182,212,0.3)",
              animation: `waveBar 1.2s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Tool activity log (when tools are running) */}
      {toolActivity.length > 0 && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.03)",
          maxHeight: 120, overflowY: "auto",
        }}>
          {toolActivity.slice(-5).map((t, i) => (
            <div key={i} style={{
              padding: "4px 14px",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              borderBottom: "1px solid rgba(255,255,255,0.02)",
            }}>
              <span style={{ fontSize: 10, flexShrink: 0 }}>
                {!t.done ? (
                  <Loader2 style={{ width: 10, height: 10, color: "rgba(56,189,248,0.6)", animation: "spin 1s linear infinite" }} />
                ) : t.isError ? "❌" : "✓"}
              </span>
              <span style={{
                color: t.done
                  ? (t.isError ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.2)")
                  : "rgba(56,189,248,0.6)",
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {getToolInfo(t.tool).label}
                {t.args?.TargetFile && ` → ${String(t.args.TargetFile).split("/").pop()?.split("\\").pop()}`}
                {t.args?.CommandLine && ` → ${String(t.args.CommandLine).slice(0, 30)}`}
              </span>
              {t.done && !t.isError && (
                <span style={{ color: "rgba(34,197,94,0.4)" }}>✓</span>
              )}
            </div>
          ))}

          {/* Completed count */}
          {completedTools > 0 && (
            <div style={{
              padding: "3px 14px", fontSize: 8, color: "rgba(255,255,255,0.12)",
              textAlign: "right",
            }}>
              {completedTools} action{completedTools !== 1 ? "s" : ""} completed
            </div>
          )}
        </div>
      )}

      {/* Progress bar at bottom */}
      <div style={{
        height: 2,
        background: "rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: isTooling
            ? "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(56,189,248,0.6))"
            : "linear-gradient(90deg, rgba(6,182,212,0.3), rgba(14,165,233,0.5))",
          animation: "progressSweep 2s ease-in-out infinite",
        }} />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes thinkFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes brainPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes orbitDot {
          0% { transform: rotate(0deg) translateX(14px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(14px) rotate(-360deg); }
        }
        @keyframes waveBar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes textFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes progressSweep {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
