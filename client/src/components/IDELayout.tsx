/**
 * Axiom Studio — IDE Layout
 * VS Code-style split-pane layout: ActivityBar → SidePanel → Editor → AI Chat
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ActivityBar, { type SidePanel } from "./ActivityBar";
import FileExplorer from "./FileExplorer";
import EditorArea, { type OpenFile } from "./EditorArea";
import TerminalPanel from "./TerminalPanel";
import ChatView from "./ChatView";
import LoginScreen from "./LoginScreen";
import CreditStore from "./CreditStore";
import ProfileBadge from "./ProfileBadge";
import AnalyticsDashboard from "../pages/AnalyticsDashboard";
import { useAuth } from "../hooks/useAuth";
import * as api from "../lib/api";
import { getLang } from "./MonacoEditor";
import { trackPageView } from "../lib/analytics";

interface Message {
  id: string; role: string; content: string; model?: string;
  inputTokens?: number; outputTokens?: number; errorContext?: string; createdAt: string;
}

export default function IDELayout() {
  const { token, user, login, signup, loginWithGoogle, loginWithGitHub, logout, biometricsAvailable, biometricsEnrolled, enrollBiometrics, loginWithBiometrics } = useAuth();
  const queryClient = useQueryClient();

  // IDE state
  const [sidePanel, setSidePanel] = useState<SidePanel>("files");
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCreditStore, setShowCreditStore] = useState(false);

  // Chat state (preserved from AgentPanel)
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState("opus");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  useEffect(() => { trackPageView("/studio"); }, []);

  // Queries
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.fetchModels });
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", token], queryFn: () => api.fetchConversations(token!), enabled: !!token,
  });
  const { data: creditData } = useQuery({
    queryKey: ["credits", token], queryFn: () => api.fetchCredits(token!), enabled: !!token, refetchInterval: 30000,
  });

  useEffect(() => {
    if (!activeConvoId || !token) { setMessages([]); return; }
    api.fetchMessages(token, activeConvoId).then(setMessages).catch(() => setMessages([]));
  }, [activeConvoId, token]);

  // ── File operations ──
  const handleOpenFile = useCallback(async (path: string, name: string) => {
    const existing = openFiles.find(f => f.path === path);
    if (existing) { setActiveFilePath(path); return; }
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load file");
      const data = await res.json();
      const lang = getLang(name);
      setOpenFiles(prev => [...prev, { path, name, content: data.content, originalContent: data.content, language: lang }]);
      setActiveFilePath(path);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [openFiles, token]);

  const handleCloseFile = useCallback((path: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== path));
    if (activeFilePath === path) {
      const remaining = openFiles.filter(f => f.path !== path);
      setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  }, [openFiles, activeFilePath]);

  const handleContentChange = useCallback((path: string, content: string) => {
    setOpenFiles(prev => prev.map(f => f.path === path ? { ...f, content } : f));
  }, []);

  const handleSaveFile = useCallback(async (path: string) => {
    const file = openFiles.find(f => f.path === path);
    if (!file) return;
    try {
      await fetch("/api/workspace/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path, content: file.content }),
      });
      setOpenFiles(prev => prev.map(f => f.path === path ? { ...f, originalContent: f.content } : f));
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [openFiles, token]);

  // ── Chat operations ──
  const handleNewChat = useCallback(async () => {
    if (!token) return;
    const agent = agents.find((a: any) => a.id === activeAgentId) || agents[0];
    const convo = await api.createConversation(token, activeAgentId, agent?.model || "claude-opus-4-20250514");
    setActiveConvoId(convo.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [token, activeAgentId, agents, queryClient]);

  const handleSendMessage = useCallback(async (content: string, contextFilePaths?: string[]) => {
    if (!token || !content.trim()) return;
    let convoId = activeConvoId;
    if (!convoId) {
      const agent = agents.find((a: any) => a.id === activeAgentId) || agents[0];
      const convo = await api.createConversation(token, activeAgentId, agent?.model || "claude-opus-4-20250514");
      convoId = convo.id;
      setActiveConvoId(convoId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    // Build message with file context
    let enrichedContent = content;
    if (contextFilePaths && contextFilePaths.length > 0) {
      const fileContents: string[] = [];
      for (const path of contextFilePaths) {
        const openFile = openFiles.find(f => f.path === path);
        if (openFile) {
          fileContents.push(`### File: ${path}\n\`\`\`${openFile.language}\n${openFile.content}\n\`\`\``);
        }
      }
      if (fileContents.length > 0) {
        enrichedContent = `**Context Files:**\n\n${fileContents.join("\n\n")}\n\n---\n\n${content}`;
      }
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString(),
      contextFiles: contextFilePaths,
    } as any;
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: convoId, agentId: activeAgentId, message: enrichedContent }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === "text" && parsed.content) { fullContent += parsed.content; setStreamingContent(fullContent); }
            if (parsed.type === "token" && parsed.token) { fullContent += parsed.token; setStreamingContent(fullContent); }
            if (parsed.type === "route") setRouteInfo(parsed);
          } catch { fullContent += payload; setStreamingContent(fullContent); }
        }
      }
      const assistantMsg: Message = {
        id: `resp-${Date.now()}`, role: "assistant", content: fullContent,
        model: routeInfo?.model, createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    } catch (err) { console.error("Chat error:", err); }
    setIsStreaming(false);
    setStreamingContent("");
  }, [token, activeConvoId, activeAgentId, agents, queryClient, routeInfo, openFiles]);

  // ── Apply code from agent to editor ──
  const handleApplyCode = useCallback((code: string, filename: string, _language: string) => {
    // Find if file is already open
    const existing = openFiles.find(f => f.path === filename || f.name === filename || f.path.endsWith(filename));
    if (existing) {
      // Replace content in the open file
      handleContentChange(existing.path, code);
      setActiveFilePath(existing.path);
    } else {
      // Open as a new file in the editor
      const lang = filename.split(".").pop() || "text";
      const langMap: Record<string, string> = {
        ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
        py: "python", css: "css", html: "html", json: "json", md: "markdown",
        sql: "sql", sh: "shell", yml: "yaml", yaml: "yaml",
      };
      setOpenFiles(prev => [...prev, {
        path: filename, name: filename.split("/").pop() || filename,
        content: code, originalContent: "",
        language: langMap[lang] || lang,
      }]);
      setActiveFilePath(filename);
    }
  }, [openFiles, handleContentChange]);

  const handleDeleteConvo = useCallback(async (id: string) => {
    if (!token) return;
    await api.deleteConversation(token, id);
    if (activeConvoId === id) { setActiveConvoId(null); setMessages([]); }
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [token, activeConvoId, queryClient]);

  // ── Panel change ──
  const handlePanelChange = useCallback((p: SidePanel) => {
    if (p === "analytics") { setShowAnalytics(true); setSidePanel(null); return; }
    if (p === "ai") { setChatCollapsed(false); setSidePanel(null); return; }
    setShowAnalytics(false);
    setSidePanel(prev => prev === p ? null : p);
  }, []);

  // Auth gate
  if (!token) return (
    <LoginScreen
      onLogin={login}
      onSignup={signup}
      onGoogleLogin={loginWithGoogle}
      onGitHubLogin={loginWithGitHub}
      biometricsAvailable={biometricsAvailable}
      biometricsEnrolled={biometricsEnrolled}
      onBiometricLogin={loginWithBiometrics}
    />
  );
  if (showAnalytics) return <AnalyticsDashboard onBack={() => setShowAnalytics(false)} token={token} />;
  if (showCreditStore) return (
    <CreditStore
      token={token}
      currentCredits={creditData?.credits ?? 0}
      onBack={() => setShowCreditStore(false)}
      onPurchased={() => queryClient.invalidateQueries({ queryKey: ["credits"] })}
    />
  );

  // ── Draggable panel resizing ──
  const [sidePanelWidth, setSidePanelWidth] = useState(260);
  const [chatPanelWidth, setChatPanelWidth] = useState(380);
  const draggingRef = useRef<"side" | "chat" | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      if (draggingRef.current === "side") {
        const newWidth = Math.min(Math.max(e.clientX - 48, 180), 500);
        setSidePanelWidth(newWidth);
      } else if (draggingRef.current === "chat") {
        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 260), 600);
        setChatPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => { draggingRef.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  const startDrag = (panel: "side" | "chat") => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = panel;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="ax-ide">
      {/* Profile Badge (upper-right) */}
      <ProfileBadge
        user={user}
        token={token}
        onLogout={logout}
        onOpenCredits={() => setShowCreditStore(true)}
        biometricsAvailable={biometricsAvailable}
        biometricsEnrolled={biometricsEnrolled}
        onEnrollBiometrics={enrollBiometrics}
      />

      {/* Activity Bar */}
      <ActivityBar
        activePanel={sidePanel}
        onPanelChange={handlePanelChange}
        onToggleTerminal={() => setTerminalVisible(v => !v)}
        ownerMode={user?.role === "owner"}
      />

      {/* Side Panel */}
      {sidePanel && (
        <>
          <div className="ax-side-panel" style={{ width: sidePanelWidth, minWidth: 180, maxWidth: 500 }}>
            {sidePanel === "files" && <FileExplorer token={token} onOpenFile={handleOpenFile} />}
            {sidePanel === "search" && (
              <div className="ax-panel-placeholder">
                <div className="ax-fe-header"><span className="ax-fe-title">SEARCH</span></div>
                <div style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Search across workspace (coming soon)</div>
              </div>
            )}
            {sidePanel === "git" && (
              <div className="ax-panel-placeholder">
                <div className="ax-fe-header"><span className="ax-fe-title">SOURCE CONTROL</span></div>
                <div style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Use terminal for git operations</div>
              </div>
            )}
            {sidePanel === "settings" && (
              <div className="ax-panel-placeholder">
                <div className="ax-fe-header"><span className="ax-fe-title">SETTINGS</span></div>
                <div style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  <p style={{ marginBottom: 8 }}>Credits: {creditData?.credits ?? "—"}</p>
                  <p style={{ marginBottom: 8 }}>User: {user?.displayName || user?.username}</p>
                  <p style={{ marginBottom: 12 }}>Role: {user?.role || "member"}</p>

                  {/* Buy Credits */}
                  <button
                    onClick={() => setShowCreditStore(true)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                      border: "none", color: "#fff", cursor: "pointer", marginBottom: 12,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      transition: "all 0.2s",
                    }}
                  >
                    ⚡ Buy Credits
                  </button>

                  {/* Biometric enrollment */}
                  {biometricsAvailable && (
                    <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Biometric Login</p>
                      {biometricsEnrolled ? (
                        <p style={{ fontSize: 11, color: "#22c55e" }}>✓ Enrolled — use Face ID / fingerprint to sign in</p>
                      ) : (
                        <button
                          onClick={async () => {
                            const err = await enrollBiometrics();
                            if (err) alert(err);
                          }}
                          style={{
                            padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                            color: "#06b6d4", cursor: "pointer",
                          }}
                        >
                          🔐 Enable Biometrics
                        </button>
                      )}
                    </div>
                  )}

                  <button onClick={logout} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>Logout</button>
                </div>
              </div>
            )}
          </div>
          {/* Drag handle for side panel */}
          <div className="ax-resize-handle" onMouseDown={startDrag("side")} />
        </>
      )}

      {/* Main Area (Editor + Terminal) */}
      <div className="ax-main-area">
        <div className="ax-editor-wrap">
          <EditorArea
            files={openFiles}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            onCloseFile={handleCloseFile}
            onContentChange={handleContentChange}
            onSave={handleSaveFile}
          />
        </div>
        <TerminalPanel token={token} visible={terminalVisible} onClose={() => setTerminalVisible(false)} />
      </div>

      {/* AI Chat (right panel) */}
      {!chatCollapsed && (
        <>
          {/* Drag handle for chat panel */}
          <div className="ax-resize-handle" onMouseDown={startDrag("chat")} />
          <div className="ax-chat-panel" style={{ width: chatPanelWidth, minWidth: 260, maxWidth: 600 }}>
          <div className="ax-chat-header">
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>AI ASSISTANT</span>
            <button onClick={() => setChatCollapsed(true)} className="ax-chat-collapse" title="Collapse">
              ›
            </button>
          </div>

          {/* Agent selector */}
          <div className="ax-chat-agents">
            {agents.slice(0, 4).map((a: any) => (
              <button
                key={a.id}
                className={`ax-agent-btn ${activeAgentId === a.id ? "ax-agent-btn--active" : ""}`}
                onClick={() => setActiveAgentId(a.id)}
              >
                {a.name?.replace("Agent ", "") || a.id}
              </button>
            ))}
          </div>

          {/* Conversation list (compact) */}
          <div className="ax-chat-convos">
            <button className="ax-new-chat" onClick={handleNewChat}>+ New Chat</button>
            {conversations.slice(0, 8).map((c: any) => (
              <button
                key={c.id}
                className={`ax-convo-item ${c.id === activeConvoId ? "ax-convo-item--active" : ""}`}
                onClick={() => setActiveConvoId(c.id)}
              >
                {c.title || "Untitled"}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <ChatView
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            agentName={agents.find((a: any) => a.id === activeAgentId)?.name || "Axiom"}
            agentColor="#06b6d4"
            routeInfo={routeInfo}
            onSend={handleSendMessage}
            onRetry={() => {
              const last = messages.filter(m => m.role === "user").pop();
              if (last) handleSendMessage(last.content);
            }}
            onApplyCode={handleApplyCode}
            activeFileName={activeFilePath || undefined}
            openFiles={openFiles.map(f => ({ path: f.path, name: f.name }))}
          />
        </div>
        </>
      )}

      {/* Collapsed chat toggle */}
      {chatCollapsed && (
        <button className="ax-chat-expand" onClick={() => setChatCollapsed(false)} title="Open AI Chat">
          🤖
        </button>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="ax-mobile-nav">
        <button onClick={() => handlePanelChange("files")} className={sidePanel === "files" ? "ax-mn-active" : ""}>📁<span>Files</span></button>
        <button onClick={() => setSidePanel(null)}>✏️<span>Editor</span></button>
        <button onClick={() => setChatCollapsed(false)}>🤖<span>AI</span></button>
        <button onClick={() => setTerminalVisible(v => !v)}>⌨️<span>Terminal</span></button>
      </nav>
    </div>
  );
}

