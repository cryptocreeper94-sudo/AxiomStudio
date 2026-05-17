/**
 * Axiom Studio — Library Panel
 * Replit-inspired project library with categorized file browser,
 * search, download, share, and copy capabilities.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Download, Share2, Copy, Trash2, FolderOpen,
  FileText, FileCode, Image, FileJson, File, Database,
  ChevronRight, ChevronDown, Package, Sparkles, Terminal,
  BookOpen, MoreVertical, ExternalLink, Eye, X
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface Props {
  token: string;
  activeConvoId: string | null;
  onOpenFile: (path: string, name: string) => void;
}

// ── File categorization ─────────────────────────────────────────────────
type Category = "artifacts" | "assets" | "scripts" | "docs" | "source" | "config" | "other";

interface CategoryDef {
  id: Category;
  label: string;
  icon: typeof FileText;
  color: string;
  match: (path: string) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "artifacts",
    label: "Artifacts",
    icon: Sparkles,
    color: "#a855f7",
    match: (p) => /\.(md|artifact|plan|spec)$/i.test(p) || p.includes("artifact"),
  },
  {
    id: "assets",
    label: "Assets",
    icon: Image,
    color: "#f97316",
    match: (p) => /\.(png|jpg|jpeg|gif|svg|webp|ico|mp3|mp4|wav|webm|pdf|glb|gltf|obj)$/i.test(p),
  },
  {
    id: "scripts",
    label: "Scripts",
    icon: Terminal,
    color: "#22c55e",
    match: (p) => /\.(sh|bash|ps1|bat|cmd|zsh)$/i.test(p) || p.includes("scripts/"),
  },
  {
    id: "docs",
    label: "Documentation",
    icon: BookOpen,
    color: "#3b82f6",
    match: (p) => /\.(md|txt|rst|adoc)$/i.test(p) && !p.includes("artifact"),
  },
  {
    id: "source",
    label: "Source Code",
    icon: FileCode,
    color: "#06b6d4",
    match: (p) => /\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|css|scss|html|vue|svelte)$/i.test(p),
  },
  {
    id: "config",
    label: "Config",
    icon: FileJson,
    color: "#eab308",
    match: (p) => /\.(json|yaml|yml|toml|ini|env|lock|config|rc)$/i.test(p) || p.includes("."),
  },
  {
    id: "other",
    label: "Other Files",
    icon: File,
    color: "#64748b",
    match: () => true,
  },
];

function categorizeFile(path: string): Category {
  for (const cat of CATEGORIES) {
    if (cat.id !== "other" && cat.match(path)) return cat.id;
  }
  return "other";
}

function getFileIcon(name: string): { Icon: typeof File; color: string } {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": case "tsx": return { Icon: FileCode, color: "#3178c6" };
    case "js": case "jsx": return { Icon: FileCode, color: "#f7df1e" };
    case "py": return { Icon: FileCode, color: "#3776ab" };
    case "css": case "scss": return { Icon: FileCode, color: "#1572b6" };
    case "html": return { Icon: FileCode, color: "#e34f26" };
    case "json": return { Icon: FileJson, color: "#eab308" };
    case "md": return { Icon: FileText, color: "#a855f7" };
    case "png": case "jpg": case "jpeg": case "gif": case "svg": case "webp":
      return { Icon: Image, color: "#f97316" };
    case "sh": case "bash": case "ps1": return { Icon: Terminal, color: "#22c55e" };
    case "sql": return { Icon: Database, color: "#3b82f6" };
    default: return { Icon: File, color: "#64748b" };
  }
}

// ── Main Component ──────────────────────────────────────────────────────

export default function LibraryPanel({ token, activeConvoId, onOpenFile }: Props) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<Category>>(new Set(["source", "artifacts"]));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileNode } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"library" | "tree">("library");

  // Fetch workspace tree
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch("/api/workspace/tree", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-convo-id": activeConvoId || "default",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setTree(data);
      } catch (err) {
        console.error("[Library] Failed to load tree:", err);
      }
    };
    load();
    // Poll for updates every 10s
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [token, activeConvoId]);

  // Flatten files from tree
  const allFiles = useMemo(() => {
    if (!tree) return [];
    const files: FileNode[] = [];
    const walk = (node: FileNode) => {
      if (node.type === "file") files.push(node);
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
    return files;
  }, [tree]);

  // Filter by search
  const filteredFiles = useMemo(() => {
    if (!search.trim()) return allFiles;
    const q = search.toLowerCase();
    return allFiles.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [allFiles, search]);

  // Group by category
  const categorized = useMemo(() => {
    const groups: Record<Category, FileNode[]> = {
      artifacts: [], assets: [], scripts: [], docs: [], source: [], config: [], other: [],
    };
    for (const f of filteredFiles) {
      const cat = categorizeFile(f.path);
      groups[cat].push(f);
    }
    return groups;
  }, [filteredFiles]);

  const toggleCat = (cat: Category) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Actions
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleDownloadFile = useCallback(async (file: FileNode) => {
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(file.path)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const blob = new Blob([data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${file.name}`);
    } catch (err) {
      showToast("Download failed");
    }
    setContextMenu(null);
  }, [token, activeConvoId, showToast]);

  const handleCopyPath = useCallback((file: FileNode) => {
    navigator.clipboard.writeText(file.path);
    showToast(`Copied: ${file.path}`);
    setContextMenu(null);
  }, [showToast]);

  const handleCopyContent = useCallback(async (file: FileNode) => {
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(file.path)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default",
        },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      await navigator.clipboard.writeText(data.content);
      showToast(`Copied content of ${file.name}`);
    } catch {
      showToast("Copy failed");
    }
    setContextMenu(null);
  }, [token, activeConvoId, showToast]);

  const handleDeleteFile = useCallback(async (file: FileNode) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await fetch(`/api/workspace/file?path=${encodeURIComponent(file.path)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default",
        },
      });
      showToast(`Deleted ${file.name}`);
    } catch {
      showToast("Delete failed");
    }
    setContextMenu(null);
  }, [token, activeConvoId, showToast]);

  const handleShareFile = useCallback(async (file: FileNode) => {
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(file.path)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default",
        },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      
      // Use Web Share API if available, otherwise copy as formatted text
      if (navigator.share) {
        await navigator.share({
          title: file.name,
          text: data.content?.substring(0, 500) + (data.content?.length > 500 ? "..." : ""),
        });
        showToast("Shared!");
      } else {
        // Fallback: copy a shareable snippet
        const snippet = `// ${file.name}\n${data.content?.substring(0, 2000)}`;
        await navigator.clipboard.writeText(snippet);
        showToast("Copied shareable snippet");
      }
    } catch {
      showToast("Share failed");
    }
    setContextMenu(null);
  }, [token, activeConvoId, showToast]);

  // ── File Tree view (like Replit's "File tree" toggle) ──
  const renderTreeNode = (node: FileNode, depth: number = 0): JSX.Element | null => {
    if (node.type === "file") {
      const { Icon, color } = getFileIcon(node.name);
      return (
        <button
          key={node.path}
          className="ax-lib-file"
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => onOpenFile(node.path, node.name)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, file: node });
          }}
        >
          <Icon size={14} style={{ color, flexShrink: 0 }} />
          <span className="ax-lib-filename">{node.name}</span>
        </button>
      );
    }

    // Directory
    const isExpanded = expandedCats.has(node.name as Category);
    return (
      <div key={node.path}>
        <button
          className="ax-lib-dir"
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => {
            const name = node.name as Category;
            toggleCat(name);
          }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <FolderOpen size={14} style={{ color: "#eab308", flexShrink: 0 }} />
          <span>{node.name}</span>
        </button>
        {isExpanded && node.children?.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="ax-library-panel">
      {/* Header */}
      <div className="ax-fe-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="ax-fe-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={13} style={{ color: "#a855f7" }} />
          LIBRARY
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            className={`ax-lib-view-btn ${viewMode === "library" ? "active" : ""}`}
            onClick={() => setViewMode("library")}
            title="Library View"
          >
            <Package size={12} />
          </button>
          <button
            className={`ax-lib-view-btn ${viewMode === "tree" ? "active" : ""}`}
            onClick={() => setViewMode("tree")}
            title="File Tree"
          >
            <FolderOpen size={12} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="ax-lib-search">
        <Search size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ax-lib-search-input"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", padding: 2, display: "flex",
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* File count */}
      <div className="ax-lib-stats">
        <span>{filteredFiles.length} files</span>
        {search && <span style={{ color: "#a855f7" }}> matching "{search}"</span>}
      </div>

      {/* Content */}
      <div className="ax-lib-content">
        {viewMode === "library" ? (
          // ── Category View ──
          CATEGORIES.map((cat) => {
            const files = categorized[cat.id];
            if (files.length === 0) return null;
            const isExpanded = expandedCats.has(cat.id);
            const CatIcon = cat.icon;

            return (
              <div key={cat.id} className="ax-lib-category">
                <button className="ax-lib-cat-header" onClick={() => toggleCat(cat.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <CatIcon size={14} style={{ color: cat.color }} />
                    <span className="ax-lib-cat-label">{cat.label}</span>
                  </div>
                  <span className="ax-lib-cat-count">{files.length}</span>
                </button>

                {isExpanded && (
                  <div className="ax-lib-cat-files">
                    {files.map((file) => {
                      const { Icon, color } = getFileIcon(file.name);
                      return (
                        <div
                          key={file.path}
                          className="ax-lib-file-row"
                          onClick={() => onOpenFile(file.path, file.name)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, file });
                          }}
                        >
                          <Icon size={14} style={{ color, flexShrink: 0 }} />
                          <span className="ax-lib-filename" title={file.path}>
                            {file.name}
                          </span>
                          <button
                            className="ax-lib-action-dot"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({ x: rect.left, y: rect.bottom + 4, file });
                            }}
                          >
                            <MoreVertical size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // ── Tree View ──
          tree && tree.children?.map((child) => renderTreeNode(child, 0))
        )}

        {allFiles.length === 0 && (
          <div className="ax-lib-empty">
            <Package size={32} style={{ color: "rgba(255,255,255,0.08)", marginBottom: 12 }} />
            <span>No files yet</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              Start a chat to generate code
            </span>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="ax-lib-overlay" onClick={() => setContextMenu(null)} />
          <div
            className="ax-lib-context-menu"
            style={{
              position: "fixed",
              top: Math.min(contextMenu.y, window.innerHeight - 240),
              left: Math.min(contextMenu.x, window.innerWidth - 200),
            }}
          >
            <div className="ax-lib-ctx-header">{contextMenu.file.name}</div>
            <button onClick={() => { onOpenFile(contextMenu.file.path, contextMenu.file.name); setContextMenu(null); }}>
              <Eye size={13} /> Open in Editor
            </button>
            <button onClick={() => handleDownloadFile(contextMenu.file)}>
              <Download size={13} /> Download
            </button>
            <button onClick={() => handleShareFile(contextMenu.file)}>
              <Share2 size={13} /> Share
            </button>
            <button onClick={() => handleCopyContent(contextMenu.file)}>
              <Copy size={13} /> Copy Content
            </button>
            <button onClick={() => handleCopyPath(contextMenu.file)}>
              <ExternalLink size={13} /> Copy Path
            </button>
            <div className="ax-lib-ctx-divider" />
            <button onClick={() => handleDeleteFile(contextMenu.file)} className="ax-lib-ctx-danger">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="ax-lib-toast">
          {toast}
        </div>
      )}
    </div>
  );
}
