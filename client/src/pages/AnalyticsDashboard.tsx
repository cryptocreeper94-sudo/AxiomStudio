/**
 * Axiom Studio — Analytics Dashboard
 * Admin-only analytics view with charts, stats, and realtime data.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import {
  BarChart3, Eye, Users, MessageSquare, Layers, TrendingUp,
  Activity, ArrowLeft, RefreshCw, Clock, Zap
} from "lucide-react";

interface AnalyticsData {
  period: string;
  pageViews: {
    total: number;
    uniqueSessions: number;
    uniqueUsers: number;
    topPages: { path: string; views: number }[];
    daily: { date: string; views: number }[];
  };
  events: {
    total: number;
    breakdown: { name: string; category: string; count: number }[];
  };
  messages: {
    total: number;
    activeUsers: number;
    userMessages: number;
    assistantMessages: number;
  };
  conversations: { total: number };
  tiers: { tier: string; count: number }[];
}

interface RealtimeData {
  activeSessions: number;
  recentPages: { path: string; created_at: string }[];
}

export default function AnalyticsDashboard({ token, onBack }: { token: string; onBack: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, rtRes] = await Promise.all([
        fetch(`/api/analytics/stats?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/analytics/realtime", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const stats = await statsRes.json();
      const rt = await rtRes.json();
      if (stats.success) setData(stats);
      if (rt.success) setRealtime(rt);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [days]);

  // Auto-refresh realtime every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/analytics/realtime", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rt = await res.json();
        if (rt.success) setRealtime(rt);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const tierColors: Record<string, string> = {
    free: "#94a3b8",
    developer: "#06b6d4",
    professional: "#38bdf8",
    business: "#f59e0b",
    enterprise: "#ef4444",
  };

  const maxDaily = data?.pageViews.daily ? Math.max(...data.pageViews.daily.map((d) => d.views), 1) : 1;

  return (
    <div style={{
      minHeight: "100vh", background: "#06060a", fontFamily: "'Inter', sans-serif",
      padding: "16px", overflowY: "auto",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "24px", flexWrap: "wrap", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={onBack} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.3)", padding: "4px",
            }}>
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </button>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", margin: 0 }}>
                Analytics
              </h1>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
                Axiom Studio — axiomstudio.dev
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Realtime badge */}
            {realtime && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", borderRadius: "10px",
                background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)",
              }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80",
                  boxShadow: "0 0 8px rgba(74,222,128,0.5)",
                  animation: "pulse 2s infinite",
                }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#4ade80" }}>
                  {realtime.activeSessions} active
                </span>
              </div>
            )}

            {/* Period selector */}
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} style={{
                padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                background: days === d ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${days === d ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)"}`,
                color: days === d ? "#67e8f9" : "rgba(255,255,255,0.3)",
                cursor: "pointer",
              }}>
                {d}d
              </button>
            ))}

            <button onClick={fetchData} style={{
              padding: "6px 10px", borderRadius: "8px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.3)", cursor: "pointer",
            }}>
              <RefreshCw style={{ width: 13, height: 13, animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.2)" }}>
            Loading analytics...
          </div>
        ) : data ? (
          <>
            {/* Stat Cards */}
            <div className="ax-stat-grid" style={{
              display: "grid",
              gap: "12px", marginBottom: "20px",
            }}>
              {[
                { icon: Eye, label: "Page Views", value: data.pageViews.total, color: "#06b6d4" },
                { icon: Users, label: "Unique Sessions", value: data.pageViews.uniqueSessions, color: "#38bdf8" },
                { icon: MessageSquare, label: "Messages", value: data.messages.total, color: "#22c55e" },
                { icon: Layers, label: "Conversations", value: data.conversations.total, color: "#f59e0b" },
                { icon: TrendingUp, label: "Events", value: data.events.total, color: "#ec4899" },
                { icon: Zap, label: "Active Users", value: data.messages.activeUsers, color: "#ef4444" },
              ].map((stat) => (
                <div key={stat.label} style={{
                  padding: "16px", borderRadius: "14px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <stat.icon style={{ width: 16, height: 16, color: stat.color, marginBottom: "8px" }} />
                  <p style={{ fontSize: "22px", fontWeight: 700, color: "white", margin: "0 0 2px" }}>
                    {stat.value.toLocaleString()}
                  </p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Two-column layout */}
            <div className="ax-detail-grid" style={{
              display: "grid", gap: "12px",
            }}>
              {/* Daily chart */}
              <div style={{
                padding: "20px", borderRadius: "14px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                gridColumn: "1 / -1",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px",
                }}>
                  <BarChart3 style={{ width: 14, height: 14, color: "#06b6d4" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                    Daily Page Views
                  </span>
                </div>
                <div style={{
                  display: "flex", alignItems: "flex-end", gap: "2px",
                  height: "120px", padding: "0 4px",
                }}>
                  {data.pageViews.daily.map((d, i) => (
                    <div key={i} style={{
                      flex: 1, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "flex-end", height: "100%",
                    }}>
                      <div style={{
                        width: "100%", maxWidth: "24px", borderRadius: "3px 3px 0 0",
                        height: `${Math.max(2, (d.views / maxDaily) * 100)}%`,
                        background: "linear-gradient(to top, rgba(6,182,212,0.3), rgba(6,182,212,0.6))",
                        transition: "height 0.3s",
                      }}
                        title={`${d.date}: ${d.views} views`}
                      />
                    </div>
                  ))}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: "4px",
                  fontSize: "8px", color: "rgba(255,255,255,0.1)",
                }}>
                  <span>{data.pageViews.daily[0]?.date?.slice(5)}</span>
                  <span>{data.pageViews.daily[data.pageViews.daily.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>

              {/* Top Pages */}
              <div style={{
                padding: "20px", borderRadius: "14px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  Top Pages
                </p>
                {data.pageViews.topPages.slice(0, 8).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)",
                  }}>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                      {p.path}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#67e8f9" }}>
                      {p.views}
                    </span>
                  </div>
                ))}
              </div>

              {/* Event Breakdown */}
              <div style={{
                padding: "20px", borderRadius: "14px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  Event Breakdown
                </p>
                {data.events.breakdown.slice(0, 8).map((e, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)",
                  }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{e.name}</span>
                      <span style={{
                        fontSize: "9px", color: "rgba(255,255,255,0.15)", marginLeft: "6px",
                      }}>
                        {e.category}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#7dd3fc" }}>
                      {e.count}
                    </span>
                  </div>
                ))}
                {data.events.breakdown.length === 0 && (
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "20px 0" }}>
                    No events tracked yet
                  </p>
                )}
              </div>

              {/* Tier Breakdown */}
              <div style={{
                padding: "20px", borderRadius: "14px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  User Tiers
                </p>
                {data.tiers.map((t, i) => {
                  const total = data.tiers.reduce((s, t) => s + t.count, 0);
                  const pct = total > 0 ? (t.count / total) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between", marginBottom: "4px",
                      }}>
                        <span style={{
                          fontSize: "11px", fontWeight: 600, textTransform: "capitalize",
                          color: tierColors[t.tier] || "#94a3b8",
                        }}>
                          {t.tier}
                        </span>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                          {t.count}
                        </span>
                      </div>
                      <div style={{
                        width: "100%", height: "4px", borderRadius: "2px",
                        background: "rgba(255,255,255,0.04)", overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: "2px",
                          background: tierColors[t.tier] || "#94a3b8",
                          width: `${pct}%`, transition: "width 0.3s",
                        }} />
                      </div>
                    </div>
                  );
                })}
                {data.tiers.length === 0 && (
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "20px 0" }}>
                    No users yet
                  </p>
                )}
              </div>

              {/* Message Stats */}
              <div style={{
                padding: "20px", borderRadius: "14px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  Message Stats
                </p>
                {[
                  { label: "Total Messages", value: data.messages.total, color: "#22c55e" },
                  { label: "User Messages", value: data.messages.userMessages, color: "#06b6d4" },
                  { label: "Assistant Messages", value: data.messages.assistantMessages, color: "#38bdf8" },
                  { label: "Active Users", value: data.messages.activeUsers, color: "#f59e0b" },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)",
                  }}>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: s.color }}>
                      {s.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Realtime Activity */}
            {realtime && realtime.recentPages.length > 0 && (
              <div style={{
                marginTop: "12px", padding: "20px", borderRadius: "14px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px",
                }}>
                  <Activity style={{ width: 14, height: 14, color: "#4ade80" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                    Realtime Activity (last 5 min)
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {realtime.recentPages.map((p, i) => (
                    <div key={i} style={{
                      padding: "4px 10px", borderRadius: "6px",
                      background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.08)",
                      fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace",
                    }}>
                      {p.path}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.2)" }}>
            Failed to load analytics
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ax-stat-grid { grid-template-columns: repeat(3, 1fr); }
        .ax-detail-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 768px) {
          .ax-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ax-detail-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .ax-stat-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
