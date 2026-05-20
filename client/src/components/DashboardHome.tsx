/**
 * Axiom Studio — Dashboard Home
 * Clean, premium landing page shown after login — before entering the IDE.
 * Squarespace-level simplicity with developer-level comprehensiveness.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState } from "react";
import {
  Zap, Plus, ArrowRight, MessageSquare, FolderGit2, Bot, Code2,
  CreditCard, ChevronRight, Brain, Shield, Crown, Clock,
  Sparkles, Terminal, Globe, Rocket, Settings, LogOut,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  agentId?: string;
  model?: string;
}

interface Props {
  user: any;
  token: string;
  credits: number;
  conversations: Conversation[];
  agents: any[];
  onEnterIDE: () => void;
  onNewChat: () => void;
  onSelectConvo: (id: string) => void;
  onOpenCredits: () => void;
  onLogout: () => void;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const QUICK_STARTS = [
  { title: "New Project", desc: "Start from scratch with AI assistance", icon: Plus, color: "#06b6d4", gradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(6,182,212,0.04))" },
  { title: "Import from GitHub", desc: "Clone a public repository", icon: Globe, color: "#38bdf8", gradient: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))" },
  { title: "AI Code Generation", desc: "Describe what you want to build", icon: Sparkles, color: "#f59e0b", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))" },
  { title: "Run a Script", desc: "Execute commands with AI guidance", icon: Terminal, color: "#22c55e", gradient: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))" },
];

export default function DashboardHome({
  user, token, credits, conversations, agents,
  onEnterIDE, onNewChat, onSelectConvo, onOpenCredits, onLogout,
}: Props) {
  const initial = (user?.displayName?.[0] || user?.username?.[0] || "?").toUpperCase();
  const recentConvos = conversations.slice(0, 6);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="ax-dash">
      {/* ── Top Bar ── */}
      <header className="ax-dash-header">
        <div className="ax-dash-brand">
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#000",
          }}>⬡</div>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: "0.1em",
            background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>AXIOM STUDIO</span>
        </div>

        <div className="ax-dash-header-right">
          {/* Credit counter - always visible */}
          <div className="ax-dash-credit-pill">
            <Zap size={12} style={{ color: credits > 50 ? "#22c55e" : credits > 10 ? "#eab308" : "#ef4444" }} />
            <span className="ax-dash-credit-num">{credits}</span>
            <span className="ax-dash-credit-label">credits</span>
            <button className="ax-dash-credit-buy" onClick={onOpenCredits} title="Buy credits">
              <Plus size={10} />
            </button>
          </div>

          {/* User avatar */}
          <button className="ax-dash-avatar-btn" onClick={() => {}}>
            <div className="ax-dash-avatar">{initial}</div>
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="ax-dash-content">
        <div className="ax-dash-inner">

          {/* ── Hero Section ── */}
          <section className="ax-dash-hero">
            <h1 className="ax-dash-greeting">
              {greeting}, <span style={{
                background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{user?.displayName || user?.username || "Builder"}</span>
            </h1>
            <p className="ax-dash-subtitle">What would you like to build today?</p>

            {/* Enter IDE CTA */}
            <button className="ax-dash-enter-btn" onClick={onEnterIDE}>
              <Code2 size={18} />
              <span>Open IDE</span>
              <ArrowRight size={16} />
            </button>
          </section>

          {/* ── Stats Strip ── */}
          <section className="ax-dash-stats">
            <div className="ax-dash-stat-card">
              <div className="ax-dash-stat-icon" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
                <Zap size={16} />
              </div>
              <div>
                <div className="ax-dash-stat-val">{credits}</div>
                <div className="ax-dash-stat-label">Credits</div>
              </div>
              <button className="ax-dash-stat-action" onClick={onOpenCredits}>
                <CreditCard size={12} /> Buy
              </button>
            </div>
            <div className="ax-dash-stat-card">
              <div className="ax-dash-stat-icon" style={{ background: "rgba(14,165,233,0.1)", color: "#38bdf8" }}>
                <MessageSquare size={16} />
              </div>
              <div>
                <div className="ax-dash-stat-val">{conversations.length}</div>
                <div className="ax-dash-stat-label">Conversations</div>
              </div>
            </div>
            <div className="ax-dash-stat-card">
              <div className="ax-dash-stat-icon" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                <Bot size={16} />
              </div>
              <div>
                <div className="ax-dash-stat-val">{agents.length}</div>
                <div className="ax-dash-stat-label">AI Agents</div>
              </div>
            </div>
          </section>

          {/* ── Quick Starts ── */}
          <section>
            <h2 className="ax-dash-section-title">Quick Start</h2>
            <div className="ax-dash-quickstarts">
              {QUICK_STARTS.map((qs, i) => {
                const Icon = qs.icon;
                return (
                  <button
                    key={i}
                    className="ax-dash-qs-card"
                    style={{ background: qs.gradient, borderColor: `${qs.color}20` }}
                    onClick={() => { onNewChat(); onEnterIDE(); }}
                  >
                    <div className="ax-dash-qs-icon" style={{ color: qs.color }}>
                      <Icon size={20} />
                    </div>
                    <div className="ax-dash-qs-text">
                      <div className="ax-dash-qs-title">{qs.title}</div>
                      <div className="ax-dash-qs-desc">{qs.desc}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Recent Conversations ── */}
          {recentConvos.length > 0 && (
            <section>
              <h2 className="ax-dash-section-title">
                <Clock size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                Recent
              </h2>
              <div className="ax-dash-recent">
                {recentConvos.map((c) => (
                  <button
                    key={c.id}
                    className="ax-dash-recent-item"
                    onClick={() => { onSelectConvo(c.id); onEnterIDE(); }}
                  >
                    <div className="ax-dash-recent-icon">
                      <MessageSquare size={14} />
                    </div>
                    <div className="ax-dash-recent-info">
                      <div className="ax-dash-recent-title">{c.title || "Untitled"}</div>
                      <div className="ax-dash-recent-meta">
                        {c.updatedAt || c.createdAt ? timeAgo(c.updatedAt || c.createdAt!) : ""}
                      </div>
                    </div>
                    <ArrowRight size={14} style={{ color: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Footer ── */}
          <footer className="ax-dash-footer">
            <div className="ax-dash-footer-links">
              <button onClick={onOpenCredits} className="ax-dash-footer-link">
                <CreditCard size={12} /> Credits
              </button>
              <button onClick={onEnterIDE} className="ax-dash-footer-link">
                <Settings size={12} /> Settings
              </button>
              <button onClick={onLogout} className="ax-dash-footer-link ax-dash-footer-danger">
                <LogOut size={12} /> Sign Out
              </button>
            </div>
            <div className="ax-dash-footer-copy">
              DarkWave Studios LLC · Trust Layer SSO
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
