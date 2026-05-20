/**
 * Axiom Studio — Profile Dashboard
 * Full-page profile/dashboard with ecosystem badges, credits,
 * projects, and account settings.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Zap, MessageSquare, FolderGit2, Bot,
  Shield, Crown, ChevronRight, LogOut, Settings,
  Palette, Brain, CreditCard, ExternalLink,
  Fingerprint, Key, Globe, Smartphone,
  Code2, BookOpen, Layers, Radio, Compass, Lock,
  Upload,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import * as api from "../lib/api";
import "./profile.css";

/* Ecosystem apps */
const ECOSYSTEM_APPS = [
  { name: "Axiom Studio", icon: <Brain className="w-4 h-4" />, color: "#06b6d4", bg: "rgba(6,182,212,0.12)", url: "https://axiomstudio.dev", status: "Active" },
  { name: "Lume Lang", icon: <Code2 className="w-4 h-4" />, color: "#38bdf8", bg: "rgba(14,165,233,0.12)", url: "https://lume-lang.org", status: "v1.1.0" },
  { name: "AXIOM42", icon: <Layers className="w-4 h-4" />, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", url: "https://axiom42.dev", status: "Active" },
  { name: "HydroCore", icon: <Globe className="w-4 h-4" />, color: "#22c55e", bg: "rgba(34,197,94,0.12)", url: "https://hydrocore.dev", status: "Active" },
  { name: "Meridian Canon", icon: <Compass className="w-4 h-4" />, color: "#ec4899", bg: "rgba(236,72,153,0.12)", url: "https://meridiancanon.com", status: "Active" },
  { name: "Trust Layer", icon: <Shield className="w-4 h-4" />, color: "#14b8a6", bg: "rgba(20,184,166,0.12)", url: "https://dwtl.io", status: "SSO" },
  { name: "Signal Gateway", icon: <Radio className="w-4 h-4" />, color: "#6366f1", bg: "rgba(99,102,241,0.12)", url: "#", status: "Beta" },
];

export default function ProfileDashboard() {
  const { token, user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Fix body scroll
  useEffect(() => {
    document.body.classList.add("profile-page-active");
    return () => document.body.classList.remove("profile-page-active");
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

  const { data: sub } = useQuery({
    queryKey: ["subscription", token],
    queryFn: async () => {
      const res = await fetch("/api/agent/subscription", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  // Workspace files as "projects" — top-level directories
  const { data: workspaceTree = [] } = useQuery({
    queryKey: ["workspace-tree", token],
    queryFn: async () => {
      try {
        const res = await fetch("/api/workspace/tree", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return [];
        const data = await res.json();
        // Filter for top-level directories
        return (data.children || data || []).filter((item: any) => item.type === "directory" || item.isDirectory);
      } catch { return []; }
    },
    enabled: !!token,
  });

  if (!token || !user) {
    setLocation("/");
    return null;
  }

  const initial = (user.displayName?.[0] || user.username?.[0] || "?").toUpperCase();
  const tierName = user.role === "owner" ? "Owner" : (sub?.tierName || "Free");
  const tierColorMap: Record<string, string> = {
    free: "#94a3b8", developer: "#06b6d4", professional: "#38bdf8",
    business: "#f59e0b", enterprise: "#ef4444",
  };
  const tierColor = user.role === "owner" ? "#06b6d4" : (tierColorMap[sub?.tier || "free"] || "#94a3b8");

  const credits = creditData?.credits ?? 0;
  const maxCredits = sub?.creditsPerMonth || 200;
  const messagesUsed = sub?.messagesUsed ?? conversations.length;
  const projectCount = workspaceTree.length || 0;

  return (
    <div className="profile-page">
      {/* Top Bar */}
      <div className="profile-topbar">
        <div className="profile-topbar-left">
          <button className="profile-back-btn" onClick={() => setLocation("/ide")}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back to IDE
          </button>
        </div>
        <span className="profile-topbar-title">PROFILE</span>
        <div style={{ width: 100 }} /> {/* Spacer for centering */}
      </div>

      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">{initial}</div>
        <h1 className="profile-name">{user.displayName || user.username || "User"}</h1>
        <p className="profile-email">{user.username || ""}</p>
        <div
          className="profile-tier-badge"
          style={{
            background: `${tierColor}15`,
            border: `1px solid ${tierColor}30`,
            color: tierColor,
          }}
        >
          <Crown style={{ width: 12, height: 12 }} />
          {tierName} Tier
        </div>

        {/* Trust Layer Badge */}
        <div className="trust-layer-badge">
          <div className="tl-icon">
            <Shield style={{ width: 10, height: 10 }} />
          </div>
          <div>
            <div className="tl-text">Trust Layer SSO — Verified</div>
            <div className="tl-id">ID: {user.id?.slice(0, 12) || "—"}...</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="profile-content">
        {/* ── Stats ── */}
        <div className="profile-section-label">Overview</div>
        <div className="profile-stats">
          <div className="profile-stat-card credits">
            <div className="profile-stat-icon"><Zap style={{ width: 14, height: 14 }} /></div>
            <div className="profile-stat-value">{credits}</div>
            <div className="profile-stat-label">Credits</div>
          </div>
          <div className="profile-stat-card messages">
            <div className="profile-stat-icon"><MessageSquare style={{ width: 14, height: 14 }} /></div>
            <div className="profile-stat-value">{messagesUsed}</div>
            <div className="profile-stat-label">Conversations</div>
          </div>
          <div className="profile-stat-card projects">
            <div className="profile-stat-icon"><FolderGit2 style={{ width: 14, height: 14 }} /></div>
            <div className="profile-stat-value">{projectCount}</div>
            <div className="profile-stat-label">Projects</div>
          </div>
          <div className="profile-stat-card sessions">
            <div className="profile-stat-icon"><Bot style={{ width: 14, height: 14 }} /></div>
            <div className="profile-stat-value">{conversations.length}</div>
            <div className="profile-stat-label">AI Sessions</div>
          </div>
        </div>

        {/* ── Credits ── */}
        <div className="profile-credit-bar">
          <div className="profile-credit-meter">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>AI Credits</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                {credits} / {maxCredits === 999999 ? "∞" : maxCredits}
              </span>
            </div>
            <div className="profile-credit-track">
              <div
                className="profile-credit-fill"
                style={{ width: `${Math.min((credits / (maxCredits === 999999 ? credits + 50 : maxCredits)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <button className="profile-buy-btn" onClick={() => setLocation("/ide")}>
            <CreditCard style={{ width: 14, height: 14 }} />
            Buy Credits
          </button>
        </div>

        {/* ── Projects ── */}
        <div className="profile-section-label">Projects & Workspaces</div>
        <div className="profile-projects">
          {workspaceTree.length > 0 ? (
            workspaceTree.map((dir: any, i: number) => (
              <div className="project-card" key={i} onClick={() => setLocation("/ide")}>
                <div className="project-icon">
                  <FolderGit2 style={{ width: 16, height: 16 }} />
                </div>
                <div className="project-info">
                  <div className="project-name">{dir.name || dir.path?.split("/").pop() || `Project ${i + 1}`}</div>
                  <div className="project-meta">
                    {dir.children?.length || "—"} items · workspace/{dir.name || ""}
                  </div>
                </div>
                <ChevronRight className="project-arrow" style={{ width: 16, height: 16 }} />
              </div>
            ))
          ) : (
            <div className="project-card" onClick={() => setLocation("/ide")}>
              <div className="project-icon">
                <FolderGit2 style={{ width: 16, height: 16 }} />
              </div>
              <div className="project-info">
                <div className="project-name">Default Workspace</div>
                <div className="project-meta">Open the IDE to create files and start coding</div>
              </div>
              <ChevronRight className="project-arrow" style={{ width: 16, height: 16 }} />
            </div>
          )}
        </div>

        {/* ── Ecosystem ── */}
        <div className="profile-section-label">DarkWave Ecosystem</div>
        <div className="profile-ecosystem">
          {ECOSYSTEM_APPS.map((app, i) => (
            <a
              key={i}
              className="eco-app-card"
              href={app.url}
              target={app.url.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
            >
              <div className="eco-app-icon" style={{ background: app.bg, color: app.color }}>
                {app.icon}
              </div>
              <div>
                <div className="eco-app-name">{app.name}</div>
                <div className="eco-app-status" style={{ color: app.color }}>{app.status}</div>
              </div>
            </a>
          ))}
        </div>

        {/* ── Quick Settings ── */}
        <div className="profile-section-label">Settings</div>
        <div className="profile-settings-grid">
          <div className="settings-card" onClick={() => setLocation("/ide")}>
            <div className="settings-icon" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
              <Brain style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="settings-label">Default Agent</div>
              <div className="settings-value">Auto-Route (Smart)</div>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon" style={{ background: "rgba(14,165,233,0.1)", color: "#38bdf8" }}>
              <Palette style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="settings-label">Theme</div>
              <div className="settings-value">Dark (Default)</div>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              <Fingerprint style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="settings-label">Biometrics</div>
              <div className="settings-value">Not configured</div>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
              <Key style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="settings-label">Quick PIN</div>
              <div className="settings-value">Not set</div>
            </div>
          </div>
        </div>

        {/* ── Account & Security ── */}
        <div className="profile-section-label">Account</div>
        <div className="profile-settings-grid">
          <div className="settings-card">
            <div className="settings-icon" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
              <Lock style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="settings-label">Change Password</div>
              <div className="settings-value">Update your credentials</div>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon" style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9" }}>
              <Upload style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div className="settings-label">Export Data</div>
              <div className="settings-value">Download workspace & chats</div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="profile-actions">
          <button className="profile-action-btn secondary" onClick={() => setLocation("/ide")}>
            <Settings style={{ width: 16, height: 16 }} />
            IDE Settings
          </button>
          <button className="profile-action-btn danger" onClick={() => { logout(); setLocation("/"); }}>
            <LogOut style={{ width: 16, height: 16 }} />
            Sign Out
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="profile-footer">
          <p>Trust Layer SSO — synced across all DarkWave ecosystem apps</p>
        </div>
      </div>
    </div>
  );
}
