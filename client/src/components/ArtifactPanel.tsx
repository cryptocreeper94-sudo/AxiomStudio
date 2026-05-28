/**
 * Axiom Studio — Artifact Panel
 * Side panel that detects and renders workspace artifacts
 * (implementation_plan.md, task.md, walkthrough.md) with rich formatting.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useCallback } from "react";
import { 
  FileText, ListChecks, BookOpen, RefreshCw, Copy, Check,
  ExternalLink, ChevronDown, ChevronRight, Sparkles
} from "lucide-react";
import { marked } from "marked";

interface ArtifactFile {
  path: string;
  name: string;
  type: "plan" | "task" | "walkthrough" | "other";
  icon: any;
  color: string;
}

const ARTIFACT_PATTERNS: { pattern: RegExp; type: ArtifactFile["type"]; icon: any; color: string }[] = [
  { pattern: /implementation_plan\.md$/i, type: "plan", icon: FileText, color: "#06b6d4" },
  { pattern: /task\.md$/i, type: "task", icon: ListChecks, color: "#f59e0b" },
  { pattern: /walkthrough\.md$/i, type: "walkthrough", icon: BookOpen, color: "#22c55e" },
];

interface Props {
  token: string;
  onOpenFile?: (path: string, name: string) => void;
}

export default function ArtifactPanel({ token, onOpenFile }: Props) {
  const [artifacts, setArtifacts] = useState<ArtifactFile[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactFile | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Scan workspace for artifact files
  const scanArtifacts = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/files?path=", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const files: ArtifactFile[] = [];
      
      for (const file of data.files || []) {
        for (const pattern of ARTIFACT_PATTERNS) {
          if (pattern.pattern.test(file.path || file.name)) {
            files.push({
              path: file.path || file.name,
              name: (file.path || file.name).split(/[/\\]/).pop() || file.name,
              type: pattern.type,
              icon: pattern.icon,
              color: pattern.color,
            });
            break;
          }
        }
      }
      
      setArtifacts(files);
      if (files.length > 0 && !selectedArtifact) {
        setSelectedArtifact(files[0]);
      }
    } catch (err) {
      console.error("Artifact scan error:", err);
    }
  }, [token, selectedArtifact]);

  useEffect(() => { scanArtifacts(); }, [scanArtifacts]);

  // Load selected artifact content
  useEffect(() => {
    if (!selectedArtifact) return;
    setLoading(true);
    fetch(`/api/workspace/files?path=${encodeURIComponent(selectedArtifact.path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setContent(data.content || data.files?.[0]?.content || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedArtifact, token]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render task.md with interactive checkboxes
  const renderTaskContent = (md: string) => {
    // Replace checkbox syntax with visual indicators
    return md
      .replace(/- \[x\]/g, "- ✅")
      .replace(/- \[\/\]/g, "- 🔄")
      .replace(/- \[ \]/g, "- ⬜");
  };

  const displayContent = selectedArtifact?.type === "task" ? renderTaskContent(content) : content;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "transparent",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Sparkles style={{ width: 13, height: 13, color: "#06b6d4" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.05em" }}>
          ARTIFACTS
        </span>
        <button
          onClick={scanArtifacts}
          title="Refresh"
          style={{
            marginLeft: "auto", display: "flex", padding: 4,
            background: "none", border: "none", color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Artifact list */}
      {artifacts.length === 0 ? (
        <div style={{
          padding: 20, textAlign: "center",
          color: "rgba(255,255,255,0.2)", fontSize: 11,
        }}>
          No artifacts detected yet.
          <br />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)" }}>
            Ask your agent to create an implementation plan or task list.
          </span>
        </div>
      ) : (
        <>
          <div style={{ padding: "6px 8px", display: "flex", gap: 4, flexWrap: "wrap" }}>
            {artifacts.map((a) => {
              const Icon = a.icon;
              const isActive = selectedArtifact?.path === a.path;
              return (
                <button
                  key={a.path}
                  onClick={() => setSelectedArtifact(a)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 6,
                    background: isActive ? `${a.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? `${a.color}33` : "rgba(255,255,255,0.04)"}`,
                    color: isActive ? a.color : "rgba(255,255,255,0.4)",
                    fontSize: 10, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s", fontFamily: "inherit",
                  }}
                >
                  <Icon style={{ width: 11, height: 11 }} />
                  {a.name}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div style={{
            flex: 1, overflow: "auto", padding: "12px",
          }}>
            {loading ? (
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", paddingTop: 20 }}>
                Loading...
              </div>
            ) : (
              <>
                {/* Action bar */}
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                      color: copied ? "#4ade80" : "rgba(255,255,255,0.4)",
                      fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {copied ? <Check style={{ width: 10, height: 10 }} /> : <Copy style={{ width: 10, height: 10 }} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  {onOpenFile && selectedArtifact && (
                    <button
                      onClick={() => onOpenFile(selectedArtifact.path, selectedArtifact.name)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", borderRadius: 6,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <ExternalLink style={{ width: 10, height: 10 }} />
                      Open in Editor
                    </button>
                  )}
                </div>

                {/* Rendered markdown */}
                <div
                  className="ax-md-preview"
                  dangerouslySetInnerHTML={{ __html: marked.parse(displayContent, { gfm: true, breaks: true }) as string }}
                  style={{
                    fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
