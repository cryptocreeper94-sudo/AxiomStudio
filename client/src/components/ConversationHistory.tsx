/**
 * Axiom Studio — Conversation History Panel
 * Searchable conversation list with timestamps, delete, rename, and grouping.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useMemo } from "react";
import {
  MessageSquare, Search, Trash2, Plus, Clock,
  ChevronDown, ChevronRight, X, MoreVertical, Edit3, Check,
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
  conversations: Conversation[];
  activeConvoId: string | null;
  onSelectConvo: (id: string) => void;
  onNewChat: () => void;
  onDeleteConvo: (id: string) => void;
  onRenameConvo?: (id: string, newTitle: string) => void;
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

function groupByDate(convos: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of convos) {
    const d = new Date(c.updatedAt || c.createdAt || 0);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= weekAgo) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter(g => g.items.length > 0);
}

export default function ConversationHistory({
  conversations, activeConvoId, onSelectConvo, onNewChat, onDeleteConvo, onRenameConvo,
}: Props) {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Today", "Yesterday", "This Week"]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c =>
      (c.title || "Untitled").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const startRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title || "Untitled");
    setMenuId(null);
  };

  const saveRename = () => {
    if (editingId && editTitle.trim() && onRenameConvo) {
      onRenameConvo(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="ax-history-panel">
      {/* Header */}
      <div className="ax-fe-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="ax-fe-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={13} style={{ color: "#06b6d4" }} />
          HISTORY
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
          {conversations.length}
        </span>
      </div>

      {/* New Chat */}
      <div style={{ padding: "8px 10px 4px" }}>
        <button className="ax-new-chat" onClick={onNewChat} style={{ width: "100%", textAlign: "center" }}>
          <Plus size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          New Conversation
        </button>
      </div>

      {/* Search */}
      <div className="ax-lib-search">
        <Search size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ax-lib-search-input"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 2, display: "flex" }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Grouped list */}
      <div className="ax-lib-content" style={{ flex: 1 }}>
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          return (
            <div key={group.label} style={{ marginBottom: 2 }}>
              <button
                className="ax-lib-cat-header"
                onClick={() => toggleGroup(group.label)}
                style={{ padding: "5px 12px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                    {group.label}
                  </span>
                </div>
                <span className="ax-lib-cat-count">{group.items.length}</span>
              </button>

              {isExpanded && group.items.map((c) => {
                const isActive = c.id === activeConvoId;
                const isEditing = editingId === c.id;

                return (
                  <div
                    key={c.id}
                    className="ax-hist-item"
                    style={{
                      background: isActive ? "rgba(6,182,212,0.06)" : undefined,
                      borderLeft: isActive ? "2px solid #06b6d4" : "2px solid transparent",
                    }}
                    onClick={() => !isEditing && onSelectConvo(c.id)}
                  >
                    <MessageSquare size={13} style={{
                      color: isActive ? "#06b6d4" : "rgba(255,255,255,0.15)",
                      flexShrink: 0, marginTop: 1,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingId(null); }}
                            autoFocus
                            className="ax-lib-search-input"
                            style={{ fontSize: 12, padding: "2px 4px" }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); saveRename(); }}
                            style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", display: "flex", padding: 2 }}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{
                            fontSize: 12,
                            color: isActive ? "#06b6d4" : "rgba(255,255,255,0.55)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {c.title || "Untitled"}
                          </div>
                          <div style={{
                            fontSize: 9, color: "rgba(255,255,255,0.2)",
                            fontFamily: "'JetBrains Mono', monospace",
                            marginTop: 2,
                          }}>
                            {c.updatedAt || c.createdAt ? timeAgo(c.updatedAt || c.createdAt!) : ""}
                            {c.model && <span style={{ marginLeft: 6 }}>{c.model.includes("opus") ? "Opus" : c.model.includes("sonnet") ? "Sonnet" : c.model.includes("gpt") ? "GPT" : ""}</span>}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="ax-hist-actions">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer", display: "flex",
                            color: "rgba(255,255,255,0.2)", padding: 2, borderRadius: 4,
                          }}
                        >
                          <MoreVertical size={12} />
                        </button>
                        {menuId === c.id && (
                          <div className="ax-hist-menu">
                            {onRenameConvo && (
                              <button onClick={(e) => { e.stopPropagation(); startRename(c); }}>
                                <Edit3 size={11} /> Rename
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuId(null); onDeleteConvo(c.id); }}
                              style={{ color: "#ef4444" }}
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="ax-lib-empty">
            <MessageSquare size={28} style={{ color: "rgba(255,255,255,0.08)", marginBottom: 8 }} />
            <span>No conversations yet</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>Start a new chat to begin</span>
          </div>
        )}
      </div>
    </div>
  );
}
