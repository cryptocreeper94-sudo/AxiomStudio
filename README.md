# Axiom Studio

**The AI IDE That Lives On Your Machine**

[![npm](https://img.shields.io/npm/v/axiom-studio?color=06b6d4&label=npm)](https://npmjs.com/package/axiom-studio)
[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-3.1.0-blue)](https://github.com/cryptocreeper94-sudo/Axiom-Studio/releases)

Multi-agent AI coding environment with full filesystem access. Use in the cloud or install locally — same agents, same power.

---

## Quick Start

### Cloud (instant, any device)
Go to **[axiomstudio.dev](https://axiomstudio.dev)** — sign in and start coding.

### Desktop (full power)
Download **Axiom Studio Setup 3.1.0.exe** from [Releases](https://github.com/cryptocreeper94-sudo/Axiom-Studio/releases) and run the installer.

### Local CLI (developers)
```bash
npx axiom-studio
```
Requires Node.js 18+ (v24 fully supported). Browser opens automatically. Full filesystem access, real terminal, native git.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent AI** | Opus, Gemini 3.1 Pro, Sonnet, DeepSeek V3, GPT-4.1, Gemini Flash — switch models mid-conversation |
| **Smart Auto-Router** | Automatically selects the best model based on task complexity (Flash → DeepSeek → Sonnet → Gemini → Opus) |
| **Lume-V SECURED** | Top-level branding enforces Trust Layer governance across all workspaces |
| **Full IDE** | Monaco editor, file explorer, syntax highlighting for 50+ languages |
| **Dashboard Home** | Credit counter, quick-start templates, recent conversations — no blank IDE dumps |
| **Live Preview** | Split-view workspace serving for real-time HTML/JS preview alongside code |
| **Library Panel** | Categorized file browser with search, download, share, copy, and context menus |
| **Web Search** | Agents search the web in real-time for current information |
| **Voice Input** | Web Speech API integration for hands-free chat |
| **Real Terminal** | Not a sandbox — run git, npm, python, anything |
| **Native Git** | Push, pull, branch directly from the IDE |
| **Agentic Artifacts** | Agents produce structured artifacts and execute multi-step plans |
| **ZIP Export** | Export any project as a ZIP archive from the toolbar |
| **Project Persistence** | Database-backed workspace isolation with session resume |
| **Local Mode** | Full filesystem access via `npx axiom-studio` |
| **Cloud Mode** | Browser-based, works on mobile, tablet, desktop |
| **Credit System** | Pay-per-use, no subscriptions. Same credits work cloud and local |
| **OAuth** | Google, GitHub, Trust Layer SSO |
| **Enterprise Security** | Biometric auth, encrypted tokens, code stays local |

## AI Agents

| Agent | Model | Credits | Status |
|-------|-------|---------|--------|
| Axiom (Opus) | `claude-opus-4-8` | 10 / message | ✅ Live |
| Axiom Gemini | `gemini-3.1-pro` | 5 / message | ✅ Live |
| Axiom Quick (Sonnet) | `claude-sonnet-4-6` | 3 / message | ✅ Live |
| Axiom Deep (DeepSeek) | `deepseek-chat` | 2 / message | ✅ Live |
| Axiom GPT | `gpt-4.1` | 4 / message | 🔜 Coming Soon |
| Axiom GPT Mini | `gpt-4.1-mini` | 1 / message | 🔜 Coming Soon |
| Lume Agent | `claude-opus-4-8` | 10 / message | ✅ Live |
| Axiom Free (Flash) | `gemini-2.0-flash-lite` | Free | ✅ Always Free |
| Auto-Router | Gemini Flash classifier | Free | ✅ Live |

**50 free credits on signup** — enough to build a functioning app before you buy. Gemini Flash is always free, no credits needed.

## Architecture

```
Cloud (axiomstudio.dev)          Local (npx axiom-studio)
├── PostgreSQL files             ├── Real filesystem (disk)
├── Firebase auth                ├── Auto-login (owner)
├── Stripe billing               ├── Credit-check proxy
├── Cloud terminal               ├── Local PowerShell/bash
├── Dashboard home               ├── Dashboard home
└── Works on mobile              └── Desktop only
```

Both modes use the same frontend, same agents, same streaming protocol.

## Development

```bash
# Clone
git clone https://github.com/cryptocreeper94-sudo/Axiom-Studio.git
cd Axiom-Studio

# Install dependencies
npm install

# Run cloud dev server
npm run dev

# Run local mode (no DB needed)
npm run local
```

## Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS, Monaco Editor, Framer Motion
- **Backend**: Express 5, Node.js 18–24
- **AI**: Anthropic SDK, OpenAI SDK, Google Gemini (via OpenAI compat layer)
- **Database**: PostgreSQL (cloud) / SQLite (local)
- **Auth**: Firebase, JWT
- **Payments**: Stripe, Coinbase Commerce
- **Deploy**: Render

---

## Intellectual Property

This software is proprietary to DarkWave Studios LLC.

**Patent Pending:**
- U.S. Pat. App. No. 64/032,339 — Lume-V: Deterministic Autonomous Infrastructure Governance Engine
- U.S. Pat. App. No. 64/047,512 — Lume Core: Deterministic Natural-Language Programming Language
- U.S. Pat. App. No. 64/047,467 — Axiom: Deterministic Zero-Assumption AI System
- U.S. Pat. App. No. 64/047,496 — Lume-X: Deterministic Multi-Agent Cognition Substrate
- U.S. Pat. App. No. 64/047,536 — Synthetic Organisms: Deterministic Self-Governing Cyber-Physical Constructs
- U.S. Pat. App. No. 64/056,378 — Meridian: Deterministic Wireless Energy Routing Architecture

© 2026 DarkWave Studios LLC. All rights reserved.
