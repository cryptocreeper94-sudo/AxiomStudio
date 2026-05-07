/**
 * Axiom Studio — Chat View
 * Streaming chat with Apply-to-File code blocks, file context badges,
 * and @-file mention support.
 * 
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Send, Loader2, AlertTriangle, Copy, Check, Brain, User, RotateCcw,
  FileCode, FileDown, ChevronDown, Paperclip, X as XIcon,
} from "lucide-react";
import { marked } from "marked";

interface Message {
  id: string;
  role: string;
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorContext?: string;
  createdAt: string;
  contextFiles?: string[];
}

interface FileContextItem {
  path: string;
  name: string;
}

interface Props {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  agentName: string;
  agentColor: string;
  agentModel?: string;
  routeInfo: { model: string; agent: string; score: number; reason: string } | null;
  onSend: (message: string, contextFiles?: string[]) => void;
  onRetry: () => void;
  onApplyCode?: (code: string, filename: string, language: string) => void;
  activeFileName?: string;
  openFiles?: FileContextItem[];
  workspaceFiles?: FileContextItem[];
}

// ── Code Block with Apply Button ──

interface CodeBlockData {
  language: string;
  code: string;
  filename?: string;
}

function extractCodeBlocks(content: string): { segments: Array<{ type: "text" | "code"; content: string; codeData?: CodeBlockData }>; } {
  const segments: Array<{ type: "text" | "code"; content: string; codeData?: CodeBlockData }> = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }

    const language = match[1] || "text";
    const code = match[2].trim();

    // Try to detect filename from preceding line
    const beforeBlock = content.slice(Math.max(0, match.index - 200), match.index);
    const filenameMatch = beforeBlock.match(/[`"']([^`"']+\.\w{1,6})[`"']\s*[:.]?\s*$/m)
      || beforeBlock.match(/(?:file|create|update|modify|edit)\s+[`"']?([^\s`"':]+\.\w{1,6})/i)
      || beforeBlock.match(/####?\s+.*?([a-zA-Z0-9_\-/.]+\.\w{1,6})/);

    segments.push({
      type: "code",
      content: match[0],
      codeData: {
        language,
        code,
        filename: filenameMatch?.[1],
      },
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return { segments };
}

function CodeBlock({ data, onApply, activeFileName }: {
  data: CodeBlockData;
  onApply?: (code: string, filename: string, language: string) => void;
  activeFileName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const targetFile = data.filename || activeFileName;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApply && targetFile) {
      onApply(data.code, targetFile, data.language);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div style={{
      borderRadius: "10px", overflow: "hidden", margin: "12px 0",
      border: "1px solid rgba(255,255,255,0.06)",
      background: "#0d1117",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px", background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
            padding: "2px 8px", borderRadius: "4px",
            background: "rgba(6,182,212,0.1)", color: "#67e8f9",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {data.language}
          </span>
          {data.filename && (
            <span style={{
              fontSize: "11px", color: "rgba(255,255,255,0.4)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {data.filename}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "6px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: copied ? "#4ade80" : "rgba(255,255,255,0.4)",
              fontSize: "10px", fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
            {copied ? "Copied" : "Copy"}
          </button>

          {/* Apply to File button */}
          {onApply && targetFile && (
            <button
              onClick={handleApply}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "6px",
                background: applied ? "rgba(34,197,94,0.15)" : "rgba(6,182,212,0.1)",
                border: `1px solid ${applied ? "rgba(34,197,94,0.3)" : "rgba(6,182,212,0.2)"}`,
                color: applied ? "#4ade80" : "#06b6d4",
                fontSize: "10px", fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {applied
                ? <><Check style={{ width: 11, height: 11 }} /> Applied</>
                : <><FileDown style={{ width: 11, height: 11 }} /> Apply to {targetFile.split("/").pop()}</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <pre style={{
        margin: 0, padding: "14px 16px", fontSize: "12px", lineHeight: 1.6,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#e6edf3", overflowX: "auto", whiteSpace: "pre",
      }}>
        {data.code}
      </pre>
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({ msg, agentName, onApply, activeFileName }: {
  msg: Message;
  agentName: string;
  onApply?: (code: string, filename: string, language: string) => void;
  activeFileName?: string;
}) {
  const isUser = msg.role === "user";

  const rendered = useMemo(() => {
    if (isUser) return null;
    const { segments } = extractCodeBlocks(msg.content);
    return segments.map((seg, i) => {
      if (seg.type === "code" && seg.codeData) {
        return <CodeBlock key={i} data={seg.codeData} onApply={onApply} activeFileName={activeFileName} />;
      }
      // Render non-code markdown
      const html = marked.parse(seg.content, { async: false }) as string;
      return <div key={i} className="agent-message text-sm text-white/80" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }, [msg.content, isUser, onApply, activeFileName]);

  return (
    <div className={`flex gap-3 py-4 px-4 ${isUser ? "" : "bg-white/[0.015]"}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? "bg-purple-600/20 text-purple-400" : "bg-cyan-600/20 text-cyan-400"
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-white/60">{isUser ? "You" : agentName}</span>
          {msg.model && <span className="text-[10px] text-white/20 font-mono">{msg.model}</span>}
          {msg.inputTokens != null && (
            <span className="text-[10px] text-white/15 font-mono">
              {msg.inputTokens}↓ {msg.outputTokens}↑
            </span>
          )}
        </div>
        {msg.errorContext && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-2 text-xs text-red-300">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Error context attached</span>
          </div>
        )}
        {/* Context files badge */}
        {msg.contextFiles && msg.contextFiles.length > 0 && (
          <div style={{
            display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px",
          }}>
            {msg.contextFiles.map((f, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "2px 8px", borderRadius: "6px", fontSize: "10px",
                background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)",
                color: "rgba(168,85,247,0.6)", fontFamily: "'JetBrains Mono', monospace",
              }}>
                <FileCode style={{ width: 10, height: 10 }} />
                {f.split("/").pop()}
              </span>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        ) : (
          <div>{rendered}</div>
        )}
      </div>
      {!isUser && (
        <button
          onClick={() => { navigator.clipboard.writeText(msg.content); }}
          className="p-1 rounded hover:bg-white/10 transition text-white/30 hover:text-white/60 flex-shrink-0 self-start mt-1"
          title="Copy full response"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── File Context Selector (@mentions) ──

function FileContextBar({ files, selected, onToggle, onClear }: {
  files: FileContextItem[];
  selected: string[];
  onToggle: (path: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (selected.length === 0 && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
          borderRadius: "8px", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)",
          fontSize: "11px", cursor: "pointer", transition: "all 0.2s",
        }}
        title="Attach files as context"
      >
        <Paperclip style={{ width: 12, height: 12 }} />
        Add context
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
      {selected.map(path => (
        <span key={path} style={{
          display: "inline-flex", alignItems: "center", gap: "4px",
          padding: "3px 8px", borderRadius: "6px", fontSize: "10px",
          background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)",
          color: "#67e8f9", fontFamily: "'JetBrains Mono', monospace",
        }}>
          <FileCode style={{ width: 10, height: 10 }} />
          {path.split("/").pop()}
          <button
            onClick={() => onToggle(path)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}
          >
            <XIcon style={{ width: 10, height: 10 }} />
          </button>
        </span>
      ))}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "2px", padding: "3px 8px",
          borderRadius: "6px", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)",
          fontSize: "10px", cursor: "pointer",
        }}
      >
        <Paperclip style={{ width: 10, height: 10 }} />
        <ChevronDown style={{ width: 10, height: 10, transform: open ? "rotate(180deg)" : "" }} />
      </button>
      {selected.length > 0 && (
        <button
          onClick={onClear}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.15)", fontSize: "10px", padding: "2px 4px",
          }}
        >
          Clear all
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0, right: 0,
          maxHeight: "200px", overflowY: "auto", marginBottom: "4px",
          background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px", padding: "4px", zIndex: 50,
        }}>
          {files.length === 0 ? (
            <div style={{ padding: "12px", fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
              No files open. Open files in the editor to attach as context.
            </div>
          ) : (
            files.map(f => (
              <button
                key={f.path}
                onClick={() => { onToggle(f.path); }}
                style={{
                  display: "flex", alignItems: "center", gap: "6px", width: "100%",
                  padding: "6px 10px", borderRadius: "6px", border: "none",
                  background: selected.includes(f.path) ? "rgba(6,182,212,0.08)" : "transparent",
                  color: selected.includes(f.path) ? "#67e8f9" : "rgba(255,255,255,0.5)",
                  fontSize: "11px", cursor: "pointer", textAlign: "left",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <FileCode style={{ width: 12, height: 12, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</span>
                {selected.includes(f.path) && <Check style={{ width: 12, height: 12, color: "#06b6d4" }} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Chat View ──

export default function ChatView({
  messages, streamingContent, isStreaming, agentName, agentColor, agentModel,
  routeInfo, onSend, onRetry, onApplyCode, activeFileName, openFiles = [], workspaceFiles = [],
}: Props) {
  const [input, setInput] = useState("");
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-attach current file as context
  useEffect(() => {
    if (activeFileName && !contextFiles.includes(activeFileName)) {
      setContextFiles(prev => {
        if (prev.includes(activeFileName)) return prev;
        return [...prev, activeFileName];
      });
    }
  }, [activeFileName]);

  const toggleContextFile = useCallback((path: string) => {
    setContextFiles(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed, contextFiles.length > 0 ? contextFiles : undefined);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const streamSegments = useMemo(() => {
    if (!streamingContent) return null;
    const { segments } = extractCodeBlocks(streamingContent);
    return segments.map((seg, i) => {
      if (seg.type === "code" && seg.codeData) {
        return <CodeBlock key={i} data={seg.codeData} onApply={onApplyCode} activeFileName={activeFileName} />;
      }
      const html = marked.parse(seg.content, { async: false }) as string;
      return <div key={i} className="agent-message text-sm text-white/80" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }, [streamingContent, onApplyCode, activeFileName]);

  const availableFiles = openFiles.length > 0 ? openFiles : workspaceFiles;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center" style={{ padding: "24px 16px" }}>
              <div style={{
                width: 48, height: 48, margin: "0 auto 12px", borderRadius: 14,
                background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 32px rgba(6,182,212,0.15)",
              }}>
                <Brain style={{ width: 24, height: 24, color: "#fff" }} />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>{agentName}</h2>
              {agentModel && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 10px", borderRadius: 6, marginBottom: 8,
                  background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)",
                  fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                  color: "rgba(6,182,212,0.6)", fontWeight: 600,
                }}>
                  {agentModel}
                </div>
              )}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", maxWidth: 280, margin: "0 auto", lineHeight: 1.5 }}>
                Architecture, debugging, code generation, Lume programming, or just thinking through a problem.
              </p>
              {activeFileName && (
                <div style={{
                  marginTop: 12, display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "4px 12px", borderRadius: "6px",
                  background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)",
                  color: "rgba(6,182,212,0.5)", fontSize: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <FileCode style={{ width: 11, height: 11 }} />
                  {activeFileName.split("/").pop()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                agentName={agentName}
                onApply={onApplyCode}
                activeFileName={activeFileName}
              />
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-3 py-4 px-4 bg-white/[0.015]">
                <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1" style={{ flexWrap: "wrap" }}>
                    <span className="text-xs font-semibold text-white/60">{agentName}</span>
                    {agentModel && (
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(6,182,212,0.08)", color: "rgba(6,182,212,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {agentModel}
                      </span>
                    )}
                    {routeInfo && (
                      <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.08)", color: "rgba(168,85,247,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                        routed · {routeInfo.score}/10
                      </span>
                    )}
                  </div>
                  <div>{streamSegments}</div>
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3 py-4 px-4 bg-white/[0.015]">
                <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" style={{ animationDelay: "300ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" style={{ animationDelay: "600ms" }} />
                  </div>
                  <span className="text-xs text-white/30">{agentName} is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 12px 8px",
        background: "linear-gradient(to top, rgba(6,8,14,1), rgba(8,12,20,0.95))",
      }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
          {/* File context bar */}
          <div style={{ position: "relative", marginBottom: contextFiles.length > 0 || availableFiles.length > 0 ? "6px" : "0" }}>
            <FileContextBar
              files={availableFiles}
              selected={contextFiles}
              onToggle={toggleContextFile}
              onClear={() => setContextFiles([])}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={activeFileName
                  ? `Ask about ${activeFileName.split("/").pop()}...`
                  : `Ask ${agentName} anything...`
                }
                rows={1}
                style={{
                  width: "100%",
                  resize: "none",
                  borderRadius: 12,
                  padding: "10px 44px 10px 14px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e2e8f0",
                  outline: "none",
                  fontFamily: "'Inter', sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                disabled={isStreaming}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                style={{
                  position: "absolute", right: 6, bottom: 6,
                  padding: 7, borderRadius: 8,
                  background: (!input.trim() || isStreaming) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #06b6d4, #a855f7)",
                  border: "none", color: "#fff", cursor: (!input.trim() || isStreaming) ? "not-allowed" : "pointer",
                  opacity: (!input.trim() || isStreaming) ? 0.3 : 1,
                  transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {isStreaming ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 15, height: 15 }} />}
              </button>
            </div>
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={onRetry}
                title="Retry last"
                style={{
                  padding: 9, borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.3)", cursor: "pointer",
                  transition: "all 0.2s", display: "flex",
                }}
              >
                <RotateCcw style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <p style={{ fontSize: 8, color: "rgba(255,255,255,0.12)", textAlign: "center", marginTop: 6 }}>
            Shift+Enter for new line · Auto-routes to optimal model
          </p>
        </div>
      </div>
    </div>
  );
}
