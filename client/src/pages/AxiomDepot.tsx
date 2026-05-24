/**
 * Axiom Depot — Code Repository & Backup Platform
 * A premium GitHub-alternative landing page and dashboard.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch, Star, GitCommit, FolderOpen, Plus, Search,
  Lock, Globe, Clock, Download, Archive, BarChart3, Activity,
  Users, Shield, Zap, Code2, ChevronDown, Menu, X, Eye,
  BookOpen, Settings, Filter, ArrowUpRight, Sparkles,
  Database, HardDrive, TrendingUp, CheckCircle2, Layers
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import "./axiom-depot.css";

// ── Types ──
interface Repo {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_private: boolean;
  language: string;
  stars: number;
  forks: number;
  file_count: number;
  snapshot_count: number;
  total_size_bytes: number;
  last_snapshot_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  repos: number;
  snapshots: number;
  totalSizeBytes: number;
  starsReceived: number;
}

interface ContributionDay {
  date: string;
  count: number;
}

// ── Helpers ──
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const timeAgo = (date: string | null) => {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572a5",
  Rust: "#dea584", Go: "#00add8", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", "C#": "#239120", Ruby: "#701516", PHP: "#4f5d95",
  Swift: "#f05138", Kotlin: "#a97bff", HTML: "#e34c26", CSS: "#563d7c",
  SCSS: "#c6538c", Markdown: "#083fa1", JSON: "#292929", YAML: "#cb171e",
  SQL: "#e38c00", Shell: "#89e051", Dart: "#00b4ab", Vue: "#41b883",
  Unknown: "#64748b",
};

// ── Contribution Heatmap ──
function ContributionHeatmap({ data }: { data: ContributionDay[] }) {
  const weeks = 52;
  const days = 7;
  const dataMap = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach(d => m.set(d.date, Number(d.count)));
    return m;
  }, [data]);

  const cells = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const key = date.toISOString().split("T")[0];
        const count = dataMap.get(key) || 0;
        result.push({ key, count, week: weeks - 1 - w, day: d });
      }
    }
    return result;
  }, [dataMap]);

  const getColor = (count: number) => {
    if (count === 0) return "var(--depot-cell-empty, rgba(255,255,255,0.04))";
    if (count <= 2) return "#0e4429";
    if (count <= 5) return "#006d32";
    if (count <= 10) return "#26a641";
    return "#39d353";
  };

  return (
    <div className="depot-heatmap">
      <div className="depot-heatmap-grid">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className="depot-heatmap-cell"
            style={{ backgroundColor: getColor(cell.count), gridColumn: cell.week + 1, gridRow: cell.day + 1 }}
            title={`${cell.key}: ${cell.count} contributions`}
          />
        ))}
      </div>
      <div className="depot-heatmap-legend">
        <span>Less</span>
        {[0, 1, 3, 6, 11].map(v => (
          <div key={v} className="depot-heatmap-cell" style={{ backgroundColor: getColor(v), width: 10, height: 10 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Create Repo Modal ──
function CreateRepoModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (repo: Repo) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return alert("Name required");
    setLoading(true);
    try {
      const res = await fetch("/api/depot/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), is_private: isPrivate }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert("Repository created!");
      onCreated(data.repo);
      setName(""); setDesc(""); setIsPrivate(false);
      onClose();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="depot-modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="depot-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="depot-modal-header">
          <h3>Create a new repository</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="depot-modal-body">
          <label className="depot-label">Repository name</label>
          <input
            className="depot-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-awesome-project"
            autoFocus
          />
          <label className="depot-label">Description <span className="depot-optional">(optional)</span></label>
          <input
            className="depot-input"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="A short description of your project"
          />
          <div className="depot-visibility-options">
            <button
              className={`depot-visibility-btn ${!isPrivate ? "active" : ""}`}
              onClick={() => setIsPrivate(false)}
            >
              <Globe className="w-4 h-4" /> Public
            </button>
            <button
              className={`depot-visibility-btn ${isPrivate ? "active" : ""}`}
              onClick={() => setIsPrivate(true)}
            >
              <Lock className="w-4 h-4" /> Private
            </button>
          </div>
        </div>
        <div className="depot-modal-footer">
          <button className="depot-btn-primary" onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create repository"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Repo Card ──
function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link href={`/depot/repo/${repo.slug}`}>
      <motion.div
        className="depot-repo-card"
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="depot-repo-header">
          <div className="depot-repo-name">
            {repo.is_private ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            <span>{repo.name}</span>
          </div>
          <div className="depot-repo-badges">
            {repo.stars > 0 && (
              <span className="depot-badge"><Star className="w-3 h-3" /> {repo.stars}</span>
            )}
          </div>
        </div>
        {repo.description && (
          <p className="depot-repo-desc">{repo.description}</p>
        )}
        <div className="depot-repo-meta">
          {repo.language !== "Unknown" && (
            <span className="depot-meta-item">
              <span className="depot-lang-dot" style={{ backgroundColor: LANG_COLORS[repo.language] || LANG_COLORS.Unknown }} />
              {repo.language}
            </span>
          )}
          <span className="depot-meta-item">
            <FolderOpen className="w-3 h-3" /> {repo.file_count} files
          </span>
          <span className="depot-meta-item">
            <GitCommit className="w-3 h-3" /> {repo.snapshot_count} snapshots
          </span>
          <span className="depot-meta-item">
            <HardDrive className="w-3 h-3" /> {formatBytes(Number(repo.total_size_bytes))}
          </span>
          <span className="depot-meta-item">
            <Clock className="w-3 h-3" /> {timeAgo(repo.last_snapshot_at || repo.updated_at)}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Main Component ──
export default function AxiomDepot() {
  const { user, isLoading: authLoading } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [stats, setStats] = useState<Stats>({ repos: 0, snapshots: 0, totalSizeBytes: 0, starsReceived: 0 });
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoggedIn = !!user;

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    Promise.all([
      fetch("/api/depot/repos", { credentials: "include" }).then(r => r.json()),
      fetch("/api/depot/stats", { credentials: "include" }).then(r => r.json()),
      fetch("/api/depot/contributions", { credentials: "include" }).then(r => r.json()),
    ]).then(([repoData, statsData, contribData]) => {
      setRepos(repoData.repos || []);
      setStats(statsData);
      setContributions(contribData.contributions || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [isLoggedIn]);

  const filteredRepos = useMemo(() => {
    let r = repos;
    if (filter === "public") r = r.filter(x => !x.is_private);
    if (filter === "private") r = r.filter(x => x.is_private);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(x => x.name.toLowerCase().includes(q) || x.description?.toLowerCase().includes(q));
    }
    return r;
  }, [repos, filter, searchQuery]);

  // SEO
  useEffect(() => {
    document.title = "Axiom Depot — Code Repository & Backup Platform";
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", "Axiom Depot is a secure code repository and backup platform. Store, version, and browse your projects with premium UI and Axiom Studio integration.");
    setMeta("og:title", "Axiom Depot — Code Repository & Backup", true);
    setMeta("og:description", "Secure code backup with snapshots, analytics, and Axiom Studio integration.", true);
    setMeta("og:url", "https://axiomdepot.tlid.io", true);
  }, []);

  // ── Unauthenticated Landing ──
  if (!isLoggedIn && !authLoading) {
    return (
      <div className="depot-landing">
        <nav className="depot-nav">
          <div className="depot-nav-inner">
            <div className="depot-nav-brand">
              <div className="depot-logo"><Archive className="w-5 h-5" /></div>
              <span className="depot-logo-text">Axiom Depot</span>
            </div>
            <div className="depot-nav-actions">
              <button className="depot-btn-ghost" onClick={() => window.location.href = '/'}>Sign In</button>
              <button className="depot-btn-primary" onClick={() => window.location.href = '/'}>Get Started</button>
            </div>
          </div>
        </nav>

        <section className="depot-hero">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="depot-hero-content"
          >
            <div className="depot-hero-badge">
              <Sparkles className="w-3.5 h-3.5" /> Part of the Axiom Ecosystem
            </div>
            <h1 className="depot-hero-title">
              Your code,<br />
              <span className="depot-gradient-text">backed up beautifully.</span>
            </h1>
            <p className="depot-hero-sub">
              Axiom Depot is a secure code repository and backup platform. Store, version, and browse your projects with a premium interface that makes GitHub feel like a spreadsheet.
            </p>
            <div className="depot-hero-ctas">
              <button className="depot-btn-primary depot-btn-lg" onClick={() => window.location.href = '/'}>
                Start for Free <ArrowUpRight className="w-4 h-4" />
              </button>
              <a href="https://axiomstudio.dev" className="depot-btn-ghost depot-btn-lg" target="_blank" rel="noopener">
                Open Axiom Studio
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="depot-hero-features"
          >
            {[
              { icon: <Archive className="w-5 h-5" />, title: "Snapshot Versioning", desc: "Save your entire project state with one click. Browse any version." },
              { icon: <Shield className="w-5 h-5" />, title: "Ecosystem SSO", desc: "One Trust Layer account. Same login across all DarkWave apps." },
              { icon: <BarChart3 className="w-5 h-5" />, title: "Contribution Analytics", desc: "Track your coding activity with contribution heatmaps and stats." },
              { icon: <Zap className="w-5 h-5" />, title: "Studio Integration", desc: "Push directly from Axiom Studio cloud IDE to your Depot repos." },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="depot-feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="depot-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    );
  }

  // ── Authenticated Dashboard ──
  return (
    <div className="depot-app">
      {/* Nav */}
      <nav className="depot-nav">
        <div className="depot-nav-inner">
          <div className="depot-nav-brand">
            <div className="depot-logo"><Archive className="w-5 h-5" /></div>
            <span className="depot-logo-text">Axiom Depot</span>
          </div>
          <div className="depot-nav-search">
            <Search className="w-4 h-4" />
            <input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="depot-nav-actions">
            <button className="depot-btn-primary depot-btn-sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
          <button className="depot-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="depot-mobile-menu">
          <button onClick={() => { setShowCreate(true); setMobileMenuOpen(false); }}>
            <Plus className="w-4 h-4" /> New Repository
          </button>
          <a href="https://axiomstudio.dev" target="_blank" rel="noopener">
            <Code2 className="w-4 h-4" /> Axiom Studio
          </a>
          <a href="https://dwtl.io">
            <Shield className="w-4 h-4" /> Trust Layer
          </a>
        </div>
      )}

      <main className="depot-main">
        {/* Stats Bar */}
        <div className="depot-stats-bar">
          {[
            { icon: <Database className="w-4 h-4" />, label: "Repos", value: stats.repos },
            { icon: <GitCommit className="w-4 h-4" />, label: "Snapshots", value: stats.snapshots },
            { icon: <HardDrive className="w-4 h-4" />, label: "Storage", value: formatBytes(stats.totalSizeBytes) },
            { icon: <Star className="w-4 h-4" />, label: "Stars", value: stats.starsReceived },
          ].map((s, i) => (
            <div key={i} className="depot-stat-item">
              {s.icon}
              <span className="depot-stat-value">{s.value}</span>
              <span className="depot-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Contribution Heatmap */}
        <div className="depot-section">
          <div className="depot-section-header">
            <h2><Activity className="w-4 h-4" /> Contribution Activity</h2>
          </div>
          <ContributionHeatmap data={contributions} />
        </div>

        {/* Repos */}
        <div className="depot-section">
          <div className="depot-section-header">
            <h2><GitBranch className="w-4 h-4" /> Repositories</h2>
            <div className="depot-filter-bar">
              {(["all", "public", "private"] as const).map(f => (
                <button
                  key={f}
                  className={`depot-filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "public" ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Private</>}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="depot-loading">
              <div className="depot-spinner" />
              <span>Loading repositories...</span>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="depot-empty">
              <Archive className="w-10 h-10" />
              <h3>{repos.length === 0 ? "No repositories yet" : "No matches"}</h3>
              <p>{repos.length === 0 ? "Create your first repository to start backing up your code." : "Try a different search or filter."}</p>
              {repos.length === 0 && (
                <button className="depot-btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" /> Create Repository
                </button>
              )}
            </div>
          ) : (
            <div className="depot-repo-list">
              {filteredRepos.map(repo => <RepoCard key={repo.id} repo={repo} />)}
            </div>
          )}
        </div>
      </main>

      <CreateRepoModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(repo) => setRepos(prev => [repo, ...prev])}
      />
    </div>
  );
}
