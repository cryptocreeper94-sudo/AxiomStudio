/**
 * Axiom Studio — Tenant Dashboard
 * Standalone route. Projects, agents, templates, settings.
 * Apex Brutalist — no gradients, no glow, heavy materials.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  FolderGit2, Plus, Zap, Bot, Layers, Settings, LogOut,
  ArrowRight, Clock, Code2, Globe, Terminal, Rocket,
  CreditCard, MessageSquare, Shield, Brain, Sparkles,
  Cpu, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft,
  Package, BarChart3, Layout,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import * as api from "../lib/api";
import "./dashboard.css";

type View = "projects" | "templates" | "agents" | "usage" | "settings";

const AGENT_ICON_MAP: Record<string, any> = {
  Brain, Zap, Sparkles, MessageSquare, Code2, Shield, Layers, Cpu,
  MessageCircle: MessageSquare, // fallback
};

const TEMPLATES = [
  {
    id: "app",
    icon: "📱",
    title: "App",
    desc: "React single-page application with routing, state management, and a polished UI shell.",
    stack: ["React", "Vite", "TypeScript", "CSS"],
  },
  {
    id: "website",
    icon: "🌐",
    title: "Website",
    desc: "Static marketing site with responsive layout, SEO optimization, and modern design.",
    stack: ["HTML", "CSS", "JavaScript"],
  },
  {
    id: "fullstack",
    icon: "⚡",
    title: "Full Stack",
    desc: "Express API + React client with database integration, auth, and deployment config.",
    stack: ["React", "Express", "PostgreSQL", "TypeScript"],
  },
  {
    id: "platform",
    icon: "🏗️",
    title: "Platform",
    desc: "Multi-tenant SaaS architecture with user auth, admin dashboard, billing, and API layer.",
    stack: ["Next.js", "Prisma", "Stripe", "PostgreSQL"],
  },
  {
    id: "api",
    icon: "🔌",
    title: "API Server",
    desc: "RESTful or GraphQL API with middleware, validation, rate limiting, and documentation.",
    stack: ["Express", "TypeScript", "Zod", "Swagger"],
  },
  {
    id: "cli",
    icon: "▶️",
    title: "CLI Tool",
    desc: "Command-line application with argument parsing, interactive prompts, and progress output.",
    stack: ["Node.js", "Commander", "Chalk", "TypeScript"],
  },
];

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

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState<View>("projects");
  const [collapsed, setCollapsed] = useState(false);

  // Fix body scroll
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.background = "#0a0b10";
    return () => { document.body.style.overflow = ""; document.body.style.background = ""; };
  }, []);

  // Fetch data
  const { data: creditData } = useQuery({
    queryKey: ["credits", token],
    queryFn: () => api.fetchCredits(token!),
    enabled: !!token,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", token],
    queryFn: () => api.fetchConversations(token!),
    enabled: !!token,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents", token],
    queryFn: async () => {
      const res = await fetch("/api/agent/agents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  // Workspace projects
  const { data: projects = [] } = useQuery({
    queryKey: ["workspace-tree", token],
    queryFn: async () => {
      try {
        const res = await fetch("/api/workspace/tree", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.children || data || []).filter(
          (item: any) => item.type === "directory" || item.isDirectory
        );
      } catch { return []; }
    },
    enabled: !!token,
  });

  // If no token, redirect to IDE (which has login screen)
  if (!token) {
    setLocation("/ide");
    return null;
  }

  const credits = creditData?.credits ?? 0;
  const initial = (user?.displayName?.[0] || user?.username?.[0] || "?").toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const handleNewProject = () => {
    setLocation("/ide");
  };

  const handleOpenProject = (name: string) => {
    // Navigate to IDE — project name could be used for workspace selection
    setLocation("/ide");
  };

  const handleTemplate = (templateId: string) => {
    // Navigate to IDE with template hint
    setLocation("/ide");
  };

  const sidebarItems: { id: View; label: string; icon: any }[] = [
    { id: "projects", label: "Projects", icon: FolderGit2 },
    { id: "templates", label: "Templates", icon: Layout },
    { id: "agents", label: "AI Agents", icon: Bot },
    { id: "usage", label: "Usage & Limits", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="ax-dashboard">
      {/* ── Top Bar ── */}
      <header className="ax-topbar">
        <div className="ax-topbar-brand" onClick={() => setActiveView("projects")}>
          <div className="ax-topbar-logo">⬡</div>
          <span className="ax-topbar-title">Axiom Studio</span>
        </div>
        <div className="ax-topbar-right">
          <div className="ax-topbar-credits">
            <Zap size={12} style={{ color: credits > 50 ? "#22c55e" : credits > 10 ? "#eab308" : "#ef4444" }} />
            <span>{credits.toLocaleString()}</span>
            credits
          </div>
          <div className="ax-topbar-avatar" title={user?.displayName || user?.username}>
            {initial}
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Main ── */}
      <div className="ax-dashboard-body">

        {/* ── Sidebar ── */}
        <aside className={`ax-sidebar ${collapsed ? "collapsed" : ""}`}>
          <nav className="ax-sidebar-nav">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`ax-sidebar-item ${activeView === item.id ? "active" : ""}`}
                  onClick={() => setActiveView(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="ax-sidebar-icon"><Icon size={18} /></span>
                  <span className="ax-sidebar-label">{item.label}</span>
                </button>
              );
            })}

            <div className="ax-sidebar-divider" />

            <button
              className="ax-sidebar-item"
              onClick={() => setLocation("/ide")}
              title={collapsed ? "Open IDE" : undefined}
            >
              <span className="ax-sidebar-icon"><Terminal size={18} /></span>
              <span className="ax-sidebar-label">Open IDE</span>
            </button>

            <button
              className="ax-sidebar-item"
              onClick={() => setLocation("/depot")}
              title={collapsed ? "Axiom Depot" : undefined}
            >
              <span className="ax-sidebar-icon"><Package size={18} /></span>
              <span className="ax-sidebar-label">Axiom Depot</span>
            </button>
          </nav>

          <div className="ax-sidebar-footer">
            <button
              className="ax-sidebar-item"
              onClick={logout}
              style={{ color: "#475569" }}
            >
              <span className="ax-sidebar-icon"><LogOut size={18} /></span>
              <span className="ax-sidebar-label">Sign Out</span>
            </button>
            <button
              className="ax-sidebar-collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="ax-main">
          <div className="ax-main-inner">

            {/* ══ PROJECTS VIEW ══ */}
            {activeView === "projects" && (
              <>
                <h1 className="ax-greeting">
                  {greeting}, <span className="ax-greeting-accent">{user?.displayName || user?.username || "Builder"}</span>
                </h1>
                <p className="ax-subtitle">What would you like to build today?</p>

                {/* Quick Actions */}
                <div className="ax-quick-actions">
                  <button className="ax-quick-card" onClick={handleNewProject}>
                    <div className="ax-quick-card-icon" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
                      <Plus size={18} />
                    </div>
                    <div className="ax-quick-card-title">New Project</div>
                    <div className="ax-quick-card-desc">Start from scratch with AI assistance</div>
                  </button>
                  <button className="ax-quick-card" onClick={handleNewProject}>
                    <div className="ax-quick-card-icon" style={{ background: "rgba(14,165,233,0.1)", color: "#38bdf8" }}>
                      <Globe size={18} />
                    </div>
                    <div className="ax-quick-card-title">Import from GitHub</div>
                    <div className="ax-quick-card-desc">Clone a repository and start working</div>
                  </button>
                  <button className="ax-quick-card" onClick={() => setActiveView("templates")}>
                    <div className="ax-quick-card-icon" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>
                      <Layers size={18} />
                    </div>
                    <div className="ax-quick-card-title">From Template</div>
                    <div className="ax-quick-card-desc">App, Website, Full Stack, Platform</div>
                  </button>
                  <button className="ax-quick-card" onClick={handleNewProject}>
                    <div className="ax-quick-card-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                      <Sparkles size={18} />
                    </div>
                    <div className="ax-quick-card-title">AI Code Generation</div>
                    <div className="ax-quick-card-desc">Describe what you want to build</div>
                  </button>
                </div>

                {/* Recent Projects */}
                <h2 className="ax-section-title">
                  <Clock size={12} /> Recent Projects
                </h2>
                {projects.length > 0 ? (
                  <div className="ax-projects-grid">
                    {projects.map((p: any) => (
                      <button
                        key={p.name || p.path}
                        className="ax-project-card"
                        onClick={() => handleOpenProject(p.name)}
                      >
                        <div className="ax-project-card-name">
                          <FolderGit2 size={14} style={{ color: "#06b6d4" }} />
                          {p.name || p.path?.split("/").pop()}
                        </div>
                        <div className="ax-project-card-meta">
                          {p.modifiedAt && <span>{timeAgo(p.modifiedAt)}</span>}
                          <span>{p.children?.length || 0} files</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ax-empty-state">
                    <div className="ax-empty-state-icon">📁</div>
                    <div className="ax-empty-state-text">No projects yet. Create one above.</div>
                  </div>
                )}

                {/* Recent Conversations */}
                {conversations.length > 0 && (
                  <>
                    <h2 className="ax-section-title">
                      <MessageSquare size={12} /> Recent Conversations
                    </h2>
                    <div className="ax-projects-grid">
                      {conversations.slice(0, 6).map((c: any) => (
                        <button
                          key={c.id}
                          className="ax-project-card"
                          onClick={() => setLocation("/ide")}
                        >
                          <div className="ax-project-card-name">
                            <MessageSquare size={14} style={{ color: "#38bdf8" }} />
                            {c.title || "Untitled"}
                          </div>
                          <div className="ax-project-card-meta">
                            {c.updatedAt && <span>{timeAgo(c.updatedAt)}</span>}
                            {c.agentId && <span>{c.agentId}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══ TEMPLATES VIEW ══ */}
            {activeView === "templates" && (
              <>
                <h1 className="ax-greeting">Templates</h1>
                <p className="ax-subtitle">Start with a proven architecture. Each template scaffolds a complete project.</p>
                <div className="ax-templates-grid">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} className="ax-template-card" onClick={() => handleTemplate(t.id)}>
                      <div className="ax-template-card-icon">{t.icon}</div>
                      <div className="ax-template-card-title">{t.title}</div>
                      <div className="ax-template-card-desc">{t.desc}</div>
                      <div className="ax-template-card-stack">
                        {t.stack.map((s) => (
                          <span key={s} className="ax-template-card-tag">{s}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ══ AGENTS VIEW ══ */}
            {activeView === "agents" && (
              <>
                <h1 className="ax-greeting">AI Agents</h1>
                <p className="ax-subtitle">
                  {agents.length} agents available. Auto-routing selects the best agent for each task.
                </p>
                <div className="ax-agents-grid">
                  {(agents.length > 0 ? agents : []).map((a: any) => {
                    const IconComponent = AGENT_ICON_MAP[a.icon] || Brain;
                    return (
                      <div key={a.id} className="ax-agent-card">
                        <div className="ax-agent-card-header">
                          <div className="ax-agent-card-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <IconComponent size={16} style={{ color: "#06b6d4" }} />
                            {a.name}
                          </div>
                          <span className={`ax-agent-card-cost ${a.creditCost === 0 ? "free" : ""}`}>
                            {a.creditCost === 0 ? "Free" : `${a.creditCost} cr`}
                          </span>
                        </div>
                        <div className="ax-agent-card-desc">{a.description}</div>
                        <div className="ax-agent-card-model">{a.model} · {a.provider}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ══ USAGE VIEW ══ */}
            {activeView === "usage" && (
              <>
                <h1 className="ax-greeting">Usage & Limits</h1>
                <p className="ax-subtitle">Your account usage and credit balance.</p>
                <div className="ax-usage-stats">
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Credit Balance</div>
                    <div className="ax-usage-card-value credits">{credits.toLocaleString()}</div>
                  </div>
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Conversations</div>
                    <div className="ax-usage-card-value">{conversations.length}</div>
                  </div>
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Available Agents</div>
                    <div className="ax-usage-card-value">{agents.length || 9}</div>
                  </div>
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Account Tier</div>
                    <div className="ax-usage-card-value" style={{ fontSize: 18, color: "#06b6d4" }}>OWNER</div>
                  </div>
                </div>

                <h2 className="ax-section-title">
                  <BarChart3 size={12} /> Agent Credit Costs
                </h2>
                <div className="ax-agents-grid">
                  {(agents.length > 0 ? agents : []).map((a: any) => (
                    <div key={a.id} className="ax-agent-card">
                      <div className="ax-agent-card-header">
                        <div className="ax-agent-card-name">{a.name}</div>
                        <span className={`ax-agent-card-cost ${a.creditCost === 0 ? "free" : ""}`}>
                          {a.creditCost === 0 ? "Free" : `${a.creditCost} cr/msg`}
                        </span>
                      </div>
                      <div className="ax-agent-card-model">{a.model}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ SETTINGS VIEW ══ */}
            {activeView === "settings" && (
              <>
                <h1 className="ax-greeting">Settings</h1>
                <p className="ax-subtitle">Account preferences and configuration.</p>
                <div className="ax-usage-stats">
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Display Name</div>
                    <div className="ax-usage-card-value" style={{ fontSize: 16 }}>
                      {user?.displayName || user?.username || "—"}
                    </div>
                  </div>
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Auth Method</div>
                    <div className="ax-usage-card-value" style={{ fontSize: 16 }}>
                      {user?.authMethod || "Local"}
                    </div>
                  </div>
                  <div className="ax-usage-card">
                    <div className="ax-usage-card-label">Role</div>
                    <div className="ax-usage-card-value" style={{ fontSize: 16, color: "#06b6d4" }}>
                      {user?.role || "Owner"}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 24 }}>
                  <button
                    className="ax-quick-card"
                    onClick={() => setLocation("/ide")}
                    style={{ maxWidth: 300 }}
                  >
                    <div className="ax-quick-card-icon" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
                      <Settings size={18} />
                    </div>
                    <div className="ax-quick-card-title">Advanced Settings</div>
                    <div className="ax-quick-card-desc">API keys, themes, and IDE preferences are in the IDE settings panel</div>
                  </button>
                </div>
              </>
            )}

          </div>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="ax-dashboard-footer">
        <div className="ax-dashboard-footer-badge">
          <span>DarkWave Studios LLC</span>
          <span className="ax-lume-badge">LUME-V SECURED</span>
        </div>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}
