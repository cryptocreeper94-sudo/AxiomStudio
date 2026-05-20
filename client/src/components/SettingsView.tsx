import React, { useState } from "react";
import { useSettings, AppSettings } from "../contexts/SettingsContext";
import { Monitor, FileCode, Terminal, Bot, Save, PaintBucket, Type, AlignLeft, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SETTINGS_TABS = [
  { id: "appearance", label: "Appearance", icon: PaintBucket },
  { id: "editor", label: "Editor", icon: FileCode },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "ai", label: "AI Assistant", icon: Bot },
  { id: "billing", label: "Billing & Credits", icon: Zap },
];

interface Props {
  onOpenCredits?: () => void;
  credits?: number;
}

export default function SettingsView({ onOpenCredits, credits }: Props) {
  const { settings, updateSection, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("appearance");
  const [savedMsg, setSavedMsg] = useState(false);

  const showSaved = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleAppearanceChange = (key: keyof AppSettings["appearance"], value: any) => {
    updateSection("appearance", { [key]: value });
  };

  const handleEditorChange = (key: keyof AppSettings["editor"], value: any) => {
    updateSection("editor", { [key]: value });
  };

  const handleTerminalChange = (key: keyof AppSettings["terminal"], value: any) => {
    updateSection("terminal", { [key]: value });
  };

  const handleAiChange = (key: keyof AppSettings["ai"], value: any) => {
    updateSection("ai", { [key]: value });
  };

  const s = {
    panel: { display: "flex", flexDirection: "column" as const, height: "100%", background: "#0d1117", color: "white", overflow: "hidden" },
    header: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", color: "rgba(255,255,255,0.9)" },
    body: { display: "flex", flex: 1, overflow: "hidden" },
    sidebar: { width: 140, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "16px 8px", display: "flex", flexDirection: "column" as const, gap: 4 },
    tabBtn: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "none", background: active ? "rgba(6,182,212,0.15)" : "transparent", color: active ? "#06b6d4" : "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 500, transition: "all 0.2s" }),
    content: { flex: 1, padding: "20px", overflowY: "auto" as const },
    sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", marginBottom: 16 },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" },
    labelGroup: { display: "flex", flexDirection: "column" as const, gap: 4 },
    label: { fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" },
    desc: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
    select: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white", padding: "6px 10px", fontSize: 12, outline: "none", cursor: "pointer" },
    input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white", padding: "6px 10px", fontSize: 12, width: 60, textAlign: "center" as const, outline: "none" },
    toggleBtn: (active: boolean) => ({ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: active ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.06)", position: "relative" as const, transition: "background 0.2s" }),
    toggleNob: (active: boolean) => ({ width: 14, height: 14, borderRadius: 7, background: active ? "#06b6d4" : "rgba(255,255,255,0.2)", position: "absolute" as const, top: 3, left: active ? 19 : 3, transition: "left 0.2s" }),
    colorBtn: (color: string, active: boolean) => ({ width: 24, height: 24, borderRadius: "50%", background: color, border: active ? "2px solid white" : "2px solid transparent", cursor: "pointer" })
  };

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>SETTINGS</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savedMsg && <span style={{ fontSize: 11, color: "#22c55e" }}>Saved</span>}
          <button onClick={resetSettings} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>Reset Default</button>
        </div>
      </div>
      
      <div style={s.body}>
        {/* Sidebar */}
        <div style={s.sidebar}>
          {SETTINGS_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} style={s.tabBtn(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={s.content}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
              
              {/* APPEARANCE */}
              {activeTab === "appearance" && (
                <>
                  <h3 style={s.sectionTitle}>Appearance Preferences</h3>
                  
                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Theme</span>
                      <span style={s.desc}>Select IDE color theme</span>
                    </div>
                    <select style={s.select} value={settings.appearance.theme} onChange={e => { handleAppearanceChange("theme", e.target.value); showSaved(); }}>
                      <option value="dark">Dark Theme</option>
                      <option value="light">Light Theme (Beta)</option>
                    </select>
                  </div>

                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Accent Color</span>
                      <span style={s.desc}>Primary color for highlights and badges</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["#06b6d4", "#38bdf8", "#ef4444", "#22c55e", "#f59e0b"].map(color => (
                        <button key={color} style={s.colorBtn(color, settings.appearance.accentColor === color)} onClick={() => { handleAppearanceChange("accentColor", color); showSaved(); }} />
                      ))}
                    </div>
                  </div>
                  
                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>UI Font Size</span>
                      <span style={s.desc}>Base font size for sidebar and menus</span>
                    </div>
                    <input type="number" style={s.input} value={settings.appearance.fontSize} onChange={e => { handleAppearanceChange("fontSize", parseInt(e.target.value)); showSaved(); }} />
                  </div>
                </>
              )}

              {/* EDITOR */}
              {activeTab === "editor" && (
                <>
                  <h3 style={s.sectionTitle}>Code Editor (Monaco)</h3>
                  
                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Word Wrap</span>
                      <span style={s.desc}>Wrap lines that exceed viewport width</span>
                    </div>
                    <select style={s.select} value={settings.editor.wordWrap} onChange={e => { handleEditorChange("wordWrap", e.target.value); showSaved(); }}>
                      <option value="on">On</option>
                      <option value="off">Off</option>
                      <option value="wordWrapColumn">Word Wrap Column</option>
                    </select>
                  </div>

                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Show Minimap</span>
                      <span style={s.desc}>Display code overview scrollbar</span>
                    </div>
                    <button style={s.toggleBtn(settings.editor.minimap)} onClick={() => { handleEditorChange("minimap", !settings.editor.minimap); showSaved(); }}>
                      <div style={s.toggleNob(settings.editor.minimap)} />
                    </button>
                  </div>

                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Tab Size</span>
                      <span style={s.desc}>Number of spaces per indentation</span>
                    </div>
                    <input type="number" min={2} max={8} style={s.input} value={settings.editor.tabSize} onChange={e => { handleEditorChange("tabSize", parseInt(e.target.value)); showSaved(); }} />
                  </div>

                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Format on Save</span>
                      <span style={s.desc}>Auto-format document when saving</span>
                    </div>
                    <button style={s.toggleBtn(settings.editor.formatOnSave)} onClick={() => { handleEditorChange("formatOnSave", !settings.editor.formatOnSave); showSaved(); }}>
                      <div style={s.toggleNob(settings.editor.formatOnSave)} />
                    </button>
                  </div>
                </>
              )}

              {/* TERMINAL */}
              {activeTab === "terminal" && (
                <>
                  <h3 style={s.sectionTitle}>Integrated Terminal</h3>
                  
                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Terminal Font Size</span>
                      <span style={s.desc}>Font size for xterm.js</span>
                    </div>
                    <input type="number" min={8} max={24} style={s.input} value={settings.terminal.fontSize} onChange={e => { handleTerminalChange("fontSize", parseInt(e.target.value)); showSaved(); }} />
                  </div>

                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Cursor Blink</span>
                      <span style={s.desc}>Animate the terminal cursor</span>
                    </div>
                    <button style={s.toggleBtn(settings.terminal.cursorBlink)} onClick={() => { handleTerminalChange("cursorBlink", !settings.terminal.cursorBlink); showSaved(); }}>
                      <div style={s.toggleNob(settings.terminal.cursorBlink)} />
                    </button>
                  </div>
                </>
              )}

              {/* AI ASSISTANT */}
              {activeTab === "ai" && (
                <>
                  <h3 style={s.sectionTitle}>AI Integration</h3>
                  
                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Default Model</span>
                      <span style={s.desc}>LLM used for new conversations</span>
                    </div>
                    <select style={s.select} value={settings.ai.defaultAgent} onChange={e => { handleAiChange("defaultAgent", e.target.value); showSaved(); }}>
                      <option value="auto">Auto-Route (Recommended)</option>
                      <option value="opus">Claude Opus 4.7 (Best)</option>
                      <option value="sonnet">Claude Sonnet 4.6 (Fast)</option>
                      <option value="gpt4">GPT-4o</option>
                      <option value="mini">GPT-4o Mini (Free)</option>
                    </select>
                  </div>

                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Creativity / Temperature</span>
                      <span style={s.desc}>0.0 (Deterministic) to 1.0 (Creative)</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input type="range" min={0} max={1} step={0.1} value={settings.ai.temperature} onChange={e => { handleAiChange("temperature", parseFloat(e.target.value)); showSaved(); }} style={{ width: 100 }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", width: 24 }}>{settings.ai.temperature}</span>
                    </div>
                  </div>
                  
                  <div style={s.row}>
                    <div style={s.labelGroup}>
                      <span style={s.label}>Deterministic Fallback</span>
                      <span style={s.desc}>Route queries to DarkWave local knowledge</span>
                    </div>
                    <button style={s.toggleBtn(settings.ai.autoRoute)} onClick={() => { handleAiChange("autoRoute", !settings.ai.autoRoute); showSaved(); }}>
                      <div style={s.toggleNob(settings.ai.autoRoute)} />
                    </button>
                  </div>
                </>
              )}

              {activeTab === "billing" && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ display: "flex", flexDirection: "column", gap: 30 }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: "white", margin: 0 }}>Billing & Credits</h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      Manage your Pay-As-You-Go AI credits and view your usage.
                    </p>
                  </div>

                  <div style={{ padding: 20, borderRadius: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Current Balance</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: credits !== undefined && credits > 200 ? "#06b6d4" : credits !== undefined && credits > 50 ? "#f59e0b" : "#f87171" }}>
                        {(credits ?? 0).toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>credits</span>
                      </div>
                    </div>
                    {onOpenCredits && (
                      <button
                        onClick={onOpenCredits}
                        style={{
                          padding: "10px 20px", borderRadius: 8, background: "linear-gradient(135deg, #06b6d4, #38bdf8)",
                          color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 15px rgba(14,165,233, 0.3)"
                        }}
                      >
                        <Zap size={14} /> Buy Credits
                      </button>
                    )}
                  </div>

                  <div style={{ padding: 20, borderRadius: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", margin: "0 0 15px 0" }}>Agent Pricing</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>Axiom (Opus 4.7)</span>
                        <span style={{ color: "#38bdf8", fontWeight: 600 }}>27 credits / msg</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>Axiom Quick (Sonnet 4.6)</span>
                        <span style={{ color: "#06b6d4", fontWeight: 600 }}>5 credits / msg</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>Axiom GPT (GPT-4.1)</span>
                        <span style={{ color: "#4ade80", fontWeight: 600 }}>8 credits / msg</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>Axiom Free (Mini)</span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Free</span>
                      </div>
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        $0.01 per credit &middot; Credits never expire
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
