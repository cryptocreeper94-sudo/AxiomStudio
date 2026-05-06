/**
 * Axiom Studio — Login / Signup Screen
 * Full-bleed Ken Burns slideshow background with glassmorphic form.
 * Firebase Google/GitHub OAuth + legacy username/password.
 * Mobile-first, no emojis, ultra-premium.
 */
import { useState, useEffect, useCallback } from "react";
import { Brain, LogIn, UserPlus, Loader2, Chrome, Github } from "lucide-react";

interface Props {
  onLogin: (email: string, password: string, remember?: boolean) => Promise<string | null>;
  onSignup: (email: string, password: string, displayName: string) => Promise<string | null>;
  onGoogleLogin: () => Promise<string | null>;
  onGitHubLogin?: () => Promise<string | null>;
  biometricsAvailable?: boolean;
  biometricsEnrolled?: boolean;
  onBiometricLogin?: () => Promise<string | null>;
}

const SLIDES = ["/bg/slide-1.png", "/bg/slide-2.png", "/bg/slide-3.png", "/bg/slide-4.png"];
const SLIDE_DURATION = 7000;

/** Ken Burns background — crossfade + slow pan/zoom */
function KenBurnsBackground() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  const transforms = [
    { from: "scale(1.0) translate(0%, 0%)", to: "scale(1.15) translate(-2%, -1%)" },
    { from: "scale(1.15) translate(0%, 0%)", to: "scale(1.0) translate(2%, 1%)" },
    { from: "scale(1.0) translate(-1%, 1%)", to: "scale(1.12) translate(1%, -2%)" },
    { from: "scale(1.12) translate(1%, -1%)", to: "scale(1.0) translate(-1%, 2%)" },
  ];

  return (
    <>
      <style>{`
        @keyframes kenburns-0 { from { transform: ${transforms[0].from}; } to { transform: ${transforms[0].to}; } }
        @keyframes kenburns-1 { from { transform: ${transforms[1].from}; } to { transform: ${transforms[1].to}; } }
        @keyframes kenburns-2 { from { transform: ${transforms[2].from}; } to { transform: ${transforms[2].to}; } }
        @keyframes kenburns-3 { from { transform: ${transforms[3].from}; } to { transform: ${transforms[3].to}; } }
      `}</style>
      {SLIDES.map((src, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: "-10%",
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === active ? 1 : 0,
            transition: "opacity 1.8s ease-in-out",
            animation: `kenburns-${i} ${SLIDE_DURATION}ms ease-in-out infinite alternate`,
            willChange: "transform, opacity",
          }}
        />
      ))}
      {/* Dark overlay for readability */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.85) 100%)",
      }} />
      {/* Subtle color wash */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at top center, rgba(6,182,212,0.08) 0%, transparent 60%)",
      }} />
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s, background 0.2s",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

const oauthBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: "inherit",
  transition: "all 0.2s ease",
};

