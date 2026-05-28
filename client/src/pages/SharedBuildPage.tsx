/**
 * Axiom Studio — Shared Build Viewer
 * Public read-only page for shared project builds.
 * Shows code files + live preview in a split view.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  Eye, Code, FileText, Clock, User, ExternalLink,
  ChevronRight, ChevronDown, Copy, Check
} from "lucide-react";

interface SharedFile {
  path: string;
  content: string;
  language?: string;
}

interface SharedBuild {
  id: string;
  title: string;
  description: string;
  files: SharedFile[];
  previewHtml: string | null;
  viewCount: number;
  createdAt: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export default function SharedBuildPage() {
  const [match, params] = useRoute("/share/:id");
  const [build, setBuild] = useState<SharedBuild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!match || !params?.id) return;
    fetch(`/api/share/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setBuild(data);
        if (data.files?.length > 0) setActiveFile(data.files[0].path);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [match, params?.id]);

  useEffect(() => {
    if (build?.previewHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(build.previewHtml);
        doc.close();
      }
    }
  }, [build]);

  const handleCopy = () => {
    const file = build?.files.find(f => f.path === activeFile);
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a0e1a", color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif",
      }}>
        Loading shared build...
      </div>
    );
  }

  if (error || !build) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#0a0e1a", color: "#fff", fontFamily: "'Inter', sans-serif", gap: 12,
      }}>
        <Eye style={{ width: 48, height: 48, color: "rgba(255,255,255,0.15)" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Build Not Found</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{error || "This shared build doesn't exist or has been removed."}</p>
        <a href="https://axiomstudio.dev" style={{ color: "#06b6d4", fontSize: 13, textDecoration: "none" }}>
          → Create your own on Axiom Studio
        </a>
      </div>
    );
  }

  const activeFileContent = build.files.find(f => f.path === activeFile);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#0a0e1a", color: "#fff", fontFamily: "'Inter', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: "#fff",
        }}>
          A
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{build.title}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <User style={{ width: 10, height: 10 }} />
              {build.author.displayName || build.author.username || "Anonymous"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Eye style={{ width: 10, height: 10 }} />
              {build.viewCount} views
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock style={{ width: 10, height: 10 }} />
              {new Date(build.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <a
          href="https://axiomstudio.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8,
            background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
            color: "#fff", fontSize: 12, fontWeight: 700,
            textDecoration: "none", transition: "opacity 0.15s",
          }}
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
          Build on Axiom Studio
        </a>
      </div>

      {/* Content: split view */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* File list */}
        <div style={{
          width: 200, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", background: "rgba(0,0,0,0.2)",
        }}>
          <div style={{
            padding: "8px 12px", fontSize: 10, fontWeight: 700,
            color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em",
          }}>
            FILES ({build.files.length})
          </div>
          {build.files.map(f => (
            <button
              key={f.path}
              onClick={() => setActiveFile(f.path)}
              style={{
                width: "100%", padding: "6px 12px",
                background: activeFile === f.path ? "rgba(6,182,212,0.08)" : "transparent",
                border: "none", borderLeft: activeFile === f.path ? "2px solid #06b6d4" : "2px solid transparent",
                color: activeFile === f.path ? "#22d3ee" : "rgba(255,255,255,0.5)",
                fontSize: 11, textAlign: "left", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <FileText style={{ width: 11, height: 11, flexShrink: 0 }} />
              {f.path.split("/").pop()}
            </button>
          ))}
        </div>

        {/* Code view */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,255,255,0.01)",
          }}>
            <span style={{
              fontSize: 11, color: "rgba(255,255,255,0.5)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {activeFile || "Select a file"}
            </span>
            <button
              onClick={handleCopy}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 4, border: "none",
                background: "rgba(255,255,255,0.04)", color: copied ? "#4ade80" : "rgba(255,255,255,0.4)",
                fontSize: 10, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {copied ? <Check style={{ width: 10, height: 10 }} /> : <Copy style={{ width: 10, height: 10 }} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre style={{
            flex: 1, margin: 0, padding: 16, overflow: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            lineHeight: 1.6, color: "rgba(255,255,255,0.75)",
            background: "#0d1117",
          }}>
            {activeFileContent?.content || "// Select a file to view its contents"}
          </pre>
        </div>

        {/* Preview */}
        {build.previewHtml && (
          <div style={{
            width: "40%", borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
              fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.05em", background: "rgba(255,255,255,0.01)",
            }}>
              LIVE PREVIEW
            </div>
            <iframe
              ref={iframeRef}
              style={{ flex: 1, border: "none", background: "#fff" }}
              sandbox="allow-scripts"
              title="Build Preview"
            />
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{
        padding: "8px 20px", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, fontSize: 11, color: "rgba(255,255,255,0.3)",
        background: "rgba(0,0,0,0.3)",
      }}>
        Built with <span style={{ color: "#06b6d4", fontWeight: 700 }}>Axiom Studio</span> — The AI-native IDE
      </div>
    </div>
  );
}
