# Axiom Studio

**The AI IDE That Lives On Your Machine**

[![npm](https://img.shields.io/npm/v/axiom-studio?color=06b6d4&label=npm)](https://npmjs.com/package/axiom-studio)
[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Multi-agent AI coding environment with full filesystem access. Use in the cloud or install locally — same agents, same power.

---

## Quick Start

### Cloud (instant, any device)
Go to **[axiomstudio.dev](https://axiomstudio.dev)** — sign in and start coding.

### Local (full power)
```bash
npx axiom-studio
```
Requires Node.js 18+. Browser opens automatically. Full filesystem access, real terminal, native git.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent AI** | Claude Opus, Sonnet, GPT-4o, o3-mini — switch models mid-conversation |
| **Full IDE** | Monaco editor, file explorer, syntax highlighting for 50+ languages |
| **Real Terminal** | Not a sandbox — run git, npm, python, anything |
| **Native Git** | Push, pull, branch directly from the IDE |
| **Local Mode** | Full filesystem access via `npx axiom-studio` |
| **Cloud Mode** | Browser-based, works on mobile, tablet, desktop |
| **Credit System** | Pay-per-use, no subscriptions. Same credits work cloud and local |
| **OAuth** | Google, GitHub, Trust Layer SSO |
| **Enterprise Security** | Biometric auth, encrypted tokens, code stays local |

## AI Agents

| Agent | Model | Credits |
|-------|-------|---------|
| Opus | `claude-opus-4-7` | 3 / message |
| Sonnet | `claude-sonnet-4-20250514` | 1 / message |
| GPT-4o | `gpt-4o` | 2 / message |
| o3-mini | `o3-mini` | 1 / message |

## Architecture

```
Cloud (axiomstudio.dev)          Local (npx axiom-studio)
├── PostgreSQL files             ├── Real filesystem (disk)
├── Firebase auth                ├── Auto-login (owner)
├── Stripe billing               ├── Credit-check proxy
├── Cloud terminal               ├── Local PowerShell/bash
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
- **Backend**: Express 5, Node.js 22
- **AI**: Anthropic SDK, OpenAI SDK
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

© 2026 DarkWave Studios LLC. All rights reserved.
