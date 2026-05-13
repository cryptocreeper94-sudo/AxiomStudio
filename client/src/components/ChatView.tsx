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
  FileCode, FileDown, ChevronDown, Paperclip, X as XIcon, Upload, Image as ImageIcon,
  StopCircle, Mic, MicOff
} from "lucide-react";
import { marked } from "marked";
import StarterHub, { type StarterConfig } from "./StarterHub";
import ThinkingIndicator from "./ThinkingIndicator";
import ProgressTracker, { type ChecklistItem } from "./ProgressTracker";

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
  agentName?: string;
  agentColor?: string;
  agentModel?: string;
  routeInfo?: { model: string; agent: string; score: number; reason: string } | null;
  onSend: (message: string, contextFiles?: string[]) => void;
  onRetry?: () => void;
  onStop?: () => void;
  onApplyCode?: (code: string, filename: string, language: string) => void;
  activeFileName?: string;
  openFiles?: FileContextItem[];
  workspaceFiles?: FileContextItem[];
  toolActivity?: Array<{ tool: string; args?: any; result?: string; isError?: boolean; done: boolean }>;
  contextFiles?: string[];
  activeAgentId?: string;
  agents?: any[];
  onFileUpload?: () => void;
  onSelectStarter?: (starter: StarterConfig) => void;
  activeStarter?: StarterConfig | null;
  progressChecklist?: ChecklistItem[];
  onClearStarter?: () => void;
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
      return <div key={i} className="agent-message" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }, [msg.content, isUser, onApply, activeFileName]);

  const modelShort = msg.model?.includes("claude-3-opus") ? "Claude 3 Opus"
    : msg.model?.includes("claude-3-5-sonnet") ? "Claude 3.5 Sonnet"
    : msg.model?.includes("4.1") ? "GPT-4.1"
    : msg.model?.includes("4o-mini") ? "GPT-4o Mini"
    : msg.model || "";

  return (
    <div style={{
      display: "flex", gap: 10, padding: "10px 14px",
      background: isUser ? "transparent" : "rgba(255,255,255,0.015)",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isUser ? "rgba(168,85,247,0.12)" : "rgba(6,182,212,0.12)",
        color: isUser ? "#c084fc" : "#22d3ee",
      }}>
        {isUser ? <User style={{ width: 14, height: 14 }} /> : <Brain style={{ width: 14, height: 14 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{isUser ? "You" : agentName}</span>
          {modelShort && !isUser && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(6,182,212,0.08)", color: "rgba(6,182,212,0.45)", fontFamily: "'JetBrains Mono', monospace" }}>
              {modelShort}
            </span>
          )}
          {msg.inputTokens != null && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", fontFamily: "'JetBrains Mono', monospace" }}>
              {msg.inputTokens}↓ {msg.outputTokens}↑
            </span>
          )}
        </div>
        {msg.errorContext && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8, marginBottom: 8,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
            fontSize: 11, color: "#fca5a5",
          }}>
            <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Error context attached</span>
          </div>
        )}
        {/* Context files badge */}
        {msg.contextFiles && msg.contextFiles.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
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
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap", lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
        ) : (
          <div>{rendered}</div>
        )}
      </div>
      {!isUser && (
        <button
          onClick={() => { navigator.clipboard.writeText(msg.content); }}
          style={{
            padding: 4, borderRadius: 4, background: "none", border: "none",
            color: "rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0,
            alignSelf: "flex-start", marginTop: 4, transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          title="Copy full response"
        >
          <Copy style={{ width: 12, height: 12 }} />
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
  messages, streamingContent, isStreaming, agentName = "Axiom", agentColor = "#06b6d4", agentModel,
  routeInfo, onSend, onRetry, onStop, onApplyCode, activeFileName, openFiles = [], workspaceFiles = [],
  toolActivity = [], onFileUpload, onSelectStarter, activeStarter, progressChecklist, onClearStarter,
}: Props) {
  const [trackerCollapsed, setTrackerCollapsed] = useState(false);
  const [input, setInput] = useState("");
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; content: string; isImage: boolean; size: number }>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceRecording = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      // If we want to append, we'd need to store the prefix, but for simplicity we can just set it
      // or append if the user was already typing.
      setInput(prev => {
        const prefix = prev && !prev.endsWith(' ') ? prev + ' ' : prev;
        return prefix + currentTranscript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

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
    if (!trimmed) return;

    // Enrich message with uploaded files
    let finalMsg = trimmed;
    if (uploadedFiles.length > 0) {
      const fileParts = uploadedFiles.map(f => {
        if (f.isImage) return `[Attached image: ${f.name} (${(f.size / 1024).toFixed(1)} KB)]`;
        return `### Attached File: ${f.name}\n\`\`\`\n${f.content.slice(0, 50000)}\n\`\`\``;
      });
      finalMsg = `**Attached Files:**\n\n${fileParts.join("\n\n")}\n\n---\n\n${trimmed}`;
      setUploadedFiles([]);
    }

    onSend(finalMsg, contextFiles.length > 0 ? contextFiles : undefined);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  /* ── File handling ── */
  const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isImg = IMAGE_EXTS.some(ext => file.name.toLowerCase().endsWith(ext));
      if (isImg) {
        reader.onload = () => setUploadedFiles(prev => [...prev, { name: file.name, content: reader.result as string, isImage: true, size: file.size }]);
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => setUploadedFiles(prev => [...prev, { name: file.name, content: reader.result as string, isImage: false, size: file.size }]);
        reader.readAsText(file);
      }
    });
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.length === 0 && !isStreaming ? (
          <StarterHub
            onSelectStarter={(starter) => onSelectStarter?.(starter)}
            agentName={agentName}
          />
        ) : (
          <div>
            {/* Progress Tracker — shown when a starter is active */}
            {activeStarter && progressChecklist && (
              <div style={{ padding: "8px 14px" }}>
                <ProgressTracker
                  starterTitle={activeStarter.title}
                  starterColor={activeStarter.color}
                  checklist={progressChecklist}
                  onClose={() => onClearStarter?.()}
                  collapsed={trackerCollapsed}
                  onToggleCollapse={() => setTrackerCollapsed(!trackerCollapsed)}
                />
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                agentName={agentName}
                onApply={onApplyCode}
                activeFileName={activeFileName}
              />
            ))}
            {/* Tool Activity Panel — shown while streaming with tool calls */}
            {isStreaming && toolActivity.length > 0 && (
              <div style={{
                margin: "8px 14px",
                borderRadius: 10,
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.15)",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "6px 10px",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "rgba(167,139,250,0.7)",
                  borderBottom: "1px solid rgba(99,102,241,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}>⚙ AGENT ACTIONS</div>
                {toolActivity.map((t, i) => (
                  <div key={i} style={{
                    padding: "5px 10px",
                    borderBottom: i < toolActivity.length - 1 ? "1px solid rgba(99,102,241,0.06)" : undefined,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                  }}>
                    <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>
                      {!t.done ? "⏳" : t.isError ? "❌" : "✅"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(167,139,250,0.9)" }}>
                        {t.tool}({t.args ? Object.entries(t.args).map(([k, v]) => `${k}: "${String(v).slice(0, 40)}"`).join(", ") : ""})
                      </div>
                      {t.done && t.result && (
                        <div style={{
                          marginTop: 2,
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: t.isError ? "rgba(248,113,113,0.7)" : "rgba(255,255,255,0.3)",
                          whiteSpace: "pre-wrap",
                          maxHeight: 60,
                          overflow: "hidden",
                        }}>
                          {t.result.slice(0, 200)}{t.result.length > 200 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isStreaming && streamingContent && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.015)" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(6,182,212,0.12)", color: "#22d3ee",
                }}>
                  <Brain style={{ width: 14, height: 14 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{agentName}</span>
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
            {/* Enhanced Thinking Indicator */}
            <ThinkingIndicator
              agentName={agentName}
              agentColor={agentColor}
              toolActivity={toolActivity}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
            />
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "12px 12px 8px",
          background: "linear-gradient(to top, rgba(6,8,14,1), rgba(8,12,20,0.95))",
          position: "relative",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(6,182,212,0.08)",
            border: "2px dashed rgba(6,182,212,0.3)", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#06b6d4", fontSize: 13, fontWeight: 600, zIndex: 10,
            pointerEvents: "none",
          }}>
            Drop files here
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.js,.ts,.tsx,.jsx,.py,.css,.html,.json,.md,.csv,.yml,.yaml,.xml,.sql,.sh,.lume,.toml,.env"
          onChange={handleFilePick}
          style={{ display: "none" }}
        />

        <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
          {/* Uploaded file badges */}
          {uploadedFiles.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>ATTACHED:</span>
              {uploadedFiles.map((f, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6, fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: f.isImage ? "rgba(168,85,247,0.08)" : "rgba(34,197,94,0.08)",
                  border: `1px solid ${f.isImage ? "rgba(168,85,247,0.15)" : "rgba(34,197,94,0.15)"}`,
                  color: f.isImage ? "#c084fc" : "#4ade80",
                  maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {f.isImage ? <ImageIcon style={{ width: 10, height: 10, flexShrink: 0 }} /> : <FileCode style={{ width: 10, height: 10, flexShrink: 0 }} />}
                  {f.name}
                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex", opacity: 0.6 }}>
                    <XIcon style={{ width: 10, height: 10 }} />
                  </button>
                </span>
              ))}
            </div>
          )}

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
            {/* File upload button */}
            <button
              onClick={() => onFileUpload ? onFileUpload() : fileInputRef.current?.click()}
              title="Attach files from your device"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.3)", cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.08)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; e.currentTarget.style.color = "#06b6d4"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
            >
              <Upload style={{ width: 14, height: 14 }} />
            </button>
            
            {/* Voice Input Button */}
            <button
              onClick={toggleVoiceRecording}
              title={isListening ? "Stop listening" : "Start voice input"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: isListening ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.04)", 
                border: `1px solid ${isListening ? "rgba(239, 68, 68, 0.4)" : "rgba(255,255,255,0.08)"}`,
                color: isListening ? "#ef4444" : "rgba(255,255,255,0.3)", 
                cursor: "pointer",
                transition: "all 0.2s",
                animation: isListening ? "pulse-dot 1.5s infinite ease-in-out" : "none",
              }}
              onMouseEnter={e => { if (!isListening) { e.currentTarget.style.background = "rgba(6,182,212,0.08)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; e.currentTarget.style.color = "#06b6d4"; } }}
              onMouseLeave={e => { if (!isListening) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; } }}
            >
              {isListening ? <MicOff style={{ width: 14, height: 14 }} /> : <Mic style={{ width: 14, height: 14 }} />}
            </button>

            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening ? "Listening..." :
                  activeFileName
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
                disabled={false}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && uploadedFiles.length === 0)}
                style={{
                  position: "absolute", right: 6, bottom: 6,
                  padding: 7, borderRadius: 8,
                  background: (!input.trim() && uploadedFiles.length === 0) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #06b6d4, #a855f7)",
                  border: "none", color: "#fff", cursor: (!input.trim() && uploadedFiles.length === 0) ? "not-allowed" : "pointer",
                  opacity: (!input.trim() && uploadedFiles.length === 0) ? 0.3 : 1,
                  transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {isStreaming ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 15, height: 15 }} />}
              </button>
            </div>
            {onRetry && messages.length > 0 && !isStreaming && (
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
            Shift+Enter for new line · Drop files to attach · Auto-routes to optimal model
          </p>
        </div>
      </div>
    </div>
  );
}
