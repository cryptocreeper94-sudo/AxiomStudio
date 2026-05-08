import React, { useState } from "react";
import { Folder, Code2, Terminal, Bot, Play, Menu, MoreVertical, X } from "lucide-react";
import EditorPanel from "../EditorPanel";
import ChatView from "../ChatView";
import FileExplorer from "../FileExplorer";
import { OpenFile } from "../EditorArea";
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
      {/* Top Bar */}
      <header className="flex-none h-14 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors">
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
          <button className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10 text-white/70">
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
                  <EditorPanel
                    file={activeFile}
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
              activeAgentId={activeAgentId} // Need this prop too! Let's pass it next.
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
