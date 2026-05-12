import React, { useState } from "react";
import { Folder, Code2, Terminal, Bot, Play, Menu, MoreVertical, X, LogOut, CreditCard, Settings, User, ChevronRight } from "lucide-react";
import MonacoEditor from "../MonacoEditor";
import { OpenFile } from "../EditorArea";
import ChatView from "../ChatView";
import FileExplorer from "../FileExplorer";
import { Message } from "../IDELayout";
import TerminalPanel from "../TerminalPanel";

interface MobileLayoutProps {
  token: string;
  user: any;
  agents: any[];
  conversations: any[];
  openFiles: OpenFile[];
  activeFilePath: string | null;
  onOpenFile: (path: string, name: string) => void;
  onContentChange: (path: string, content: string) => void;
  activeConvoId: string | null;
  activeAgentId: string;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (msg: string, files?: string[]) => void;
  onStopAgent: () => void;
  onApplyCode: (code: string, filename: string, language: string) => void;
  creditData: any;
  onLogout: () => void;
  onOpenCredits: () => void;
}

export default function MobileLayout({
  token,
  user,
  agents,
  conversations,
  openFiles,
  activeFilePath,
  onOpenFile,
  onContentChange,
  activeConvoId,
  activeAgentId,
  messages,
  isStreaming,
  streamingContent,
  onSendMessage,
  onStopAgent,
  onApplyCode,
  creditData,
  onLogout,
  onOpenCredits,
}: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<"files" | "editor" | "preview" | "console" | "ai">("editor");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const TABS = [
    { id: "files", icon: Folder, label: "Files" },
    { id: "editor", icon: Code2, label: "Editor" },
    { id: "preview", icon: Play, label: "Preview" },
    { id: "console", icon: Terminal, label: "Console" },
    { id: "ai", icon: Bot, label: "AI Chat" },
  ] as const;

  const activeFile = openFiles.find(f => f.path === activeFilePath);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* ── Slide-out Drawer (Hamburger Menu) ── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
              zIndex: 200, transition: "opacity 0.3s",
            }}
          />
          {/* Drawer */}
          <div style={{
            position: "fixed", top: 0, left: 0, bottom: 0, width: "80vw", maxWidth: 320,
            background: "#0c0c10", borderRight: "1px solid rgba(255,255,255,0.08)",
            zIndex: 201, padding: "0", display: "flex", flexDirection: "column",
            animation: "slide-in-left 0.25s ease-out",
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 800, color: "white",
                }}>
                  {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{user?.displayName || "User"}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{user?.email || ""}</div>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4,
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Info */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{
                padding: "12px 16px", borderRadius: 12, background: "rgba(6,182,212,0.06)",
                border: "1px solid rgba(6,182,212,0.12)",
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Credits</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#67e8f9" }}>
                  {creditData?.credits ?? "—"}
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
              {[
                { icon: <User className="w-4 h-4" />, label: "Account", action: () => {} },
                { icon: <CreditCard className="w-4 h-4" />, label: "Buy Credits", action: () => { onOpenCredits(); setDrawerOpen(false); } },
                { icon: <Settings className="w-4 h-4" />, label: "Settings", action: () => {} },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 12px", borderRadius: 10, background: "none",
                    border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer",
                    fontSize: 14, fontWeight: 500, transition: "background 0.15s",
                    textAlign: "left",
                  }}
                >
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                </button>
              ))}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "8px 0" }} />

              {/* Recent conversations */}
              <div style={{ padding: "8px 12px", fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Recent Chats
              </div>
              {conversations.slice(0, 5).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => { setDrawerOpen(false); setActiveTab("ai"); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, background: "none",
                    border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer",
                    fontSize: 13, textAlign: "left",
                  }}
                >
                  <Bot className="w-3.5 h-3.5" style={{ color: "#06b6d4", flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.title || "Untitled"}
                  </span>
                </button>
              ))}
            </div>

            {/* Logout */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={onLogout}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", borderRadius: 10, background: "rgba(244,63,94,0.06)",
                  border: "1px solid rgba(244,63,94,0.12)", color: "#fb7185",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Three-dot Menu Dropdown ── */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />
          <div style={{
            position: "fixed", top: 52, right: 12, zIndex: 151,
            background: "#1a1a22", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "6px", minWidth: 180,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}>
            {[
              { icon: <CreditCard className="w-4 h-4" />, label: "Buy Credits", action: () => { onOpenCredits(); setMenuOpen(false); } },
              { icon: <Settings className="w-4 h-4" />, label: "Settings", action: () => setMenuOpen(false) },
              { icon: <LogOut className="w-4 h-4" style={{ color: "#fb7185" }} />, label: "Sign Out", action: onLogout, danger: true },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8, background: "none",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  color: (item as any).danger ? "#fb7185" : "rgba(255,255,255,0.7)",
                  textAlign: "left", transition: "background 0.15s",
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Top Bar */}
      <header className="flex-none h-14 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate max-w-[150px]">
              {user?.displayName || "Axiom Workspace"}
            </span>
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              {creditData?.credits ?? "-"} credits
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center active:bg-green-500/30">
            <Play className="w-4 h-4 fill-current" />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10 text-white/70"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "files" && (
          <div className="h-full w-full bg-[#0a0a0a] overflow-hidden">
             <FileExplorer token={token} onOpenFile={(path, name) => { onOpenFile(path, name); setActiveTab("editor"); }} />
          </div>
        )}

        {activeTab === "editor" && (
          <div className="h-full w-full flex flex-col relative">
            {activeFile ? (
              <>
                <div className="px-3 py-2 bg-black/40 text-xs text-white/50 border-b border-white/5 flex justify-between items-center">
                  <span>{activeFile.name}</span>
                  <span className="uppercase text-[10px] bg-white/10 px-2 py-0.5 rounded">{activeFile.language}</span>
                </div>
                <div className="flex-1 relative">
                  <MonacoEditor
                    value={activeFile.content}
                    language={activeFile.language}
                    onChange={(val) => onContentChange(activeFile.path, val)}
                  />
                </div>
                {/* Mobile Keyboard Action Bar */}
                <div className="h-10 bg-[#1e1e1e] border-t border-white/10 flex items-center gap-1 px-2 overflow-x-auto whitespace-nowrap hide-scrollbar flex-none z-10">
                  {["Tab", "{", "}", "[", "]", "(", ")", ";", "'", '"', "=", "<", ">", "/", "\\"].map(char => (
                    <button key={char} className="px-4 py-1.5 bg-white/5 rounded-md text-sm font-mono text-white/70 active:bg-white/20 active:text-white shrink-0">
                      {char}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm p-8 text-center">
                Select a file from the Files tab to start editing.
              </div>
            )}
          </div>
        )}

        {activeTab === "preview" && (
          <div className="h-full w-full flex flex-col bg-white">
            <div className="h-12 bg-gray-100 flex items-center px-4 gap-3 border-b border-gray-300 text-black">
              <span className="text-xs truncate flex-1 font-mono">http://localhost:3000</span>
              <button className="text-blue-500 text-xs font-semibold uppercase">Refresh</button>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Preview will render here.
            </div>
          </div>
        )}

        {activeTab === "console" && (
          <div className="h-full w-full bg-[#0f0f11] overflow-hidden flex flex-col pb-20 pt-2">
             <TerminalPanel token={token} visible={true} onClose={() => setActiveTab("editor")} />
          </div>
        )}

        {activeTab === "ai" && (
          <div className="h-full w-full flex flex-col bg-[#0f0f11] relative">
            <ChatView
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              onSend={(msg) => onSendMessage(msg, activeFilePath ? [activeFilePath] : [])}
              onStop={onStopAgent}
              onApplyCode={onApplyCode}
              contextFiles={activeFilePath ? [activeFilePath] : []}
              activeAgentId={activeAgentId}
              agents={agents}
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="flex-none h-16 border-t border-white/10 bg-[#0a0a0a]/90 backdrop-blur-lg flex items-center justify-around pb-safe z-50">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all ${
                isActive ? "text-cyan-400" : "text-white/40 active:bg-white/5"
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? "fill-cyan-400/20" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? "opacity-100" : "opacity-0 hidden"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
