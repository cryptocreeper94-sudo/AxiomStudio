/**
 * Axiom Studio — Cinematic Landing Page
 * Mobile-first marketing page for axiomstudio.dev
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect } from "react";
import { Brain, ArrowRight, Terminal, GitBranch, Bot, Code2, Zap, Shield, Monitor, Smartphone, ChevronDown, ChevronLeft, ChevronRight, Image, Menu, X, BookOpen, Clock, Sparkles } from "lucide-react";
import "./landing.css";

const BLOG_POSTS = [
  {
    title: "Why Multi-Agent AI Is the Future of Development",
    excerpt: "Single-model coding tools hit a ceiling. By routing tasks to specialized agents — Opus for architecture, Sonnet for quick fixes — Axiom Studio delivers expert-level assistance at every layer of the stack.",
    date: "May 10, 2026",
    tag: "AI Engineering",
    readTime: "6 min read",
  },
  {
    title: "Local Mode: Full Power, Zero Compromise",
    excerpt: "Run Axiom Studio on your machine with one command. Access your real filesystem, native git, and local terminal — no sandboxes, no upload limits, no latency.",
    date: "May 8, 2026",
    tag: "Product",
    readTime: "4 min read",
  },
  {
    title: "Building AXIOM42: A Deterministic Knowledge Engine",
    excerpt: "How we built a cognitive substrate that answers factual questions without hallucination — using regex-gated deterministic response packs instead of probabilistic generation.",
    date: "May 5, 2026",
    tag: "Research",
    readTime: "8 min read",
  },
  {
    title: "Image Generation Meets Code: DALL-E 3 in Your IDE",
    excerpt: "Generate assets, UI mockups, and diagrams without leaving your editor. Axiom Studio's image generation tool saves directly to your project directory.",
    date: "May 2, 2026",
    tag: "Features",
    readTime: "3 min read",
  },
];

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

const DEMO_CODE_LINES = [
  'import React, { useState, useEffect } from "react";',
  'import { AreaChart, Area, XAxis, Tooltip } from "recharts";',
  '',
  'export default function Dashboard() {',
  '  const [data, setData] = useState([]);',
  '  const [dark, setDark] = useState(true);',
  '',
  '  useEffect(() => {',
  '    const interval = setInterval(() => {',
  '      setData(prev => [...prev.slice(-20), {',
  '        time: Date.now(),',
  '        value: Math.random() * 100,',
  '        users: Math.floor(Math.random() * 500),',
  '      }]);',
  '    }, 1000);',
  '    return () => clearInterval(interval);',
  '  }, []);',
  '',
  '  return (',
  '    <div className={dark ? "dark" : ""}>',
  '      <AreaChart data={data} width={600} height={300}>',
  '        <Area type="monotone" dataKey="value" />',
  '      </AreaChart>',
  '    </div>',
  '  );',
  '}',
];

function DemoTypingEffect() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= DEMO_CODE_LINES.length) {
          // Reset after a pause
          setTimeout(() => setVisibleLines(0), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <pre className="demo-code">
      {DEMO_CODE_LINES.slice(0, visibleLines).map((line, i) => (
        <div key={i} className="demo-code-line">
          <span className="demo-line-num">{i + 1}</span>
          <span className="demo-line-text">{line}</span>
        </div>
      ))}
      <span className="demo-cursor">|</span>
    </pre>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [featureIdx, setFeatureIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // SEO meta tags
  useEffect(() => {
    document.title = "Axiom Studio — AI Code Editor | Multi-Agent IDE by DarkWave Studios";
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", "Axiom Studio is a multi-agent AI coding IDE with Claude Opus, Sonnet, and GPT-4o. Full filesystem access, native git, real terminal. Cloud or local — same power.");
    setMeta("keywords", "AI code editor, AI IDE, Claude Opus, GPT-4o, multi-agent coding, local AI development, DarkWave Studios, Axiom Studio");
    setMeta("robots", "index, follow");
    setMeta("author", "DarkWave Studios LLC");
    setMeta("og:title", "Axiom Studio — AI Code Editor | Multi-Agent IDE", true);
    setMeta("og:description", "Multi-agent AI coding environment with Claude Opus, Sonnet, GPT-4o. Full filesystem access, real terminal, native git. Cloud or local.", true);
    setMeta("og:url", "https://axiomstudio.dev", true);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", "Axiom Studio", true);
    setMeta("twitter:title", "Axiom Studio — AI Code Editor");
    setMeta("twitter:description", "Multi-agent AI IDE with Claude Opus, Sonnet, GPT-4o. Cloud or local.");
  }, []);

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
          <a href="#demo">Demo</a>
          <a href="#features">Features</a>
          <a href="#agents">Agents</a>
          <a href="#blog">Blog</a>
          {!isMobile && <a href="#install">Download</a>}
          <a href="/ide" className="nav-cta">Open Cloud IDE</a>
        </div>
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#agents" onClick={() => setMenuOpen(false)}>Agents</a>
            <a href="#blog" onClick={() => setMenuOpen(false)}>Blog</a>
            {!isMobile && <a href="#install" onClick={() => setMenuOpen(false)}>Download App</a>}
            <a href="https://github.com/cryptocreeper94-sudo/Axiom-Studio" target="_blank" rel="noopener" onClick={() => setMenuOpen(false)}>GitHub</a>
            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />
            <a href="/ide" className="mobile-menu-cta" onClick={() => setMenuOpen(false)}>Open IDE →</a>
          </div>
        </div>
      )}

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
            {isMobile ? "Cloud IDE — Free to start" : "Now available on npm"}
          </div>

          <h1 className="hero-title">
            The Code Editor That<br />
            <span className="gradient">Thinks With You</span>
          </h1>

          <p className="hero-sub">
            {isMobile
              ? "Multi-agent AI coding from any device. Claude Opus, Sonnet, GPT-4o — one account, instant access."
              : "Multi-agent coding environment with full filesystem access. Run in the cloud or install locally. Same agents, same power."}
          </p>

          <div className="hero-ctas">
            <a href="/ide" className="cta-primary">
              {isMobile ? "Open Cloud IDE" : "Start Free"} <ArrowRight className="w-4 h-4" />
            </a>
            {!isMobile && (
              <a href="#install" className="cta-secondary">
                <Monitor className="w-4 h-4" />
                Download App
              </a>
            )}
          </div>

          {/* Code preview — desktop only */}
          {!isMobile && (
            <div className="code-window">
              <div className="code-window-bar">
                <div className="code-dot" style={{ background: "#ff5f57" }} />
                <div className="code-dot" style={{ background: "#febc2e" }} />
                <div className="code-dot" style={{ background: "#28c840" }} />
                <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>terminal</span>
              </div>
              <pre>
                <span className="cm"># Download the native Windows application</span>{"\n"}
                <span className="prompt" style={{ color: "#a855f7" }}>$</span> <span className="fn">curl</span> <span className="var">-O https://axiomstudio.dev/Axiom-Studio-Setup.exe</span>{"\n"}
                {"\n"}
                <span className="cm"># Or open the Cloud IDE at axiomstudio.dev</span>{"\n"}
                <span className="cm"># Same account, same agents, same credits</span>{"\n"}
                {"\n"}
                <span className="str">✓ Axiom Studio running at localhost:5100</span>{"\n"}
                <span className="str">✓ Full filesystem access enabled</span>{"\n"}
                <span className="str">✓ AI agents ready</span>
              </pre>
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div className="scroll-hint">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ── Free Credits Banner ── */}
      <section className="free-credits-banner">
        <div className="credits-banner-content">
          <div className="credits-banner-icon">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="credits-banner-text">
            <h3>50 Free Credits on Signup</h3>
            <p>No credit card required. Start building with Claude Opus, Sonnet, and GPT-4o — completely free.</p>
          </div>
          <a href="/ide" className="credits-banner-cta">
            Claim Free Credits <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── See It In Action — Demo Walkthrough ── */}
      <section className="landing-section" id="demo">
        <span className="section-label">See It In Action</span>
        <h2 className="section-title">Watch Axiom Build a Project</h2>
        <p className="section-sub">
          See how a single prompt turns into a full-stack application — AI agents writing code,
          running commands, and deploying in real time.
        </p>

        <div className="demo-container">
          <div className="demo-window">
            <div className="demo-window-bar">
              <div className="code-dot" style={{ background: "#ff5f57" }} />
              <div className="code-dot" style={{ background: "#febc2e" }} />
              <div className="code-dot" style={{ background: "#28c840" }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Axiom Studio — Live Demo</span>
            </div>
            <div className="demo-content">
              <div className="demo-sidebar">
                <div className="demo-sidebar-header">
                  <Code2 className="w-4 h-4" style={{ color: "#06b6d4" }} />
                  <span>EXPLORER</span>
                </div>
                <div className="demo-file active">📄 App.tsx</div>
                <div className="demo-file">📄 index.css</div>
                <div className="demo-file">📄 api.ts</div>
                <div className="demo-file">📁 components/</div>
                <div className="demo-file">📁 server/</div>
                <div className="demo-file">📄 package.json</div>
              </div>
              <div className="demo-editor">
                <div className="demo-typing-area">
                  <DemoTypingEffect />
                </div>
              </div>
              <div className="demo-chat">
                <div className="demo-chat-header">
                  <Bot className="w-4 h-4" style={{ color: "#a855f7" }} />
                  <span>AI Assistant</span>
                </div>
                <div className="demo-msg user">
                  <span className="demo-msg-role">You</span>
                  Build me a dashboard with live charts and dark mode
                </div>
                <div className="demo-msg assistant">
                  <span className="demo-msg-role">Opus</span>
                  I'll create a React dashboard with Recharts, including a responsive layout, dark theme, and live-updating data feeds. Let me start with the component structure...
                </div>
                <div className="demo-msg tool">
                  <Zap className="w-3 h-3" /> Writing App.tsx — 142 lines
                </div>
                <div className="demo-msg tool">
                  <Terminal className="w-3 h-3" /> npm install recharts
                </div>
                <div className="demo-msg tool">
                  <Zap className="w-3 h-3" /> Writing DashboardChart.tsx — 89 lines
                </div>
                <div className="demo-msg assistant">
                  <span className="demo-msg-role">Opus</span>
                  ✓ Dashboard complete! You've got 3 chart types with live data, responsive grid layout, and a dark/light mode toggle. Run <code>npm run dev</code> to preview.
                </div>
              </div>
            </div>
          </div>
          <div className="demo-caption">
            <p>This is what one prompt looks like inside Axiom Studio. The AI writes code, installs packages, and builds your project — all in under 30 seconds.</p>
            <a href="/ide" className="cta-primary" style={{ marginTop: 16, display: "inline-flex" }}>
              Try It Free <ArrowRight className="w-4 h-4" />
            </a>
          </div>
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

      {/* ── Install (desktop only) ── */}
      {!isMobile && (
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
                <Monitor className="w-5 h-5" style={{ color: "#a855f7" }} />
                <h3>Desktop App</h3>
              </div>
              <p>Full filesystem access. Native terminal and git. Fast Electron desktop application for Windows.</p>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Executable building in progress. Run "npm run electron:dev" for now!'); }} className="cta-primary" style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px 24px", background: "linear-gradient(135deg, #a855f7, #6366f1)", border: "none" }}>
                Download for Windows (.exe)
              </a>
            </div>
          </div>

          {/* How it works */}
          <div style={{ marginTop: "3rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { step: "1", label: "Download", sub: "Axiom-Studio-Setup.exe" },
              { step: "2", label: "Install", sub: "Double click to run" },
              { step: "3", label: "Login & code", sub: "Native app opens instantly" },
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
      )}

      {/* ── Blog ── */}
      <section className="landing-section" id="blog">
        <span className="section-label">Engineering Blog</span>
        <h2 className="section-title">From the Lab</h2>
        <p className="section-sub">
          Deep dives into AI engineering, product updates, and the research behind Axiom Studio.
        </p>

        <div className="blog-grid">
          {BLOG_POSTS.map((post, i) => (
            <article className="blog-card" key={i}>
              <div className="blog-tag">
                <Sparkles className="w-3 h-3" />
                {post.tag}
              </div>
              <h3 className="blog-title">{post.title}</h3>
              <p className="blog-excerpt">{post.excerpt}</p>
              <div className="blog-meta">
                <span><Clock className="w-3 h-3" /> {post.date}</span>
                <span><BookOpen className="w-3 h-3" /> {post.readTime}</span>
              </div>
            </article>
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
          {" · "}
          <a href="#blog">Blog</a>
        </p>
        <p style={{ marginBottom: 8 }}>
          <a href="https://darkwavestudios.io/terms">Terms of Service</a>
          {" · "}
          <a href="https://darkwavestudios.io/privacy">Privacy Policy</a>
          {" · "}
          <a href="mailto:support@axiomstudio.dev">support@axiomstudio.dev</a>
        </p>
        <p>DarkWave Studios LLC · 2026 · All Rights Reserved</p>
        <p style={{ fontSize: 9, color: "#334155", marginTop: 8 }}>
          Patent Pending: U.S. 64/032,339 · U.S. 64/047,512 · U.S. 64/047,467 · U.S. 64/047,496 · U.S. 64/047,536
        </p>
      </footer>
    </div>
  );
}
