/**
 * Axiom Studio — Cinematic Landing Page
 * Mobile-first marketing page for axiomstudio.dev
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import { Brain, ArrowRight, Terminal, GitBranch, Bot, Code2, Zap, Shield, Monitor, Smartphone, ChevronDown, ChevronLeft, ChevronRight, Image } from "lucide-react";
import "./landing.css";

const SLIDES = ["/bg/slide-1.png", "/bg/slide-2.png", "/bg/slide-3.png", "/bg/slide-4.png"];
const SLIDE_DURATION = 7000;

const FEATURES = [
  { icon: <Bot className="w-5 h-5" />, bg: "rgba(6, 182, 212, 0.12)", title: "Multi-Agent AI", desc: "Claude Opus, Sonnet, GPT-4o — auto-routed to the best model for each task. No manual switching." },
  { icon: <Monitor className="w-5 h-5" />, bg: "rgba(20, 40, 80, 0.25)", title: "Full IDE in Browser", desc: "Monaco editor, file explorer, real terminal — everything you need without leaving the browser." },
  { icon: <Terminal className="w-5 h-5" />, bg: "rgba(56, 189, 248, 0.12)", title: "Real Terminal", desc: "Not a sandbox. A real shell on your machine. Run git, npm, python — anything." },
  { icon: <GitBranch className="w-5 h-5" />, bg: "rgba(34, 197, 94, 0.12)", title: "Native Git", desc: "Push, pull, branch, merge — directly from the IDE. No copy-pasting commands." },
  { icon: <Image className="w-5 h-5" />, bg: "rgba(220, 50, 70, 0.12)", title: "Image Generation", desc: "Generate images with DALL-E 3 directly in your project. Save to disk or preview inline." },
  { icon: <Zap className="w-5 h-5" />, bg: "rgba(250, 204, 21, 0.12)", title: "Local Mode", desc: "Install locally with npx. Full filesystem access, web search, browser automation. Same credits." },
  { icon: <Shield className="w-5 h-5" />, bg: "rgba(140, 20, 30, 0.15)", title: "Enterprise Security", desc: "OAuth, biometrics, Trust Layer SSO. Your code stays on your machine in local mode." },
];

const AGENTS = [
  { name: "Opus", model: "claude-opus-4-7", img: "/agents/opus.png", border: "rgba(30, 58, 138, 0.4)", cost: "3 credits" },
  { name: "Sonnet", model: "claude-sonnet-4-20250514", img: "/agents/sonnet.png", border: "rgba(6, 182, 212, 0.3)", cost: "1 credit" },
  { name: "GPT-4o", model: "gpt-4o", img: "/agents/gpt4o.png", border: "rgba(34, 197, 94, 0.3)", cost: "2 credits" },
  { name: "o3-mini", model: "o3-mini", img: "/agents/o3mini.png", border: "rgba(180, 60, 30, 0.3)", cost: "1 credit" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [featureIdx, setFeatureIdx] = useState(0);

  // Fix body scroll — override the IDE's overflow:hidden
  useEffect(() => {
    document.body.classList.add("landing-page-active");
    return () => document.body.classList.remove("landing-page-active");
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Ken Burns slideshow timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  const copyCmd = () => {
    navigator.clipboard.writeText("npx axiom-studio");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon">
            <Brain className="w-4 h-4" style={{ color: "white" }} />
          </div>
          Axiom Studio
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#agents">Agents</a>
          <a href="#install">Install</a>
          <a href="https://github.com/cryptocreeper94-sudo/Axiom-Studio" target="_blank" rel="noopener">GitHub</a>
          <a href="/ide" className="nav-cta">Open IDE</a>
        </div>
      </nav>

      {/* ── Hero with Ken Burns ── */}
      <section className="landing-hero">
        {/* Ken Burns Slides */}
        {SLIDES.map((src, i) => (
          <div
            key={i}
            className="hero-slide"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === activeSlide ? 1 : 0,
              animation: `kenburns-${(i % 4) + 1} ${SLIDE_DURATION}ms ease-in-out infinite alternate`,
            }}
          />
        ))}
        {/* Dark cinematic overlay */}
        <div className="hero-overlay" />
        {/* Color wash */}
        <div className="hero-color-wash" />

        {/* Particles */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}

        <div className="hero-content">
          <div className="hero-badge">
            <span className="dot" />
            Now available on npm
          </div>

          <h1 className="hero-title">
            The Code Editor That<br />
            <span className="gradient">Thinks With You</span>
          </h1>

          <p className="hero-sub">
            Multi-agent coding environment with full filesystem access.
            Run in the cloud or install locally. Same agents, same power.
          </p>

          <div className="hero-ctas">
            <a href="/ide" className="cta-primary">
              Start Free <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#install" className="cta-secondary">
              <Terminal className="w-4 h-4" />
              Install Local
            </a>
          </div>

          {/* Code preview */}
          <div className="code-window">
            <div className="code-window-bar">
              <div className="code-dot" style={{ background: "#ff5f57" }} />
              <div className="code-dot" style={{ background: "#febc2e" }} />
              <div className="code-dot" style={{ background: "#28c840" }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>terminal</span>
            </div>
            <pre>
              <span className="cm"># Install and run — one command</span>{"\n"}
              <span className="prompt" style={{ color: "#a855f7" }}>$</span> <span className="fn">npx</span> <span className="var">axiom-studio</span>{"\n"}
              {"\n"}
              <span className="cm"># Or use the cloud IDE at axiomstudio.dev</span>{"\n"}
              <span className="cm"># Same account, same agents, same credits</span>{"\n"}
              {"\n"}
              <span className="str">✓ Axiom Studio running at localhost:5100</span>{"\n"}
              <span className="str">✓ Full filesystem access enabled</span>{"\n"}
              <span className="str">✓ AI agents ready</span>
            </pre>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="scroll-hint">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ── Features Carousel ── */}
      <section className="landing-section" id="features">
        <span className="section-label">Capabilities</span>
        <h2 className="section-title">Everything You Need to Ship</h2>
        <p className="section-sub">
          A complete development environment powered by the world's best AI models.
          Cloud or local — you choose.
        </p>

        <div className="feature-carousel">
          <div className="carousel-track">
            {FEATURES.map((f, i) => {
              const offset = (i - featureIdx + FEATURES.length) % FEATURES.length;
              const isCenter = offset === 0;
              const isLeft = offset === FEATURES.length - 1;
              const isRight = offset === 1;
              const visible = isCenter || isLeft || isRight;
              return (
                <div
                  className={`feature-slide ${isCenter ? "active" : ""}`}
                  key={i}
                  style={{
                    transform: isCenter ? "translateX(0) scale(1)" : isLeft ? "translateX(-110%) scale(0.85)" : isRight ? "translateX(110%) scale(0.85)" : "translateX(200%) scale(0.7)",
                    opacity: visible ? 1 : 0,
                    pointerEvents: isCenter ? "auto" : "none",
                    zIndex: isCenter ? 3 : 1,
                  }}
                >
                  <div className="feature-icon" style={{ background: f.bg, color: "white" }}>
                    {f.icon}
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="carousel-controls">
            <button className="carousel-arrow" onClick={() => setFeatureIdx((featureIdx - 1 + FEATURES.length) % FEATURES.length)}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="carousel-dots">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  className={`carousel-dot ${i === featureIdx ? "active" : ""}`}
                  onClick={() => setFeatureIdx(i)}
                />
              ))}
            </div>
            <button className="carousel-arrow" onClick={() => setFeatureIdx((featureIdx + 1) % FEATURES.length)}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Agents ── */}
      <section className="landing-section" id="agents">
        <span className="section-label">AI Agents</span>
        <h2 className="section-title">Smart Auto-Routing</h2>
        <p className="section-sub">
          Your request is automatically routed to the best model for the job.
          Complex architecture? Opus. Quick fix? Sonnet. Every agent has full tool access —
          file editing, terminal, git, image generation, web search, and browser automation.
        </p>

        <div className="agent-grid">
          {AGENTS.map((a, i) => (
            <div className="agent-card" key={i} style={{ borderColor: a.border }}>
              <img
                src={a.img}
                alt={a.name}
                style={{
                  width: 56, height: 56, borderRadius: 12, objectFit: "cover",
                  marginBottom: 12, border: `1px solid ${a.border}`,
                }}
              />
              <h4>{a.name}</h4>
              <div className="model">{a.model}</div>
              <div className="cost">{a.cost} / message</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Install ── */}
      <section className="landing-section" id="install">
        <span className="section-label">Get Started</span>
        <h2 className="section-title">Use It Anywhere</h2>
        <p className="section-sub">
          Cloud for quick access from any device. Local for full power on your machine.
          Same account works everywhere.
        </p>

        <div className="install-block">
          <div className="install-card" style={{ borderColor: "rgba(6, 182, 212, 0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Monitor className="w-5 h-5" style={{ color: "#06b6d4" }} />
              <h3>Cloud IDE</h3>
            </div>
            <p>No install. Open your browser, sign in, start coding. Works on desktop, tablet, and phone.</p>
            <a href="/ide" className="cta-primary" style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px 24px" }}>
              Open IDE <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="install-card" style={{ borderColor: "rgba(168, 85, 247, 0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Terminal className="w-5 h-5" style={{ color: "#a855f7" }} />
              <h3>Local Mode</h3>
            </div>
            <p>Full filesystem access. Real terminal. Native git. Requires Node.js 18+.</p>
            <div className="install-cmd" onClick={copyCmd} style={{ cursor: "pointer" }}>
              <span className="prompt">$</span>
              <span>npx axiom-studio</span>
              <button className="copy-btn">{copied ? "Copied!" : "Copy"}</button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginTop: "3rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { step: "1", label: "Install Node.js", sub: "nodejs.org" },
            { step: "2", label: "Run the command", sub: "npx axiom-studio" },
            { step: "3", label: "Login & code", sub: "Browser opens automatically" },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
              borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #0891b2, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0,
              }}>{s.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Comparison ── */}
      <section className="landing-section">
        <span className="section-label">Platform</span>
        <h2 className="section-title">Cloud vs Local</h2>
        <div style={{
          borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#94a3b8" }}></th>
                <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Smartphone className="w-4 h-4" style={{ color: "#06b6d4" }} /> Cloud
                  </div>
                </th>
                <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Monitor className="w-4 h-4" style={{ color: "#a855f7" }} /> Local
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Files", "Cloud workspace", "Your disk"],
                ["Terminal", "Cloud shell", "Real local shell"],
                ["Git", "Import tool", "Native push/pull"],
                ["Auth", "Google / GitHub", "Auto-login"],
                ["Mobile", "Full support", "Desktop only"],
                ["Credits", "Pay-per-use", "Pay-per-use"],
                ["Setup", "Zero", "One command"],
              ].map(([label, cloud, local], i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px 20px", fontWeight: 600, fontSize: 13 }}>{label}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{cloud}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{local}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div style={{ marginBottom: 16 }}>
          <a href="/" className="nav-logo" style={{ justifyContent: "center", marginBottom: 12, display: "inline-flex" }}>
            <div className="nav-logo-icon">
              <Brain className="w-4 h-4" style={{ color: "white" }} />
            </div>
            Axiom Studio
          </a>
        </div>
        <p style={{ marginBottom: 8 }}>
          <a href="https://npmjs.com/package/axiom-studio">npm</a>
          {" · "}
          <a href="https://github.com/cryptocreeper94-sudo/Axiom-Studio">GitHub</a>
          {" · "}
          <a href="https://dwtl.io">Trust Layer</a>
          {" · "}
          <a href="https://lume-lang.org">Lume</a>
        </p>
        <p>DarkWave Studios LLC · 2026 · All Rights Reserved</p>
        <p style={{ fontSize: 9, color: "#334155", marginTop: 8 }}>
          Patent Pending: U.S. 64/032,339 · U.S. 64/047,512 · U.S. 64/047,467 · U.S. 64/047,496 · U.S. 64/047,536
        </p>
      </footer>
    </div>
  );
}
