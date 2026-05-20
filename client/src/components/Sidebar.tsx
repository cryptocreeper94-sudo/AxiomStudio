/**
 * Axiom Studio — Conversation Sidebar
 * Lists conversations, agent selector, new chat button.
 */
import { useState } from "react";
import { Plus, Trash2, Pin, MessageSquare, Brain, Zap, Sparkles, Code2, MessageCircle, ChevronDown, Wand2 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  creditCost: number;
}

interface Conversation {
  id: string;
  title: string;
  agentId: string;
  updatedAt: string;
  pinned: boolean;
}

const ICONS: Record<string, any> = { Brain, Zap, Sparkles, Code2, MessageCircle, Wand2 };

interface Props {
  conversations: Conversation[];
  agents: Agent[];
  activeConvoId: string | null;
  activeAgentId: string;
  credits: number;
  onSelectConvo: (id: string) => void;
  onNewChat: () => void;
  onDeleteConvo: (id: string) => void;
  onSelectAgent: (id: string) => void;
  sidebarOpen?: boolean;
}

export default function Sidebar({
  conversations, agents, activeConvoId, activeAgentId, credits,
  onSelectConvo, onNewChat, onDeleteConvo, onSelectAgent,
}: Props) {
  const [agentOpen, setAgentOpen] = useState(false);
  const isAuto = activeAgentId === "auto";
  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const AgentIcon = isAuto ? Wand2 : (activeAgent ? ICONS[activeAgent.icon] || Brain : Brain);

  return (
    <div className={`w-72 h-full flex flex-col border-r border-white/[0.06] bg-[#080c15] ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Axiom Studio</h1>
            <p className="text-[10px] text-white/30">DarkWave Studios</p>
          </div>
        </div>

        {/* Agent Selector */}
        <button
          onClick={() => setAgentOpen(!agentOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass text-sm transition hover:border-cyan-500/30"
        >
          <AgentIcon className="w-4 h-4 text-cyan-400" />
          <span className="flex-1 text-left text-white/80 truncate">{isAuto ? "Auto (Smart Routing)" : activeAgent?.name || "Select Agent"}</span>
          {!isAuto && <span className="text-[10px] text-white/30">{activeAgent?.creditCost || 0}cr</span>}
          <ChevronDown className={`w-3 h-3 text-white/30 transition ${agentOpen ? "rotate-180" : ""}`} />
        </button>

        {agentOpen && (
          <div className="mt-2 rounded-lg border border-white/[0.08] bg-[#0a0f1a] overflow-hidden">
            {/* Auto mode */}
            <button
              onClick={() => { onSelectAgent("auto"); setAgentOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.04] ${
                isAuto ? "bg-cyan-500/10 text-cyan-300" : "text-white/60"
              }`}
            >
              <Wand2 className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate">Auto (Recommended)</p>
                <p className="text-[10px] text-white/30 truncate">Routes each message to the optimal model automatically</p>
              </div>
              <span className="text-[10px] text-cyan-400">smart</span>
            </button>
            <div className="border-t border-white/[0.04]" />
            {/* Manual agents */}
            {agents.map((agent) => {
              const Icon = ICONS[agent.icon] || Brain;
              return (
                <button
                  key={agent.id}
                  onClick={() => { onSelectAgent(agent.id); setAgentOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.04] ${
                    agent.id === activeAgentId ? "bg-cyan-500/10 text-cyan-300" : "text-white/60"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{agent.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{agent.description}</p>
                  </div>
                  <span className="text-[10px] text-white/20">{agent.creditCost}cr</span>
                </button>
              );
            })}
          </div>
        )}

        {/* New Chat */}
        <button
          onClick={onNewChat}
          className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-sm font-semibold transition shadow-lg shadow-cyan-500/10"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/20">No conversations yet</p>
          </div>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => onSelectConvo(convo.id)}
              className={`group w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm mb-1 transition ${
                convo.id === activeConvoId
                  ? "bg-cyan-500/10 border border-cyan-500/20 text-white"
                  : "text-white/50 hover:bg-white/[0.03] hover:text-white/70"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{convo.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteConvo(convo.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))
        )}
      </div>

      {/* Credits Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/30">Credits</span>
          <span className={`font-mono font-bold ${credits > 20 ? "text-cyan-400" : credits > 5 ? "text-amber-400" : "text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]"}`}>
            {credits}
          </span>
        </div>
      </div>
    </div>
  );
}
