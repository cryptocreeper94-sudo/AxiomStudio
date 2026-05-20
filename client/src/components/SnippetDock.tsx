/**
 * Axiom Studio — Snippet Dock
 * Pulls snippets from the DWTL ecosystem API (axiom42.com / darkwavestudios.io)
 * and lets users insert them into the chat or copy to clipboard.
 * 
 * Bridge between Axiom agent (axiom42.com) and Axiom Studio IDE.
 */
import { useState, useEffect } from "react";
import { Code2, Copy, Check, Search, X, ChevronDown, Package, ExternalLink, Plus } from "lucide-react";

interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  category: string;
  tags: string[];
  authorName: string;
  version: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string, title: string) => void;
}

const DWTL_API = "https://darkwavestudios.io/api/ecosystem/snippets";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "4px 8px", borderRadius: "6px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
        color: copied ? "#4ade80" : "rgba(255,255,255,0.3)",
        fontSize: "10px", cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {copied ? <Check style={{ width: 10, height: 10 }} /> : <Copy style={{ width: 10, height: 10 }} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function SnippetDock({ isOpen, onClose, onInsert }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(DWTL_API)
      .then((r) => r.json())
      .then((data) => setSnippets(data.snippets || data || []))
      .catch(() => setSnippets([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ["all", ...new Set(snippets.map((s) => s.category))];
  const filtered = snippets.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{
      width: "380px", height: "100%", display: "flex", flexDirection: "column",
      borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#080c15",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Package style={{ width: 16, height: 16, color: "#38bdf8" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
            Snippet Dock
          </span>
          <span style={{
            fontSize: "9px", padding: "2px 6px", borderRadius: "4px",
            background: "rgba(14,165,233,0.1)", color: "#7dd3fc", border: "1px solid rgba(14,165,233,0.2)",
          }}>
            DWTL
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", padding: "4px",
        }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ position: "relative" }}>
          <Search style={{
            position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
            width: 13, height: 13, color: "rgba(255,255,255,0.2)",
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ecosystem snippets..."
            style={{
              width: "100%", padding: "8px 10px 8px 32px", borderRadius: "8px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              color: "white", fontSize: "12px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{
          display: "flex", gap: "4px", marginTop: "8px",
          overflowX: "auto", paddingBottom: "2px",
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: "4px 10px", borderRadius: "6px", border: "none",
                fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap",
                fontWeight: 500, textTransform: "capitalize",
                background: cat === category ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)",
                color: cat === category ? "#67e8f9" : "rgba(255,255,255,0.3)",
                transition: "all 0.2s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Snippet List */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: "24px", height: "24px", border: "2px solid rgba(6,182,212,0.2)",
              borderTop: "2px solid #06b6d4", borderRadius: "50%",
              animation: "spin 1s linear infinite", margin: "0 auto 8px",
            }} />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>Loading from DWTL ecosystem...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Code2 style={{ width: 24, height: 24, color: "rgba(255,255,255,0.06)", margin: "0 auto 8px", display: "block" }} />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)" }}>No snippets found</p>
          </div>
        ) : (
          filtered.map((snippet) => (
            <div key={snippet.id} style={{ marginBottom: "6px" }}>
              <button
                onClick={() => setExpanded(expanded === snippet.id ? null : snippet.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px",
                  borderRadius: expanded === snippet.id ? "10px 10px 0 0" : "10px",
                  background: expanded === snippet.id ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${expanded === snippet.id ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)"}`,
                  cursor: "pointer", transition: "all 0.2s",
                  borderBottom: expanded === snippet.id ? "none" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "6px", flexShrink: 0,
                      background: snippet.language === "typescript" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Code2 style={{
                        width: 13, height: 13,
                        color: snippet.language === "typescript" ? "#60a5fa" : "#fbbf24",
                      }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.8)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {snippet.title}
                      </p>
                      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                        {snippet.language} &middot; {snippet.category}
                      </p>
                    </div>
                  </div>
                  <ChevronDown style={{
                    width: 12, height: 12, color: "rgba(255,255,255,0.2)", flexShrink: 0,
                    transform: expanded === snippet.id ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }} />
                </div>
              </button>

              {expanded === snippet.id && (
                <div style={{
                  padding: "12px",
                  borderRadius: "0 0 10px 10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(6,182,212,0.15)",
                  borderTop: "none",
                }}>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", lineHeight: 1.5 }}>
                    {snippet.description}
                  </p>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                    {snippet.tags.map((tag) => (
                      <span key={tag} style={{
                        padding: "2px 6px", borderRadius: "4px", fontSize: "9px",
                        background: "rgba(6,182,212,0.08)", color: "#67e8f9",
                        border: "1px solid rgba(6,182,212,0.12)",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Code preview */}
                  <pre style={{
                    padding: "10px", borderRadius: "8px", background: "#0d1117",
                    fontSize: "10px", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace",
                    color: "#e6edf3", maxHeight: "150px", overflow: "auto",
                    border: "1px solid rgba(255,255,255,0.04)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {snippet.code.slice(0, 500)}{snippet.code.length > 500 ? "\n..." : ""}
                  </pre>

                  {/* Actions */}
                  <div style={{
                    display: "flex", gap: "6px", marginTop: "10px",
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onInsert(snippet.code, snippet.title); }}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        padding: "8px", borderRadius: "8px",
                        background: "linear-gradient(135deg, #0891b2, #0369a1)",
                        border: "none", color: "white", fontSize: "11px", fontWeight: 600,
                        cursor: "pointer", boxShadow: "0 2px 12px rgba(6,182,212,0.2)",
                      }}
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      Insert into Chat
                    </button>
                    <CopyBtn text={snippet.code} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.12)" }}>
          {filtered.length} snippets from darkwavestudios.io
        </span>
        <a
          href="https://darkwavestudios.io/developers/marketplace"
          target="_blank"
          rel="noopener"
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "10px", color: "rgba(14,165,233,0.5)", textDecoration: "none",
          }}
        >
          Full Marketplace <ExternalLink style={{ width: 9, height: 9 }} />
        </a>
      </div>
    </div>
  );
}
