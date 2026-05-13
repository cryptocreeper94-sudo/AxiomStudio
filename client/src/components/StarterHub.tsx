/**
 * Axiom Studio — Starter Hub
 * Project launcher grid with guided starter flows.
 * Replaces blank chat empty state.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState } from "react";
import {
  Blocks, Palette, Box, Mic, ClipboardList, Bug,
  ArrowRight, Sparkles, Zap, Timer, Code2,
} from "lucide-react";

export interface StarterConfig {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  agent: string;
  systemPrompt: string;
  checklist: string[];
  color: string;
  gradient: string;
  enableVoice?: boolean;
  requiresSubscription?: string;
}

export const STARTERS: StarterConfig[] = [
  {
    id: "build-app",
    icon: <Blocks style={{ width: 22, height: 22 }} />,
    title: "Build an App",
    subtitle: "Web, mobile, or desktop",
    description: "Scaffold a complete application with your choice of framework and features.",
    agent: "auto",
    systemPrompt: `You are helping the user build a complete application from scratch. Start by asking what kind of app they want (web, mobile, desktop), what framework they prefer, and what features they need. Then scaffold the project and guide them step by step with a clear checklist. Be opinionated about best practices. Create production-quality code, not tutorials.`,
    checklist: ["Choose platform & stack", "Scaffold project", "Build layout", "Add core features", "Style & polish", "Test", "Deploy"],
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
  },
  {
    id: "animation",
    icon: <Palette style={{ width: 22, height: 22 }} />,
    title: "Animation",
    subtitle: "CSS, JS, Lottie, SVG",
    description: "Create stunning animations with live-previewable code and smooth transitions.",
    agent: "sonnet",
    systemPrompt: `You are an animation specialist inside Axiom Studio. Help the user create stunning, production-quality animations. Support CSS animations, GSAP, Lottie, SVG animations, and Canvas/WebGL. Always provide complete, live-previewable code. Focus on performance and smooth 60fps output. Suggest creative ideas when the user is unsure.`,
    checklist: ["Choose animation type", "Design keyframes", "Build animation", "Polish timing & easing", "Export / integrate"],
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899, #f97316)",
  },
  {
    id: "3d-render",
    icon: <Box style={{ width: 22, height: 22 }} />,
    title: "3D Rendering",
    subtitle: "Three.js + WebGL",
    description: "Build interactive 3D scenes, models, and visualizations with real-time rendering.",
    agent: "opus",
    systemPrompt: `You are a 3D rendering expert using Three.js and WebGL inside Axiom Studio. Help the user create 3D scenes, models, and interactive visualizations. You understand PBR materials, lighting setups, post-processing, and performance optimization. Create production-quality code with proper scene management, responsive rendering, and smooth interactions.`,
    checklist: ["Setup scene & renderer", "Add geometry / models", "Configure lighting", "Add materials & textures", "Interactions & animation", "Optimize & export"],
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
  },
  {
    id: "lume-app",
    icon: <Mic style={{ width: 22, height: 22 }} />,
    title: "Lume App",
    subtitle: "Speak or type naturally",
    description: "Build with the Lume natural language programming system — describe what you want.",
    agent: "opus",
    systemPrompt: `You are the Lume programming assistant inside Axiom Studio. Lume is a deterministic natural-language programming language created by DarkWave Studios LLC. Help the user write Lume code by accepting natural language descriptions (via text or voice transcription) and translating them into valid Lume syntax. Reference the Lume Language Specification (DOI: 10.5281/zenodo.19382282) for syntax and semantics. Always explain what you're generating and why.`,
    checklist: ["Describe your app", "Generate Lume code", "Review & refine", "Compile & test", "Deploy"],
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    enableVoice: true,
  },
  {
    id: "plan-project",
    icon: <ClipboardList style={{ width: 22, height: 22 }} />,
    title: "Plan a Project",
    subtitle: "Architecture & specs",
    description: "Generate architecture diagrams, task breakdowns, schemas, and implementation plans.",
    agent: "opus",
    systemPrompt: `You are a senior software architect inside Axiom Studio. Help the user plan their project from concept to implementation. Generate: architecture diagrams (mermaid), tech stack recommendations, task breakdowns with effort estimates, database schemas, API specs, and implementation timelines. Be thorough and specific. Output actionable plans, not generic advice.`,
    checklist: ["Define requirements", "Choose architecture", "Design data model", "Plan API / interfaces", "Generate task breakdown", "Create specs document"],
    color: "#22c55e",
    gradient: "linear-gradient(135deg, #22c55e, #06b6d4)",
  },
  {
    id: "debug-code",
    icon: <Bug style={{ width: 22, height: 22 }} />,
    title: "Debug Code",
    subtitle: "Paste, analyze, fix",
    description: "Root cause analysis with clear explanations — understand WHY the bug occurred.",
    agent: "sonnet",
    systemPrompt: `You are an expert debugger inside Axiom Studio. The user will paste code or describe a bug. Analyze the code thoroughly, identify the root cause, explain it clearly, and provide the fix with a diff. Always explain WHY the bug occurred, not just how to fix it. Check for edge cases, race conditions, and related issues. Suggest preventive measures.`,
    checklist: ["Paste / describe bug", "Root cause analysis", "Implement fix", "Verify & test"],
    color: "#ef4444",
    gradient: "linear-gradient(135deg, #ef4444, #f59e0b)",
  },
];

interface Props {
  onSelectStarter: (starter: StarterConfig) => void;
  agentName?: string;
}

export default function StarterHub({ onSelectStarter, agentName = "Axiom" }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      overflow: "auto",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 420 }}>
        <div style={{
          width: 52, height: 52, margin: "0 auto 14px", borderRadius: 16,
          background: "linear-gradient(135deg, #06b6d4, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(6,182,212,0.2), 0 0 60px rgba(6,182,212,0.08)",
          position: "relative",
        }}>
          <Sparkles style={{ width: 26, height: 26, color: "#fff" }} />
          {/* Animated ring */}
          <div style={{
            position: "absolute", inset: -3, borderRadius: 19,
            border: "1px solid rgba(6,182,212,0.2)",
            animation: "starterPulse 3s ease-in-out infinite",
          }} />
        </div>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 6,
          letterSpacing: "-0.01em",
        }}>
          What will you build?
        </h2>
        <p style={{
          fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
          margin: 0,
        }}>
          Choose a starter to get guided step-by-step, or just type anything below.
        </p>
      </div>

      {/* Starter Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        width: "100%",
        maxWidth: 520,
      }}>
        {STARTERS.map((starter) => {
          const isHovered = hoveredId === starter.id;
          return (
            <button
              key={starter.id}
              onClick={() => onSelectStarter(starter)}
              onMouseEnter={() => setHoveredId(starter.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: "flex", flexDirection: "column",
                padding: "18px 16px", borderRadius: 14,
                background: isHovered
                  ? `rgba(${hexToRgb(starter.color)}, 0.08)`
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${isHovered
                  ? `rgba(${hexToRgb(starter.color)}, 0.3)`
                  : "rgba(255,255,255,0.06)"}`,
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isHovered ? "translateY(-3px)" : "none",
                boxShadow: isHovered
                  ? `0 8px 24px rgba(${hexToRgb(starter.color)}, 0.12)`
                  : "none",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
                minHeight: 110,
              }}
            >
              {/* Top accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: starter.gradient,
                opacity: isHovered ? 1 : 0.4,
                transition: "opacity 0.3s",
              }} />

              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, marginBottom: 10,
                background: `rgba(${hexToRgb(starter.color)}, 0.1)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: starter.color,
                transition: "all 0.3s",
                transform: isHovered ? "scale(1.1)" : "none",
              }}>
                {starter.icon}
              </div>

              {/* Title */}
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#e2e8f0",
                marginBottom: 3, display: "flex", alignItems: "center", gap: 6,
              }}>
                {starter.title}
                {isHovered && (
                  <ArrowRight style={{
                    width: 12, height: 12, color: starter.color,
                    animation: "slideRight 0.3s ease forwards",
                  }} />
                )}
              </div>

              {/* Subtitle */}
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,0.35)",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.02em",
              }}>
                {starter.subtitle}
              </div>

              {/* Voice badge for Lume */}
              {starter.enableVoice && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  padding: "2px 6px", borderRadius: 4,
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  fontSize: 8, fontWeight: 700, color: "#f59e0b",
                  letterSpacing: "0.05em",
                }}>
                  VOICE
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick stats */}
      <div style={{
        display: "flex", gap: 20, marginTop: 24,
        justifyContent: "center", flexWrap: "wrap",
      }}>
        {[
          { icon: <Zap style={{ width: 10, height: 10 }} />, label: "Auto-routes to best model" },
          { icon: <Timer style={{ width: 10, height: 10 }} />, label: "Step-by-step guidance" },
          { icon: <Code2 style={{ width: 10, height: 10 }} />, label: "Production-ready code" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 9, color: "rgba(255,255,255,0.2)",
            fontWeight: 500,
          }}>
            <span style={{ color: "rgba(6,182,212,0.4)" }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes starterPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// Utility to convert hex color to RGB for rgba()
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "255,255,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
