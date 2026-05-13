/**
 * Axiom Studio — Profile Badge + Configurable Profile Panel
 * Upper-right badge → click opens full profile config.
 * Username, PIN, biometrics, wallet, ecosystem widgets.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { User, Crown, Settings, LogOut, Shield, Fingerprint, Key, Wallet, Eye, EyeOff, X, Check, ChevronRight, Zap } from "lucide-react";

interface ProfileWidget {
  id: string;
  label: string;
  icon: any;
  enabled: boolean;
  value?: string | number;
}

interface Props {
  user: { id?: string; username?: string; displayName?: string; role?: string; email?: string } | null;
  token: string;
  onLogout: () => void;
  onOpenCredits?: () => void;
  biometricsAvailable?: boolean;
  biometricsEnrolled?: boolean;
  onEnrollBiometrics?: () => Promise<string | null>;
}

const WIDGET_STORAGE_KEY = "axiom_profile_widgets";

export default function ProfileBadge({ user, token, onLogout, onOpenCredits, biometricsAvailable, biometricsEnrolled, onEnrollBiometrics }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "configure" | "security">("overview");
  const [, setLocation] = useLocation();
  const [sub, setSub] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // Editable fields
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [editingDisplay, setEditingDisplay] = useState(false);
  const [newDisplay, setNewDisplay] = useState("");
  const [pinSetup, setPinSetup] = useState(false);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Configurable widgets
  const [widgets, setWidgets] = useState<ProfileWidget[]>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "credits", label: "AI Credits", icon: Zap, enabled: true },
      { id: "tier", label: "Subscription Tier", icon: Crown, enabled: true },
      { id: "usage", label: "Usage Stats", icon: Wallet, enabled: true },
      { id: "ecosystem", label: "Ecosystem Apps", icon: Shield, enabled: false },
      { id: "trustlayer", label: "Trust Layer ID", icon: Key, enabled: false },
      { id: "biometrics", label: "Biometric Status", icon: Fingerprint, enabled: false },
    ];
  });

  useEffect(() => {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/agent/subscription", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSub).catch(() => {});
    fetch("/api/agent/credits", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCredits(d?.credits ?? null)).catch(() => {});
  }, [token]);

  const tierColor: Record<string, string> = {
    free: "#94a3b8", developer: "#06b6d4", professional: "#a855f7",
    business: "#f59e0b", enterprise: "#ef4444", owner: "#06b6d4",
  };
  const color = tierColor[user?.role === "owner" ? "owner" : (sub?.tier || "free")] || "#94a3b8";
  const initial = (user?.displayName?.[0] || user?.username?.[0] || "?").toUpperCase();

  const saveField = useCallback(async (field: string, value: string) => {
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/agent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) { setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000); }
      else { const d = await res.json(); setSaveMsg(d.error || "Failed"); }
    } catch { setSaveMsg("Connection error"); }
    setSaving(false);
  }, [token]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const s = {
    badge: { position: "fixed" as const, top: 12, right: 16, zIndex: 900, display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 8px", borderRadius: 14, background: "rgba(8,12,21,0.8)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", backdropFilter: "blur(20px)", transition: "all 0.2s" },
    avatar: { width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${color}44, ${color}22)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color },
    panel: { position: "fixed" as const, top: 56, right: 16, width: 340, maxHeight: "calc(100vh - 80px)", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, zIndex: 901, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", overflow: "auto" as const },
    overlay: { position: "fixed" as const, inset: 0, zIndex: 899, background: "rgba(0,0,0,0.3)" },
    input: { width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, outline: "none", fontFamily: "inherit" },
    tabBtn: (active: boolean) => ({ flex: 1, padding: "8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", border: "none", cursor: "pointer", borderRadius: 8, background: active ? "rgba(6,182,212,0.12)" : "transparent", color: active ? "#06b6d4" : "rgba(255,255,255,0.3)", transition: "all 0.2s", fontFamily: "inherit" }),
    row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  };

  return (
    <>
      {/* Badge */}
      <div style={s.badge} onClick={() => setOpen(!open)} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
        <div style={s.avatar}>{initial}</div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", lineHeight: 1.2 }}>
            {user?.displayName || user?.username || "User"}
          </p>
          <p style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", color, letterSpacing: "0.05em" }}>
            {user?.role === "owner" ? "Owner" : (sub?.tierName || "Free")}
          </p>
        </div>
        {credits !== null && (
          <div className={credits < 20 ? "animate-pulse" : ""} style={{ 
            marginLeft: 4, padding: "2px 8px", borderRadius: 6, 
            background: credits < 20 ? "rgba(248,113,113,0.15)" : "rgba(6,182,212,0.08)", 
            fontSize: 10, fontWeight: 600, 
            color: credits < 20 ? "#f87171" : "#06b6d4",
            boxShadow: credits < 20 ? "0 0 8px rgba(248,113,113,0.5)" : "none"
          }}>
            ⚡ {credits}
          </div>
        )}
      </div>

      {/* Panel */}
      {open && (
        <>
          <div style={s.overlay} onClick={() => setOpen(false)} />
          <div style={s.panel}>
            {/* Header */}
            <div style={{ padding: "20px 20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ ...s.avatar, width: 44, height: 44, fontSize: 16, borderRadius: 12 }}>{initial}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{user?.displayName || user?.username}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{user?.email || ""}</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 16 }}>
                {(["overview", "configure", "security"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={s.tabBtn(tab === t)}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ padding: "0 20px 20px" }}>
              {/* Save message */}
              {saveMsg && <p style={{ fontSize: 11, color: saveMsg === "Saved!" ? "#22c55e" : "#f87171", marginBottom: 8, textAlign: "center" }}>{saveMsg}</p>}

              {/* ── OVERVIEW TAB ── */}
              {tab === "overview" && (
                <>
                  {/* Enabled widgets */}
                  {widgets.filter(w => w.enabled).map(w => (
                    <div key={w.id} style={{ ...s.row }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <w.icon size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{w.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "white" }}>
                        {w.id === "credits" && (credits ?? "—")}
                        {w.id === "tier" && (user?.role === "owner" ? "Owner" : (sub?.tierName || "Free"))}
                        {w.id === "usage" && (sub ? `${sub.messagesUsed}/${sub.messagesPerMonth === 999999 ? "∞" : sub.messagesPerMonth}` : "—")}
                        {w.id === "ecosystem" && "7 apps"}
                        {w.id === "trustlayer" && (user?.id?.slice(0, 8) || "—")}
                        {w.id === "biometrics" && (biometricsEnrolled ? "✓ Enrolled" : "Not set")}
                      </span>
                    </div>
                  ))}

                  {/* Quick actions */}
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={() => { setOpen(false); setLocation("/profile"); }} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s", fontFamily: "inherit" }}>
                      <User size={13} /> View Full Profile
                    </button>
                    {onOpenCredits && (
                      <button onClick={() => { onOpenCredits(); setOpen(false); }} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #06b6d4, #a855f7)", border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Zap size={13} /> Buy Credits
                      </button>
                    )}
                    <button onClick={() => { onLogout(); setOpen(false); }} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </>
              )}

              {/* ── CONFIGURE TAB ── */}
              {tab === "configure" && (
                <>
                  {/* Username */}
                  <div style={s.row}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Username</span>
                    {editingUsername ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={user?.username || "username"} style={{ ...s.input, width: 120 }} autoFocus />
                        <button onClick={() => { saveField("username", newUsername); setEditingUsername(false); }} disabled={saving} style={{ background: "rgba(6,182,212,0.1)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#06b6d4" }}><Check size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setNewUsername(user?.username || ""); setEditingUsername(true); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        {user?.username || "Set username"} <ChevronRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Display Name */}
                  <div style={s.row}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Display Name</span>
                    {editingDisplay ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={newDisplay} onChange={e => setNewDisplay(e.target.value)} placeholder={user?.displayName || ""} style={{ ...s.input, width: 120 }} autoFocus />
                        <button onClick={() => { saveField("displayName", newDisplay); setEditingDisplay(false); }} disabled={saving} style={{ background: "rgba(6,182,212,0.1)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#06b6d4" }}><Check size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setNewDisplay(user?.displayName || ""); setEditingDisplay(true); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        {user?.displayName || "Set name"} <ChevronRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Widget Toggles */}
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 16, marginBottom: 8 }}>
                    Visible Widgets
                  </p>
                  {widgets.map(w => (
                    <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <w.icon size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{w.label}</span>
                      </div>
                      <button onClick={() => toggleWidget(w.id)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: w.enabled ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.06)", position: "relative", transition: "background 0.2s" }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: w.enabled ? "#06b6d4" : "rgba(255,255,255,0.2)", position: "absolute", top: 3, left: w.enabled ? 19 : 3, transition: "left 0.2s" }} />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* ── SECURITY TAB ── */}
              {tab === "security" && (
                <>
                  {/* PIN Setup */}
                  <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Key size={14} style={{ color: "#06b6d4" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Quick Unlock PIN</span>
                    </div>
                    {pinSetup ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="4-digit PIN" style={{ ...s.input, width: 100, textAlign: "center", letterSpacing: 6, fontSize: 16 }} autoFocus />
                        <button onClick={() => { if (pin.length === 4) { saveField("pin", pin); setPinSetup(false); setPin(""); } }} disabled={pin.length !== 4} style={{ padding: "6px 14px", borderRadius: 8, background: pin.length === 4 ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4", fontSize: 11, fontWeight: 600, cursor: pin.length === 4 ? "pointer" : "default" }}>Save</button>
                      </div>
                    ) : (
                      <button onClick={() => setPinSetup(true)} style={{ fontSize: 11, color: "#06b6d4", background: "none", border: "none", cursor: "pointer" }}>Set up PIN →</button>
                    )}
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>PIN works across all DarkWave ecosystem apps</p>
                  </div>

                  {/* Biometrics */}
                  {biometricsAvailable && (
                    <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Fingerprint size={14} style={{ color: "#a855f7" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Biometric Login</span>
                      </div>
                      {biometricsEnrolled ? (
                        <p style={{ fontSize: 11, color: "#22c55e" }}>✓ Enrolled — Face ID / fingerprint active</p>
                      ) : (
                        <button onClick={async () => { if (onEnrollBiometrics) { const err = await onEnrollBiometrics(); if (err) setSaveMsg(err); } }} style={{ fontSize: 11, color: "#a855f7", background: "none", border: "none", cursor: "pointer" }}>Enable biometrics →</button>
                      )}
                    </div>
                  )}

                  {/* Trust Layer */}
                  <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Shield size={14} style={{ color: "#14b8a6" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Trust Layer SSO</span>
                    </div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                      Your profile syncs across all DarkWave ecosystem apps. Changes to username, display name, and PIN propagate automatically.
                    </p>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 6, fontFamily: "monospace" }}>
                      ID: {user?.id?.slice(0, 12) || "—"}...
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.12)" }}>Trust Layer SSO — synced across DarkWave ecosystem</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