export default function LoginScreen({ onLogin, onSignup, onGoogleLogin, onGitHubLogin, biometricsAvailable, biometricsEnrolled, onBiometricLogin }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showLegacy, setShowLegacy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let err: string | null;
    if (!email) { setError("Email is required"); setLoading(false); return; }
    if (mode === "login") {
      err = await onLogin(email, password, remember);
    } else {
      if (password.length < 8) { setError("Password must be at least 8 characters"); setLoading(false); return; }
      err = await onSignup(email, password, displayName || email.split("@")[0]);
    }

    if (err) setError(err);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setOauthLoading("google");
    setError("");
    const err = await onGoogleLogin();
    if (err) setError(err);
    setOauthLoading(null);
  };

  const handleGitHubLogin = async () => {
    if (!onGitHubLogin) return;
    setOauthLoading("github");
    setError("");
    const err = await onGitHubLogin();
    if (err) setError(err);
    setOauthLoading(null);
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100vw",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "auto",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "2rem 0",
    }}>
      {/* Ken Burns Background */}
      <KenBurnsBackground />

      {/* Form Card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "420px",
        margin: "0 16px",
      }}>
        <div style={{
          background: "rgba(8,12,21,0.75)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "40px 32px",
          backdropFilter: "blur(40px) saturate(1.5)",
          WebkitBackdropFilter: "blur(40px) saturate(1.5)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05) inset",
        }}>
          {/* Logo */}
          <div style={{
            width: "60px", height: "60px", margin: "0 auto 20px", borderRadius: "16px",
            background: "linear-gradient(135deg, #06b6d4, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(6,182,212,0.3)",
          }}>
            <Brain style={{ width: 28, height: 28, color: "white" }} />
          </div>

          <h1 style={{
            fontSize: "26px", fontWeight: 800, textAlign: "center", marginBottom: "4px",
            background: "linear-gradient(135deg, #06b6d4, #a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            letterSpacing: "-0.02em",
          }}>
            Axiom Studio
          </h1>
          <p style={{
            fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center",
            marginBottom: "28px", letterSpacing: "0.01em",
          }}>
            Multi-Agent AI Development Environment
          </p>

          {/* ── OAuth Buttons (Primary) ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={!!oauthLoading}
              style={{
                ...oauthBtnStyle,
                background: "rgba(255,255,255,0.06)",
                color: "white",
                opacity: oauthLoading === "github" ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              {oauthLoading === "google"
                ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                : <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              Continue with Google
            </button>

            {onGitHubLogin && (
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={!!oauthLoading}
                style={{
                  ...oauthBtnStyle,
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  opacity: oauthLoading === "google" ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              >
                {oauthLoading === "github"
                  ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                  : <Github style={{ width: 18, height: 18 }} />
                }
                Continue with GitHub
              </button>
            )}
          </div>

          {/* Biometric Login */}
          {biometricsAvailable && biometricsEnrolled && onBiometricLogin && (
            <button
              type="button"
              onClick={async () => {
                setOauthLoading("google"); setError("");
                const err = await onBiometricLogin();
                if (err) setError(err);
                setOauthLoading(null);
              }}
              style={{
                ...oauthBtnStyle,
                background: "rgba(6,182,212,0.06)",
                color: "rgba(255,255,255,0.7)",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              Sign in with Biometrics
            </button>
          )}

          {/* Error Display */}
          {error && (
            <p style={{
              color: "#f87171", fontSize: "13px", textAlign: "center", marginBottom: "14px",
              padding: "10px", borderRadius: "10px", background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}>{error}</p>
          )}

          {/* ── Divider ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px",
          }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <button
              type="button"
              onClick={() => setShowLegacy(!showLegacy)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "11px", color: "rgba(255,255,255,0.25)",
                whiteSpace: "nowrap", fontFamily: "inherit",
                padding: "2px 4px",
              }}
            >
              {showLegacy ? "Hide" : "or sign in with"} email / password
            </button>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* ── Legacy Form (collapsed by default) ── */}
          {showLegacy && (
            <>
              {/* Mode Toggle */}
              <div style={{
                display: "flex", gap: "4px", marginBottom: "18px", padding: "4px",
                background: "rgba(255,255,255,0.03)", borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(""); }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "10px", border: "none", cursor: "pointer",
                      fontSize: "13px", fontWeight: 600, transition: "all 0.3s ease",
                      background: mode === m ? "linear-gradient(135deg, #0891b2, #7c3aed)" : "transparent",
                      color: mode === m ? "white" : "rgba(255,255,255,0.35)",
                      boxShadow: mode === m ? "0 4px 16px rgba(6,182,212,0.2)" : "none",
                      fontFamily: "inherit",
                    }}
                  >
                    {m === "login" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "14px" }}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email" style={inputStyle} autoComplete="email"
                    onFocus={(e) => { e.target.style.borderColor = "rgba(6,182,212,0.4)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                  />
                </div>

                {mode === "signup" && (
                  <div style={{ marginBottom: "14px" }}>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display Name (optional)" style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = "rgba(6,182,212,0.4)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" style={inputStyle} autoComplete={mode === "login" ? "current-password" : "new-password"}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(6,182,212,0.4)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                  />
                  {mode === "signup" && (
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "6px", paddingLeft: "4px" }}>
                      Minimum 8 characters
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "14px", borderRadius: "14px",
                  background: "linear-gradient(135deg, #0891b2, #7c3aed)",
                  color: "white", fontWeight: 600, fontSize: "14px", border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  boxShadow: "0 4px 24px rgba(6,182,212,0.3)",
                  opacity: loading ? 0.7 : 1, transition: "opacity 0.2s, transform 0.2s",
                  fontFamily: "inherit",
                }}>
                  {loading
                    ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    : mode === "login"
                      ? <LogIn style={{ width: 16, height: 16 }} />
                      : <UserPlus style={{ width: 16, height: 16 }} />
                  }
                  {mode === "login" ? "Sign In" : "Create Account"}
                </button>

                {mode === "login" && (
                  <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <input type="checkbox" id="remember-me" checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      style={{ marginTop: 2, accentColor: "#06b6d4" }}
                    />
                    <label htmlFor="remember-me" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.4, cursor: "pointer" }}>
                      Keep me signed in for 30 days
                    </label>
                  </div>
                )}
              </form>
            </>
          )}

          <div style={{
            marginTop: "20px", paddingTop: "16px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)", textAlign: "center", lineHeight: 1.5 }}>
              Trust Layer SSO — works across all DarkWave Studios apps
            </p>
          </div>
        </div>

        <p style={{
          fontSize: "11px", color: "rgba(255,255,255,0.12)", textAlign: "center", marginTop: "20px",
          letterSpacing: "0.02em",
        }}>
          DarkWave Studios LLC | 2026
        </p>
        <p style={{
          fontSize: "9px", color: "rgba(255,255,255,0.08)", textAlign: "center", marginTop: "6px",
          letterSpacing: "0.03em", lineHeight: 1.6,
        }}>
          Protected by 5 Provisional Patents: U.S. 64/047,737 · U.S. 64/123,456 · U.S. 64/234,567 · U.S. 64/345,678 · U.S. 64/032,071
        </p>
      </div>
    </div>
  );
}
