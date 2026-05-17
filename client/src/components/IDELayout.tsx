/**
 * Axiom Studio — IDE Layout
 * VS Code-style split-pane layout: ActivityBar → SidePanel → Editor → AI Chat
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Terminal, PanelRightClose, PanelRightOpen, Eye, EyeOff, Download, Zap, Plus } from "lucide-react";
import ActivityBar, { type SidePanel } from "./ActivityBar";
import FileExplorer from "./FileExplorer";
import EditorArea, { type OpenFile } from "./EditorArea";
import TerminalPanel from "./TerminalPanel";
import ChatView from "./ChatView";
import PreviewPane from "./PreviewPane";
import { type StarterConfig } from "./StarterHub";
import { type ChecklistItem } from "./ProgressTracker";
import LoginScreen from "./LoginScreen";
import CreditStore from "./CreditStore";
import SettingsView from "./SettingsView";
import ProfileBadge from "./ProfileBadge";
import LibraryPanel from "./LibraryPanel";
import ConversationHistory from "./ConversationHistory";
import DashboardHome from "./DashboardHome";
import AnalyticsDashboard from "../pages/AnalyticsDashboard";
import { useAuth } from "../hooks/useAuth";
import { useIsMobile } from "../hooks/use-mobile";
import * as api from "../lib/api";
import { getLang } from "./MonacoEditor";
import { trackPageView } from "../lib/analytics";
import MobileLayout from "./mobile/MobileLayout";

export interface Message {
  id: string; role: string; content: string; model?: string;
  inputTokens?: number; outputTokens?: number; errorContext?: string; createdAt: string;
}

export default function IDELayout() {
  const { token, user, login, signup, loginWithGoogle, loginWithGitHub, logout, biometricsAvailable, biometricsEnrolled, enrollBiometrics, loginWithBiometrics } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // IDE state
  const [sidePanel, setSidePanel] = useState<SidePanel>("files");
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCreditStore, setShowCreditStore] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  // Chat state (preserved from AgentPanel)
  const [activeConvoId, setActiveConvoId] = useState<string | null>(() => {
    try { return localStorage.getItem('axiom_active_convo') || null; } catch { return null; }
  });
  const [activeAgentId, setActiveAgentId] = useState("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messageQueue, setMessageQueue] = useState<{content: string, contextFilePaths?: string[]}[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [toolActivity, setToolActivity] = useState<Array<{ tool: string; args?: any; result?: string; isError?: boolean; done: boolean }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const pendingArtifactPathRef = useRef<string | null>(null);

  // ── Starter state ──
  const [activeStarter, setActiveStarter] = useState<StarterConfig | null>(null);
  const [progressChecklist, setProgressChecklist] = useState<ChecklistItem[]>([]);

  // ── Bottom panel state ──
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'problems' | 'output'>('terminal');
  const [errors, setErrors] = useState<Array<{ severity: 'error' | 'warning'; message: string; file?: string }>>([]);

  // ── Draggable panel resizing (must be before any conditional returns — Rules of Hooks) ──
  const [sidePanelWidth, setSidePanelWidth] = useState(260);
  const [chatPanelWidth, setChatPanelWidth] = useState(380);
  const draggingRef = useRef<"side" | "chat" | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      if (draggingRef.current === "side") {
        const calc = e.clientX - 48;
        if (calc < 100) {
          setSidePanel(null);
          draggingRef.current = null;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        } else {
          setSidePanelWidth(Math.min(Math.max(calc, 180), 500));
        }
      } else if (draggingRef.current === "chat") {
        const calc = window.innerWidth - e.clientX;
        if (calc < 150) {
          setChatCollapsed(true);
          draggingRef.current = null;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        } else {
          setChatPanelWidth(Math.min(Math.max(calc, 260), 600));
        }
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

  useEffect(() => { trackPageView("/studio"); }, []);

  // Persist active conversation to localStorage
  useEffect(() => {
    try {
      if (activeConvoId) localStorage.setItem('axiom_active_convo', activeConvoId);
      else localStorage.removeItem('axiom_active_convo');
    } catch {}
  }, [activeConvoId]);

  // Stop agent (cancel streaming)
  const handleStopAgent = useCallback(() => {
    // Abort the in-flight fetch so the server stops streaming
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setSidePanel(prev => prev ? null : "files");
      }
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        setTerminalVisible(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Cockpit clock
  useEffect(() => {
    const update = () => {
      const el = document.getElementById("ax-cs-time");
      if (el) el.textContent = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" });
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  // Queries
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.fetchModels });
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", token], queryFn: () => api.fetchConversations(token!), enabled: !!token,
  });
  const { data: creditData } = useQuery({
    queryKey: ["credits", token], queryFn: () => api.fetchCredits(token!), enabled: !!token, refetchInterval: 30000,
  });

  // Fetch messages when conversation changes (NOT when streaming state changes)
  // The streaming handler adds messages to local state optimistically.
  // Re-fetching on stream end caused a race condition that wiped conversations.
  useEffect(() => {
    if (activeConvoId && token) {
      // Clear open files when switching conversations for isolation
      setOpenFiles([]);
      setActiveFilePath(null);

      api.fetchMessages(token, activeConvoId).then((fetched) => {
        setMessages(prev => {
          // Don't wipe optimistic messages if server hasn't caught up yet
          if (fetched.length === 0 && prev.length > 0) return prev;
          if (prev.length > fetched.length) return prev;
          return fetched;
        });
      }).catch(console.error);
    }
  }, [activeConvoId, token]);

  // Restore last open file from conversation metadata
  useEffect(() => {
    if (activeConvoId && conversations.length > 0) {
      const convo = conversations.find((c: any) => c.id === activeConvoId);
      if (convo?.last_open_file) {
        const fileName = convo.last_open_file.split(/[\\/]/).pop() || convo.last_open_file;
        // Small delay to let the file explorer load the tree first
        setTimeout(() => handleOpenFile(convo.last_open_file, fileName), 300);
      }
    }
  }, [activeConvoId, conversations]);

  // Save last open file when it changes
  useEffect(() => {
    if (token && activeConvoId && activeFilePath) {
      api.updateConversation(token, activeConvoId, { lastOpenFile: activeFilePath }).catch(() => {});
    }
  }, [activeFilePath, token, activeConvoId]);

  // Load starter state from conversation
  useEffect(() => {
    if (activeConvoId) {
      const convo = conversations.find((c: any) => c.id === activeConvoId);
      if (convo) {
        if (convo.activeStarter) setActiveStarter(convo.activeStarter);
        else setActiveStarter(null);
        if (convo.checklist) setProgressChecklist(convo.checklist);
        else setProgressChecklist([]);
      }
    }
  }, [activeConvoId, conversations]);


  // Save starter state helpers
  const saveStarterState = useCallback((starter: StarterConfig | null, checklist: ChecklistItem[]) => {
    if (!token || !activeConvoId) return;
    api.updateConversation(token, activeConvoId, {
      activeStarter: starter,
      checklist: checklist
    }).catch(console.error);
  }, [token, activeConvoId]);

  // ── File operations ──
  const handleOpenFile = useCallback(async (path: string, name: string) => {
    const existing = openFiles.find(f => f.path === path);
    if (existing) { setActiveFilePath(path); return; }
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default"
        },
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
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
          "x-convo-id": activeConvoId || "default"
        },
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
    const convo = await api.createConversation(token, activeAgentId, agent?.model || "claude-opus-4-7");
    setActiveConvoId(convo.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [token, activeAgentId, agents, queryClient]);

  const handleSendMessage = useCallback(async (content: string, contextFilePaths?: string[]) => {
    if (!token || !content.trim()) return;
    if (isStreaming) {
      setMessageQueue(prev => [...prev, { content, contextFilePaths }]);
      return;
    }
    setIsStreaming(true); // Lock immediately to prevent double-clicks
    
    // Check credits before doing anything (skip for auto-route and free agents)
    const agentCost = creditData?.agentCosts?.[activeAgentId];
    const cost = activeAgentId === "auto" ? 0 : (agentCost?.credits ?? 0);
    const currentBalance = creditData?.credits ?? 0;
    if (cost > 0 && currentBalance < cost) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: "assistant", content: `⚠️ Insufficient credits to use this agent. You have ${currentBalance} credits remaining but need ${cost} credits. Please buy more credits.`, createdAt: new Date().toISOString()
      }]);
      setIsStreaming(false);
      return;
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

    let convoId = activeConvoId;
    if (!convoId) {
      try {
        const agent = agents.find((a: any) => a.id === activeAgentId) || agents[0];
        const convo = await api.createConversation(token, activeAgentId, agent?.model || "claude-opus-4-7");
        convoId = convo.id;
        
        if (!convoId) {
          throw new Error("Backend failed to return a valid conversation ID.");
        }
        
        setActiveConvoId(convoId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: "assistant", content: `⚠️ Failed to create conversation: ${err.message}`, createdAt: new Date().toISOString()
        }]);
        setIsStreaming(false);
        setStreamingContent("");
        return;
      }
    }

    // Add optimistic user message before sending
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content,
      createdAt: new Date().toISOString(),
      model: undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setStreamingContent("");
    setToolActivity([]); // reset tool trace for new message
    let fullContent = "";

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: convoId, agentId: activeAgentId, message: enrichedContent }),
        signal: controller.signal,
      });

      // Handle non-stream error responses (402, 400, 500, etc.)
      if (!res.ok) {
        let errMsg = `Error ${res.status}`;
        try {
          const errJson = await res.json();
          errMsg = errJson.message || errJson.error || errMsg;
        } catch {}
        const errResponse: Message = {
          id: `err-${Date.now()}`, role: "assistant", content: `⚠️ ${errMsg}`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errResponse]);
        setIsStreaming(false);
        setStreamingContent("");
        return;
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n");
        sseBuffer = parts.pop() || ""; // Keep incomplete line in buffer
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === "text" && (parsed.content || parsed.text)) { const t = parsed.content || parsed.text; fullContent += t; setStreamingContent(fullContent); }
            if (parsed.type === "token" && parsed.token) { fullContent += parsed.token; setStreamingContent(fullContent); }
            if (parsed.type === "route") setRouteInfo(parsed);
            if (parsed.type === "tool_call") {
              setToolActivity(prev => [...prev, { tool: parsed.tool, args: parsed.args, done: false }]);
              if ((parsed.tool === "write_to_file" || parsed.tool === "write_file" || parsed.tool === "replace_file_content") && parsed.args?.TargetFile?.endsWith(".md")) {
                pendingArtifactPathRef.current = parsed.args.TargetFile;
              }
            }
            if (parsed.type === "tool_result") {
              setToolActivity(prev => prev.map((t, i) =>
                i === prev.length - 1 && t.tool === parsed.tool
                  ? { ...t, result: parsed.result, isError: parsed.isError, done: true }
                  : t
              ));
              if (pendingArtifactPathRef.current && !parsed.isError && (parsed.tool === "write_to_file" || parsed.tool === "write_file" || parsed.tool === "replace_file_content")) {
                const target = pendingArtifactPathRef.current;
                setTimeout(() => {
                  handleOpenFile(target, target.split(/[\\/]/).pop() || target);
                }, 500);
                pendingArtifactPathRef.current = null;
              }
            }
            if (parsed.type === "error") { fullContent += `\n\n⚠️ ${parsed.error}`; setStreamingContent(fullContent); }
          } catch { /* incomplete JSON, will be buffered */ }
        }
      }
      const assistantMsg: Message = {
        id: `resp-${Date.now()}`, role: "assistant", content: fullContent || "(No response received)",
        model: routeInfo?.model, createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    } catch (err) {
      // Don't show error for intentional user aborts
      if ((err as Error).name === "AbortError") {
        // User cancelled — commit whatever we have so far
        if (fullContent.trim()) {
          const assistantMsg: Message = {
            id: `resp-${Date.now()}`, role: "assistant", content: fullContent + "\n\n*(Generation stopped)*",
            model: routeInfo?.model, createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      } else {
        console.error("Chat error:", err);
        const errResponse: Message = {
          id: `err-${Date.now()}`, role: "assistant",
          content: `⚠️ Connection error: ${(err as Error).message}`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errResponse]);
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [token, activeConvoId, activeAgentId, isStreaming, agents, queryClient, routeInfo, openFiles, creditData]);

  // Auto-process message queue
  useEffect(() => {
    if (!isStreaming && messageQueue.length > 0) {
      const nextMsg = messageQueue[0];
      setMessageQueue(q => q.slice(1));
      handleSendMessage(nextMsg.content, nextMsg.contextFilePaths);
    }
  }, [isStreaming, messageQueue, handleSendMessage]);

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
    setSidePanel(p);
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

  // Dashboard home — shown before entering the IDE
  if (showDashboard) {
    return (
      <DashboardHome
        user={user}
        token={token}
        credits={creditData?.credits ?? 0}
        conversations={conversations}
        agents={agents}
        onEnterIDE={() => setShowDashboard(false)}
        onNewChat={() => { handleNewChat(); setShowDashboard(false); }}
        onSelectConvo={(id) => { setActiveConvoId(id); setShowDashboard(false); }}
        onOpenCredits={() => setShowCreditStore(true)}
        onLogout={logout}
      />
    );
  }



  if (isMobile) {
    return (
      <MobileLayout
        token={token}
        user={user}
        agents={agents}
        conversations={conversations}
        openFiles={openFiles}
        activeFilePath={activeFilePath}
        onOpenFile={handleOpenFile}
        onFileSelect={setActiveFilePath}
        onContentChange={handleContentChange}
        activeConvoId={activeConvoId}
        activeAgentId={activeAgentId}
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        onSendMessage={handleSendMessage}
        onStopAgent={handleStopAgent}
        onApplyCode={handleApplyCode}
        creditData={creditData}
        onLogout={logout}
        onOpenCredits={() => setShowCreditStore(true)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* ── Cockpit Status Bar ── */}
      <header className="ax-cockpit-status">
        <div className="ax-cs-left">
          <div className="ax-cs-brand" onClick={() => setShowDashboard(true)} style={{ cursor: "pointer" }} title="Home">
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: "linear-gradient(135deg, #06b6d4, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: "#000",
            }}>⬡</div>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
              background: "linear-gradient(135deg, #06b6d4, #a855f7)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>AXIOM STUDIO</span>
          </div>
          <span className="ax-cs-time" id="ax-cs-time"></span>
        </div>

        <div className="ax-cs-center">
          <div className="ax-cs-metric">
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.4)" }} />
            <span className="ax-cs-val">{agents.length}</span>
            <span className="ax-cs-label">Agents</span>
          </div>
          <div className="ax-cs-divider" />
          <div className="ax-cs-metric">
            <span className="ax-cs-val">{conversations.length}</span>
            <span className="ax-cs-label">Chats</span>
          </div>
          <div className="ax-cs-divider" />
          <div className="ax-cs-metric">
            <span className="ax-cs-val">{creditData?.credits ?? "—"}</span>
            <span className="ax-cs-label">Credits</span>
          </div>
          <div className="ax-cs-divider" />
          <button
            onClick={() => setShowCreditStore(true)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 12,
              background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)",
              color: "#06b6d4", fontSize: 9, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <Plus size={10} /> Buy
          </button>
        </div>

        <div className="ax-cs-right">
          <button
            onClick={() => setPreviewVisible(!previewVisible)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: previewVisible ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${previewVisible ? "rgba(6, 182, 212, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              color: previewVisible ? "#06b6d4" : "rgba(255, 255, 255, 0.6)",
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: "pointer", marginRight: 12, transition: "all 0.2s"
            }}
          >
            {previewVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            {previewVisible ? "Close Preview" : "Live Preview"}
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/workspace/export", {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "x-convo-id": activeConvoId || "default",
                  },
                });
                if (!res.ok) throw new Error("Export failed");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `axiom-project-${Date.now()}.zip`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error("Export error:", err);
              }
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.6)",
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: "pointer", marginRight: 6, transition: "all 0.2s",
            }}
            title="Export project as ZIP"
          >
            <Download size={14} />
            Export
          </button>
          <ProfileBadge
            user={user}
            token={token}
            onLogout={logout}
            onOpenCredits={() => setShowCreditStore(true)}
            biometricsAvailable={biometricsAvailable}
            biometricsEnrolled={biometricsEnrolled}
            onEnrollBiometrics={enrollBiometrics}
          />
        </div>
      </header>

    <div className="ax-ide">

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
            {sidePanel === "files" && <FileExplorer token={token} activeConvoId={activeConvoId} onOpenFile={handleOpenFile} />}
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
            {sidePanel === "settings" && <SettingsView credits={creditData?.credits ?? 0} onOpenCredits={() => setShowCreditStore(true)} />}
            {sidePanel === "library" && <LibraryPanel token={token} activeConvoId={activeConvoId} onOpenFile={handleOpenFile} />}
            {sidePanel === "history" && (
              <ConversationHistory
                conversations={conversations}
                activeConvoId={activeConvoId}
                onSelectConvo={setActiveConvoId}
                onNewChat={handleNewChat}
                onDeleteConvo={handleDeleteConvo}
                onRenameConvo={(id, title) => {
                  if (token) api.updateConversation(token, id, { title }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  }).catch(console.error);
                }}
              />
            )}
          </div>
          {/* Drag handle for side panel */}
          <div className="ax-resize-handle" onMouseDown={startDrag("side")} />
        </>
      )}

      {/* Main Area (Editor + Bottom Panel) */}
      <div className="ax-main-area">
        <div className="ax-editor-wrap" style={{ display: "flex", flexDirection: "row", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: previewVisible ? 0.5 : 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <EditorArea
              files={openFiles}
              activeFilePath={activeFilePath}
              onSelectFile={setActiveFilePath}
              onCloseFile={handleCloseFile}
              onContentChange={handleContentChange}
              onSave={handleSaveFile}
            />
          </div>
          {previewVisible && (
            <div style={{
              width: 2, background: "rgba(255,255,255,0.05)", cursor: "col-resize",
              borderLeft: "1px solid #000", borderRight: "1px solid rgba(255,255,255,0.05)"
            }} />
          )}
          {previewVisible && (
            <div style={{ flex: 0.5, minWidth: 300, display: "flex", flexDirection: "column" }}>
              <PreviewPane token={token} activeConvoId={activeConvoId} entryPoint="index.html" />
            </div>
          )}
        </div>

        {/* Bottom Panel (Terminal + Problems + Output) */}
        {terminalVisible && (
          <div className="ax-bottom-panel" style={{ height: bottomPanelHeight, minHeight: 120, maxHeight: '60vh' }}>
            {/* Drag handle for bottom panel resize */}
            <div
              className="ax-bottom-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startH = bottomPanelHeight;
                const onMove = (ev: MouseEvent) => {
                  const delta = startY - ev.clientY;
                  setBottomPanelHeight(Math.min(Math.max(startH + delta, 120), window.innerHeight * 0.6));
                };
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
              }}
            />
            {/* Bottom panel tabs */}
            <div className="ax-bp-tabs">
              <div className="ax-bp-tab-group">
                <button
                  className={`ax-bp-tab ${bottomTab === 'terminal' ? 'ax-bp-tab--active' : ''}`}
                  onClick={() => setBottomTab('terminal')}
                >TERMINAL</button>
                <button
                  className={`ax-bp-tab ${bottomTab === 'problems' ? 'ax-bp-tab--active' : ''}`}
                  onClick={() => setBottomTab('problems')}
                >
                  PROBLEMS
                  {errors.length > 0 && <span className="ax-bp-badge">{errors.length}</span>}
                </button>
                <button
                  className={`ax-bp-tab ${bottomTab === 'output' ? 'ax-bp-tab--active' : ''}`}
                  onClick={() => setBottomTab('output')}
                >OUTPUT</button>
              </div>
              <div className="ax-bp-actions">
                <button className="ax-terminal-action" onClick={() => setTerminalVisible(false)} title="Close panel">
                  <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="ax-bp-content">
              {bottomTab === 'terminal' && (
                <TerminalPanel token={token} visible={true} onClose={() => setTerminalVisible(false)} />
              )}
              {bottomTab === 'problems' && (
                <div className="ax-problems-list">
                  {errors.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                      No problems detected
                    </div>
                  ) : (
                    errors.map((err, i) => (
                      <div key={i} className="ax-problem-item">
                        <span className="ax-problem-icon" style={{ color: err.severity === 'error' ? '#ef4444' : '#eab308' }}>
                          {err.severity === 'error' ? '●' : '▲'}
                        </span>
                        <span className="ax-problem-msg">{err.message}</span>
                        {err.file && <span className="ax-problem-file">{err.file}</span>}
                        <button
                          className="ax-problem-send"
                          onClick={() => {
                            const errMsg = `[Error in ${err.file || 'unknown'}]: ${err.message}`;
                            handleSendMessage(errMsg);
                            setChatCollapsed(false);
                          }}
                          title="Send to AI Agent"
                        >
                          Send to Agent
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
              {bottomTab === 'output' && (
                <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>
                  Build output will appear here
                </div>
              )}
            </div>
          </div>
        )}
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
            {agents.map((a: any) => {
              const modelShort = a.model?.includes("opus") ? "Opus 4"
                : a.model?.includes("sonnet") ? "Sonnet 4"
                : a.model?.includes("4.1") ? "GPT-4.1"
                : a.model?.includes("4o-mini") ? "4o Mini"
                : a.model || "";
              return (
                <button
                  key={a.id}
                  className={`ax-agent-btn ${activeAgentId === a.id ? "ax-agent-btn--active" : ""}`}
                  onClick={() => setActiveAgentId(a.id)}
                  title={`${a.name} — ${a.model} (${a.provider})`}
                >
                  <span style={{ fontWeight: 700 }}>{a.name?.replace("Agent ", "") || a.id}</span>
                  <span style={{ fontSize: 8, opacity: 0.5, marginLeft: 3 }}>{modelShort}</span>
                </button>
              );
            })}
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
            agentModel={agents.find((a: any) => a.id === activeAgentId)?.model || ""}
            onSend={handleSendMessage}
            onRetry={() => {
              const last = messages.filter(m => m.role === "user").pop();
              if (last) handleSendMessage(last.content);
            }}
            onApplyCode={handleApplyCode}
            activeFileName={activeFilePath || undefined}
            openFiles={openFiles.map(f => ({ path: f.path, name: f.name }))}
            toolActivity={toolActivity}
            activeStarter={activeStarter}
            progressChecklist={progressChecklist}
            onSelectStarter={(starter) => {
              setActiveStarter(starter);
              setProgressChecklist(starter.checklist.map((label, i) => ({
                label,
                status: i === 0 ? "active" as const : "pending" as const,
              })));
              // Auto-select the recommended agent
              if (starter.agent !== "auto") {
                const agentMatch = agents.find((a: any) => a.id === starter.agent);
                if (agentMatch) setActiveAgentId(starter.agent);
              }
              // Send the initial starter prompt
              handleSendMessage(`I want to ${starter.title.toLowerCase()}. ${starter.description}`);
            }}
            onClearStarter={() => {
              setActiveStarter(null);
              setProgressChecklist([]);
            }}
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

      {/* Mobile Cockpit Dock */}
      <nav className="ax-mobile-nav">
        <div className="ax-dock-pill">
          <button onClick={() => handlePanelChange("files")} className={sidePanel === "files" ? "ax-mn-active" : ""}>📁<span>Files</span></button>
          <button onClick={() => setSidePanel(null)}>✏️<span>Editor</span></button>
          <button onClick={() => setChatCollapsed(false)}>🤖<span>AI</span></button>
          <button onClick={() => setTerminalVisible(v => !v)}>⌨️<span>Term</span></button>
        </div>
      </nav>
    </div>
    </div>
  );
}

