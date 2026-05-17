/**
 * Axiom Studio — Agent Panel (Main Page)
 * Wires sidebar, chat, and streaming together.
 */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCode, Package, Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ChatView from "../components/ChatView";
import { type StarterConfig } from "../components/StarterHub";
import { type ChecklistItem } from "../components/ProgressTracker";
import ErrorForwarder from "../components/ErrorForwarder";
import ArtifactViewer from "../components/ArtifactViewer";
import SnippetDock from "../components/SnippetDock";
import SignalChatWidget from "../components/SignalChatWidget";
import Footer from "../components/Footer";
import SmsOptIn from "../components/SmsOptIn";
import CockpitNav from "../components/CockpitNav";
import AnalyticsDashboard from "./AnalyticsDashboard";
import LoginScreen from "../components/LoginScreen";
import { useAuth } from "../hooks/useAuth";
import * as api from "../lib/api";
import { trackPageView, trackEvent, AxiomEvents } from "../lib/analytics";

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

export default function AgentPanel() {
  const { token, user, login, signup, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvoId, setActiveConvoId] = useState<string | null>(() => {
    try { return localStorage.getItem('axiom_active_convo') || null; } catch { return null; }
  });
  const [activeAgentId, setActiveAgentId] = useState("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ model: string; agent: string; score: number; reason: string } | null>(null);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [showSmsOptIn, setShowSmsOptIn] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeStarter, setActiveStarter] = useState<StarterConfig | null>(null);
  const [progressChecklist, setProgressChecklist] = useState<ChecklistItem[]>([]);

  // Auto-track page view on mount
  useEffect(() => {
    trackPageView("/studio");
  }, []);

  // Persist active conversation to localStorage
  useEffect(() => {
    try {
      if (activeConvoId) localStorage.setItem('axiom_active_convo', activeConvoId);
      else localStorage.removeItem('axiom_active_convo');
    } catch {}
  }, [activeConvoId]);

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: api.fetchModels,
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", token],
    queryFn: () => api.fetchConversations(token!),
    enabled: !!token,
  });

  // Fetch credits
  const { data: creditData } = useQuery({
    queryKey: ["credits", token],
    queryFn: () => api.fetchCredits(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (activeConvoId && token) {
      api.fetchMessages(token, activeConvoId).then((data) => {
        setMessages(prev => {
          if (data.length === 0 && prev.length > 0) return prev;
          return data;
        });
      }).catch(console.error);
    }
  }, [activeConvoId, token]);

  // Select agent
  const handleSelectAgent = useCallback((id: string) => {
    setActiveAgentId(id);
  }, []);

  // New chat
  const handleNewChat = useCallback(async () => {
    if (!token) return;
    const agent = agents.find((a: any) => a.id === activeAgentId) || agents[0];
    const convo = await api.createConversation(token, activeAgentId, agent?.model || "claude-opus-4-20250115");
    setActiveConvoId(convo.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [token, activeAgentId, agents, queryClient]);

  // Delete conversation
  const handleDeleteConvo = useCallback(async (id: string) => {
    if (!token) return;
    await api.deleteConversation(token, id);
    if (activeConvoId === id) { setActiveConvoId(null); setMessages([]); }
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [token, activeConvoId, queryClient]);

  // Send message
  const handleSend = useCallback(async (message: string, contextFiles?: string[]) => {
    console.log(`[handleSend] called | isStreaming=${isStreaming} | activeConvoId=${activeConvoId} | msg="${message.slice(0,40)}"`);
    if (!token || isStreaming) return;

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

    // Optimistic user message
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      contextFiles,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");
    setRouteInfo(null);

    let convoId = activeConvoId;
    if (!convoId) {
      try {
        const agent = agents.find((a: any) => a.id === activeAgentId) || agents[0];
        const convo = await api.createConversation(token, activeAgentId, agent?.model || "claude-opus-4-20250115");
        convoId = convo.id;
        setActiveConvoId(convoId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } catch (err: any) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`, role: "assistant", content: `⚠️ Failed to create conversation: ${err.message}`, createdAt: new Date().toISOString()
        }]);
        setIsStreaming(false);
        return;
      }
    }

    let fullContent = "";
    let finalInputTokens = 0;
    let finalOutputTokens = 0;

    try {
      for await (const chunk of api.streamChat(token, convoId!, message, activeAgentId, undefined, contextFiles)) {
        if (chunk.type === "text" && chunk.content) {
          fullContent += chunk.content;
          setStreamingContent(fullContent);
        } else if (chunk.type === "route") {
          setRouteInfo({ model: chunk.model ?? "", agent: chunk.agent ?? "", score: chunk.score ?? 0, reason: chunk.reason ?? "" });
        } else if (chunk.type === "usage") {
          finalInputTokens = chunk.inputTokens || 0;
          finalOutputTokens = chunk.outputTokens || 0;
        } else if (chunk.type === "error") {
          fullContent += `\n\n**Error:** ${chunk.error}`;
          setStreamingContent(fullContent);
        }
      }
    } catch (err: any) {
      fullContent = fullContent || `**Error:** ${err.message || "Stream failed"}`;
    } finally {
      // ALWAYS reset streaming state — no matter what happened above
      const assistantMsg: Message = {
        id: `resp-${Date.now()}`,
        role: "assistant",
        content: fullContent || "*(no response)*",
        model: agents.find((a: any) => a.id === activeAgentId)?.model,
        inputTokens: finalInputTokens,
        outputTokens: finalOutputTokens,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent("");
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    }
  }, [token, activeConvoId, activeAgentId, isStreaming, agents, queryClient, creditData]);


  // Retry
  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.slice(0, -1)); // Remove last assistant
      handleSend(lastUserMsg.content);
    }
  }, [messages, handleSend]);
  // Send error to agent
  const handleSendError = useCallback(async (errorContext: string, userMessage: string) => {
    if (!token || isStreaming) return;
    // Create conversation if needed
    let convoId = activeConvoId;
    if (!convoId) {
      const convo = await api.createConversation(token, activeAgentId, "claude-opus-4-20250115");
      convoId = convo.id;
      setActiveConvoId(convoId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
    // Send as error-enriched message
    const userMsg: Message = {
      id: `temp-${Date.now()}`, role: "user", content: userMessage,
      errorContext, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");
    setRouteInfo(null);

    let fullContent = "";
    let finalInputTokens = 0;
    let finalOutputTokens = 0;

    try {
      for await (const chunk of api.streamChat(token, convoId!, userMessage, activeAgentId, errorContext)) {
        if (chunk.type === "text" && chunk.content) {
          fullContent += chunk.content;
          setStreamingContent(fullContent);
        } else if (chunk.type === "route") {
          setRouteInfo({ model: chunk.model ?? "", agent: chunk.agent ?? "", score: chunk.score ?? 0, reason: chunk.reason ?? "" });
        } else if (chunk.type === "usage") {
          finalInputTokens = chunk.inputTokens || 0;
          finalOutputTokens = chunk.outputTokens || 0;
        } else if (chunk.type === "error") {
          fullContent += `\n\n**Error:** ${chunk.error}`;
          setStreamingContent(fullContent);
        }
      }
    } catch (err: any) {
      fullContent = `**Error:** ${err.message || "Stream failed"}`;
    }

    setMessages((prev) => [...prev, {
      id: `resp-${Date.now()}`, role: "assistant", content: fullContent,
      inputTokens: finalInputTokens, outputTokens: finalOutputTokens,
      createdAt: new Date().toISOString(),
    }]);
    setStreamingContent("");
    setIsStreaming(false);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    queryClient.invalidateQueries({ queryKey: ["credits"] });
  }, [token, activeConvoId, activeAgentId, isStreaming, queryClient, creditData]);

  // Not logged in
  if (!token) {
    return <LoginScreen onLogin={login} onSignup={signup} />;
  }

  if (showSmsOptIn) {
    return <SmsOptIn token={token} onBack={() => setShowSmsOptIn(false)} />;
  }

  if (showAnalytics) {
    return <AnalyticsDashboard token={token} onBack={() => setShowAnalytics(false)} />;
  }

  const activeAgent = agents.find((a: any) => a.id === activeAgentId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar
          conversations={conversations}
          agents={agents}
          activeConvoId={activeConvoId}
          activeAgentId={activeAgentId}
          credits={creditData?.credits ?? 0}
          onSelectConvo={(id) => { setActiveConvoId(id); setSidebarOpen(false); }}
          onNewChat={() => { handleNewChat(); setSidebarOpen(false); }}
          onDeleteConvo={handleDeleteConvo}
          onSelectAgent={(id) => { handleSelectAgent(id); setSidebarOpen(false); }}
          sidebarOpen={sidebarOpen}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0 }}>

          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "#080c15", gap: "8px", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
              <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu style={{ width: 16, height: 16 }} />
              </button>
              <ErrorForwarder onSendError={handleSendError} isStreaming={isStreaming} />
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button
                className="desktop-toolbar-btn"
                onClick={() => setSnippetsOpen(!snippetsOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px", borderRadius: "10px",
                  background: snippetsOpen ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${snippetsOpen ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: snippetsOpen ? "#c084fc" : "rgba(255,255,255,0.4)",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer",
                }}
              >
                <Package style={{ width: 14, height: 14 }} />
                Snippets
              </button>
              <button
                className="desktop-toolbar-btn"
                onClick={() => setArtifactsOpen(!artifactsOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px", borderRadius: "10px",
                  background: artifactsOpen ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${artifactsOpen ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: artifactsOpen ? "#67e8f9" : "rgba(255,255,255,0.4)",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer",
                }}
              >
                <FileCode style={{ width: 14, height: 14 }} />
                Artifacts
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <ChatView
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              agentName={activeAgentId === "auto" ? "Axiom" : (activeAgent?.name || "Axiom")}
              agentColor={activeAgent?.color || "from-cyan-500 to-purple-600"}
              routeInfo={routeInfo}
              onSend={handleSend}
              onRetry={handleRetry}
              activeStarter={activeStarter}
              progressChecklist={progressChecklist}
              onSelectStarter={(starter) => {
                setActiveStarter(starter);
                setProgressChecklist(starter.checklist.map((label, i) => ({
                  label,
                  status: i === 0 ? "active" as const : "pending" as const,
                })));
                if (starter.agent !== "auto") {
                  const agentMatch = agents.find((a: any) => a.id === starter.agent);
                  if (agentMatch) setActiveAgentId(starter.agent);
                }
                handleSend(`I want to ${starter.title.toLowerCase()}. ${starter.description}`);
              }}
              onClearStarter={() => {
                setActiveStarter(null);
                setProgressChecklist([]);
              }}
            />
            <ArtifactViewer
              messages={messages}
              isOpen={artifactsOpen}
              onClose={() => setArtifactsOpen(false)}
            />
            <SnippetDock
              isOpen={snippetsOpen}
              onClose={() => setSnippetsOpen(false)}
              onInsert={(code, title) => {
                handleSend(`Use this snippet (${title}):\n\n\`\`\`\n${code}\n\`\`\``);
                setSnippetsOpen(false);
              }}
            />
          </div>
        </div>
      </div>
      <Footer onOpenAnalytics={() => setShowAnalytics(true)} />
      <CockpitNav
        onOpenSidebar={() => setSidebarOpen(true)}
        onToggleSnippets={() => setSnippetsOpen(!snippetsOpen)}
        onToggleArtifacts={() => setArtifactsOpen(!artifactsOpen)}
        onOpenAnalytics={() => setShowAnalytics(true)}
        snippetsOpen={snippetsOpen}
        artifactsOpen={artifactsOpen}
        activeView={showAnalytics ? "analytics" : "chat"}
      />
      <SignalChatWidget />
    </div>
  );
}
