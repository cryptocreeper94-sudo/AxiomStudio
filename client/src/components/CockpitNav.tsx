/**
 * Axiom Studio — Cockpit Nav (Mobile Bottom Bar)
 * Fixed bottom navigation for mobile — matches DWTL ecosystem pattern.
 * DarkWave Studios LLC — Copyright 2026
 */
import {
  MessageSquare, Package, FileCode, BarChart3, Menu, Brain
} from "lucide-react";

interface Props {
  onOpenSidebar: () => void;
  onToggleSnippets: () => void;
  onToggleArtifacts: () => void;
  onOpenAnalytics: () => void;
  snippetsOpen: boolean;
  artifactsOpen: boolean;
  activeView: "chat" | "analytics";
}

export default function CockpitNav({
  onOpenSidebar,
  onToggleSnippets,
  onToggleArtifacts,
  onOpenAnalytics,
  snippetsOpen,
  artifactsOpen,
  activeView,
}: Props) {
  const items = [
    {
      id: "menu",
      icon: Menu,
      label: "Menu",
      active: false,
      action: onOpenSidebar,
      color: "#94a3b8",
    },
    {
      id: "chat",
      icon: MessageSquare,
      label: "Chat",
      active: activeView === "chat" && !snippetsOpen && !artifactsOpen,
      action: () => {},
      color: "#06b6d4",
    },
    {
      id: "snippets",
      icon: Package,
      label: "Snippets",
      active: snippetsOpen,
      action: onToggleSnippets,
      color: "#38bdf8",
    },
    {
      id: "artifacts",
      icon: FileCode,
      label: "Artifacts",
      active: artifactsOpen,
      action: onToggleArtifacts,
      color: "#06b6d4",
    },
    {
      id: "analytics",
      icon: BarChart3,
      label: "Analytics",
      active: activeView === "analytics",
      action: onOpenAnalytics,
      color: "#22c55e",
    },
  ];

  return (
    <nav
      className="cockpit-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "rgba(6,8,16,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "6px 8px 4px",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "6px 12px",
              borderRadius: "12px",
              background: item.active
                ? `${item.color}15`
                : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              minWidth: "48px",
            }}
          >
            <item.icon
              style={{
                width: 18,
                height: 18,
                color: item.active ? item.color : "rgba(255,255,255,0.25)",
                transition: "color 0.2s",
              }}
            />
            <span
              style={{
                fontSize: "9px",
                fontWeight: item.active ? 700 : 500,
                color: item.active ? item.color : "rgba(255,255,255,0.2)",
                letterSpacing: "0.02em",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </span>
            {/* Active dot */}
            {item.active && (
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 6px ${item.color}`,
                  marginTop: "-1px",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
