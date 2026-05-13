/**
 * Axiom Studio — File Explorer
 * Recursive tree view of workspace directory.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  RefreshCw, Plus, FolderPlus,
} from "lucide-react";

export interface FSNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FSNode[];
}

interface Props {
  token: string;
  activeConvoId: string | null;
  onOpenFile: (path: string, name: string) => void;
}

function fileIconClass(name: string): string {
  if (name.endsWith(".tsx") || name.endsWith(".jsx")) return "⚛️";
  if (name.endsWith(".ts")) return "🔷";
  if (name.endsWith(".js") || name.endsWith(".mjs")) return "🟡";
  if (name.endsWith(".css")) return "🎨";
  if (name.endsWith(".json")) return "📋";
  if (name.endsWith(".md")) return "📝";
  if (name.endsWith(".lume")) return "✨";
  if (name.endsWith(".html")) return "🌐";
  if (name.endsWith(".env")) return "🔒";
  if (name.endsWith(".gitignore")) return "🚫";
  return "📄";
}

function TreeNode({ node, depth, onOpenFile }: { node: FSNode; depth: number; onOpenFile: Props["onOpenFile"] }) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === "file") {
    return (
      <button
        className="ax-tree-item"
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => onOpenFile(node.path, node.name)}
      >
        <span className="ax-tree-icon">{fileIconClass(node.name)}</span>
        <span className="ax-tree-name">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        className="ax-tree-item ax-tree-dir"
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {expanded ? <FolderOpen size={14} className="ax-tree-folder-icon" /> : <Folder size={14} className="ax-tree-folder-icon" />}
        <span className="ax-tree-name">{node.name}</span>
      </button>
      {expanded && node.children?.map(child => (
        <TreeNode key={child.path} node={child} depth={depth + 1} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}

export default function FileExplorer({ token, activeConvoId, onOpenFile }: Props) {
  const [tree, setTree] = useState<FSNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/tree", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default"
        },
      });
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const errData = await res.json();
          if (res.status === 401) {
            // Token is expired or invalid — clear stale session
            localStorage.removeItem("axiom_token");
            localStorage.removeItem("axiom_user");
            localStorage.removeItem("axiom_token_expiry");
            // Force page reload after a brief delay so user sees the message
            setTimeout(() => window.location.reload(), 1500);
            throw new Error((errData.error || "Session expired") + " — reloading...");
          }
          throw new Error(errData.error || `Error ${res.status}`);
        }
        throw new Error(`Server error (${res.status}) — try refreshing`);
      }
      const data = await res.json();
      setTree(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, activeConvoId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  return (
    <div className="ax-file-explorer">
      <div className="ax-fe-header">
        <span className="ax-fe-title">EXPLORER</span>
        <div className="ax-fe-actions">
          <button onClick={loadTree} title="Refresh" className="ax-fe-action">
            <RefreshCw size={14} />
          </button>
          <button title="New File" className="ax-fe-action">
            <Plus size={14} />
          </button>
          <button title="New Folder" className="ax-fe-action">
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      <div className="ax-fe-tree">
        {loading && <div className="ax-fe-loading">Loading workspace...</div>}
        {error && <div className="ax-fe-error">{error}</div>}
        {tree && tree.children?.map(node => (
          <TreeNode key={node.path} node={node} depth={0} onOpenFile={onOpenFile} />
        ))}
        {tree && (!tree.children || tree.children.length === 0) && (
          <div className="ax-fe-empty">
            <p>Workspace is empty</p>
            <p style={{ fontSize: 11, opacity: 0.4 }}>Use the terminal to clone a repo</p>
          </div>
        )}
      </div>
    </div>
  );
}
