/**
 * Axiom Studio — Activity Bar
 * Vertical icon strip (VS Code-style). Toggles side panels.
 * DarkWave Studios LLC — Copyright 2026
 */
import {
  FolderTree, Search, GitBranch, Bot, BarChart3,
  Settings, Terminal as TermIcon, Library, Clock, Sparkles,
} from "lucide-react";

export type SidePanel = "files" | "search" | "git" | "library" | "history" | "artifacts" | "ai" | "analytics" | "settings" | null;

interface Props {
  activePanel: SidePanel;
  onPanelChange: (p: SidePanel) => void;
  onToggleTerminal?: () => void;
  ownerMode?: boolean;
}

const ITEMS: { id: SidePanel; icon: typeof FolderTree; label: string; ownerOnly?: boolean }[] = [
  { id: "files", icon: FolderTree, label: "Explorer" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "library", icon: Library, label: "Library" },
  { id: "history", icon: Clock, label: "History" },
  { id: "artifacts", icon: Sparkles, label: "Artifacts" },
  { id: "ai", icon: Bot, label: "AI Assistant" },
  { id: "analytics", icon: BarChart3, label: "Analytics", ownerOnly: true },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function ActivityBar({ activePanel, onPanelChange, onToggleTerminal, ownerMode }: Props) {
  return (
    <div className="ax-activity-bar">
      {ITEMS.filter(i => !i.ownerOnly || ownerMode).map((item) => {
        const Icon = item.icon;
        const active = activePanel === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPanelChange(active ? null : item.id)}
            title={item.label}
            className={`ax-ab-btn ${active ? "ax-ab-btn--active" : ""}`}
          >
            <Icon size={20} />
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button onClick={onToggleTerminal} title="Terminal" className="ax-ab-btn ax-ab-btn--bottom">
        <TermIcon size={18} />
      </button>
    </div>
  );
}
