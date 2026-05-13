/**
 * Axiom Studio — Editor Tabs + Editor Area
 * Tabbed file editing with dirty indicators.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useCallback } from "react";
import { X, Circle, FileText, Code2 } from "lucide-react";
import MonacoEditor, { getLang } from "./MonacoEditor";
import MarkdownViewer from "./MarkdownViewer";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  language: string;
}

interface Props {
  files: OpenFile[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
}

function fileIcon(name: string): string {
  if (name.endsWith(".tsx") || name.endsWith(".jsx")) return "⚛️";
  if (name.endsWith(".ts")) return "🔷";
  if (name.endsWith(".js") || name.endsWith(".mjs")) return "🟡";
  if (name.endsWith(".css")) return "🎨";
  if (name.endsWith(".json")) return "📋";
  if (name.endsWith(".md")) return "📝";
  if (name.endsWith(".lume")) return "✨";
  if (name.endsWith(".html")) return "🌐";
  if (name.endsWith(".py")) return "🐍";
  return "📄";
}

export default function EditorArea({ files, activeFilePath, onSelectFile, onCloseFile, onContentChange, onSave }: Props) {
  const activeFile = files.find(f => f.path === activeFilePath);
  const [viewMode, setViewMode] = useState<"code" | "preview">("preview");

  // Force code view if not markdown
  const isMarkdown = activeFile?.path.endsWith(".md");
  const currentView = isMarkdown ? viewMode : "code";

  if (files.length === 0) {
    return (
      <div className="ax-editor-welcome">
        <div className="ax-welcome-inner">
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.15 }}>⚡</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            Axiom Studio
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", maxWidth: 320, lineHeight: 1.6 }}>
            Open a file from the explorer, or use the AI assistant to generate code.
          </p>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            <span>Ctrl+K — Command Palette</span>
            <span>Ctrl+` — Toggle Terminal</span>
            <span>Ctrl+B — Toggle Sidebar</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ax-editor-area">
      {/* Tab Bar */}
      <div className="ax-tab-bar">
        {files.map(f => {
          const dirty = f.content !== f.originalContent;
          const active = f.path === activeFilePath;
          return (
            <button
              key={f.path}
              className={`ax-tab ${active ? "ax-tab--active" : ""}`}
              onClick={() => onSelectFile(f.path)}
              title={f.path}
            >
              <span className="ax-tab-icon">{fileIcon(f.name)}</span>
              <span className="ax-tab-name">{f.name}</span>
              {dirty && <Circle size={8} fill="#06b6d4" stroke="none" className="ax-tab-dirty" />}
              <button
                className="ax-tab-close"
                onClick={(e) => { e.stopPropagation(); onCloseFile(f.path); }}
              >
                <X size={12} />
              </button>
            </button>
          );
        })}
      </div>

      {/* Breadcrumb & Tools */}
      {activeFile && (
        <div className="ax-breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1rem' }}>
          <div>
            {activeFile.path.split("/").map((part, i, arr) => (
              <span key={i}>
                <span style={{ color: i === arr.length - 1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>{part}</span>
                {i < arr.length - 1 && <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 4px" }}>/</span>}
              </span>
            ))}
          </div>

          {isMarkdown && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setViewMode("preview")}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 500, borderRadius: '4px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: currentView === "preview" ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: currentView === "preview" ? '#06b6d4' : 'rgba(255,255,255,0.5)'
                }}
              >
                <FileText size={12} /> Preview
              </button>
              <button 
                onClick={() => setViewMode("code")}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 500, borderRadius: '4px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: currentView === "code" ? 'rgba(168,85,247,0.15)' : 'transparent',
                  color: currentView === "code" ? '#a855f7' : 'rgba(255,255,255,0.5)'
                }}
              >
                <Code2 size={12} /> Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="ax-editor-content">
        {activeFile && currentView === "preview" && (
          <MarkdownViewer content={activeFile.content} />
        )}
        {activeFile && currentView === "code" && (
          <MonacoEditor
            value={activeFile.content}
            language={activeFile.language}
            onChange={(v) => onContentChange(activeFile.path, v)}
            onSave={() => onSave(activeFile.path)}
          />
        )}
      </div>
    </div>
  );
}
