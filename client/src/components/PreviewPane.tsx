/**
 * Axiom Studio — Live Preview Pane
 * Renders an iframe fetching files from the workspace.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useRef, useEffect } from "react";
import { RefreshCw, ExternalLink, Globe, FileCode } from "lucide-react";

interface Props {
  token: string | null;
  activeConvoId?: string | null;
  entryPoint?: string;
}

export default function PreviewPane({ token, activeConvoId, entryPoint = "index.html" }: Props) {
  const [path, setPath] = useState(entryPoint);
  const [key, setKey] = useState(0); // Used to force iframe reload
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync prop changes
  useEffect(() => {
    setPath(entryPoint);
  }, [entryPoint]);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPath(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRefresh();
    }
  };

  // Construct iframe URL with auth token and convo ID
  const iframeUrl = `/api/workspace/serve/${path.replace(/^\/+/, "")}?token=${token || ""}&convoId=${activeConvoId || "default"}`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", width: "100%",
      background: "#ffffff", overflow: "hidden",
    }}>
      {/* Address Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", background: "#f1f5f9",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={handleRefresh}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6,
              background: "transparent", border: "none",
              color: "#64748b", cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
            title="Refresh preview"
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 6,
          background: "#ffffff", border: "1px solid #cbd5e1",
          borderRadius: 8, padding: "4px 10px",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
        }}>
          <Globe style={{ width: 14, height: 14, color: "#94a3b8", flexShrink: 0 }} />
          <input
            type="text"
            value={path}
            onChange={handlePathChange}
            onKeyDown={handleKeyDown}
            placeholder="index.html"
            style={{
              flex: 1, border: "none", background: "transparent",
              fontSize: 12, color: "#334155", outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>

        <button
          onClick={() => window.open(iframeUrl, "_blank")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: 6,
            background: "transparent", border: "none",
            color: "#64748b", cursor: "pointer",
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
          title="Open in new tab"
        >
          <ExternalLink style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Iframe Container */}
      <div style={{ flex: 1, position: "relative", background: "#f8fafc" }}>
        {token ? (
          <iframe
            key={key}
            ref={iframeRef}
            src={iframeUrl}
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            style={{
              width: "100%", height: "100%", border: "none",
              display: "block", background: "#ffffff",
            }}
            onLoad={(e) => {
              // Optional: Hook into iframe to detect internal navigation or inject styles if needed
            }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 13 }}>
            Authentication required to view preview
          </div>
        )}
      </div>
    </div>
  );
}
