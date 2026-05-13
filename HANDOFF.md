# Axiom Studio — Complete Handoff Document
## For AI Agent Continuation (Gemini or any LLM assistant)
## Created: 2026-05-13 by Antigravity (prior session)
## Author/Owner: Jason Andrews — DarkWave Studios LLC

---

> **CRITICAL**: Read this ENTIRE document before writing any code. This is a living product with production users. Do not break existing functionality. All changes must work on BOTH cloud (Vercel) and local (Electron) builds. Mobile-first design is mandatory.

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Repository & Architecture](#2-repository--architecture)
3. [What Has Been Completed](#3-what-has-been-completed)
4. [What Needs To Be Built](#4-what-needs-to-be-built)
5. [Detailed Feature Specifications](#5-detailed-feature-specifications)
6. [DOI Registry Task](#6-doi-registry-task)
7. [HydroCore Fix Status](#7-hydrocore-fix-status)
8. [Technical Configuration](#8-technical-configuration)
9. [Build & Deploy Instructions](#9-build--deploy-instructions)
10. [Design System & UI/UX Rules](#10-design-system--uiux-rules)
11. [Known Issues & Gotchas](#11-known-issues--gotchas)

---

## 1. PROJECT OVERVIEW

**Axiom Studio** is a cloud + desktop AI-powered IDE built by DarkWave Studios LLC. It supports multiple AI backends (Anthropic Claude, OpenAI GPT-4o) with an intelligent auto-router, file management, terminal execution, image generation, and a credit-based billing system.

**Related DarkWave products** (these have their own repos):
- **HydroCore** (`D:\hydrocore`, https://hydrocore.dev) — Deterministic hydraulic governance engine
- **Meridian Canon** (`D:\meridian`, https://meridiancanon.com) — Wireless energy routing architecture
- **Verdara-Eltra** (https://verdara-eltra.com) — Environmental governance
- **Lume** (https://lume-lang.org) — Natural language programming language
- **TrustGen** — AI image/3D generation (future integration)

**ORCID**: 0009-0007-5214-649X (Jason Andrews)

---

## 2. REPOSITORY & ARCHITECTURE

### Axiom Studio
- **Repo**: https://github.com/cryptocreeper94-sudo/axiom-studio.git
- **Local path**: `D:\axiom-studio\`
- **Installer output**: `D:\axiom-studio\release2\installer\Axiom Studio Setup.exe`

### Key Files
```
D:\axiom-studio\
├── server/
│   ├── agent-routes.ts      # Cloud API routes, auto-router, credit deduction
│   ├── agent-tools.ts       # Tool definitions (run_command, file ops, image gen)
│   ├── local-index.ts       # Local Express backend (Electron mode)
│   ├── tiers.ts             # Credit costs and tier structure
│   └── ...
├── electron/
│   ├── main.ts              # Electron entry point, spawns Express on port 5100
│   └── ...
├── src/                     # React frontend (Vite)
│   ├── components/
│   │   ├── MobileLayout.tsx  # Mobile-first IDE layout
│   │   └── ...
│   └── ...
├── build-installer.js       # NSIS-based Windows installer generator
├── package.json
└── ...
```

### Architecture
- **Cloud**: Next.js/Vite frontend → Vercel serverless → Anthropic/OpenAI APIs
- **Local**: Electron wraps the frontend + runs Express on port 5100 → user's own API keys
- **Auto-Router**: Cloud-only, uses GPT-4o-mini to classify task complexity and route to optimal model
- **Billing**: Stripe integration, credit-based per-message, tier system in `tiers.ts`
- **Tools**: File read/write, run_command (128KB maxBuffer), image generation (DALL-E 3), planning mode

### Environment Variables
- `AXIOM_LOCAL=true` — Enables local backend mode
- `IS_ELECTRON=true` — Electron desktop mode
- `NODE_ENV=production` — Production build flag

---

## 3. WHAT HAS BEEN COMPLETED

### Axiom Studio Core (DONE ✅)
- [x] Multi-agent support (Claude Opus, Sonnet, GPT-4o)
- [x] Auto-router (cloud-only, GPT-4o-mini classification)
- [x] Tool loop system (100-iteration limit, AbortSignal support)
- [x] Planning mode with markdown artifact rendering
- [x] Stripe billing and credit deduction
- [x] File management tools (read, write, list, search)
- [x] Terminal execution (run_command with 128KB maxBuffer)
- [x] Image generation (DALL-E 3)
- [x] Mobile IDE layout (MobileLayout component)
- [x] Electron desktop build + NSIS installer
- [x] Error handling fix: try/catch on Anthropic finalMessage() stream
- [x] Cloud run_command maxBuffer increased from 8KB to 128KB

### HydroCore Fix (DONE ✅ — PUSHED)
- [x] Component breakdown 3D modal lighting fix
  - `style.css`: comp-card-bg opacity 0.5→0.85, added brightness(1.4) filter
  - `vehicle3d.js`: Modal scene fog reduced, exposure 1.2→2.5, lighting rebuilt (AmbientLight + HemisphereLight 1.5x + DirectionalLight 1.8 + fill + rim), GLB materials get post-load brightness boost
  - Commit: `8ea3678` pushed to `main` on `D:\hydrocore`

### DOI Registry (PARTIAL — 42/96 catalogued)
- [x] Created `D:\darkwave\doi-registry.json` with 42 works from ORCID
- [ ] Remaining ~54 DOIs need to be added manually by Jason or via Zenodo API
- [ ] ORCID bulk upload script not yet written
- [ ] Website DOI listings not yet updated on meridiancanon.com, hydrocore.dev, verdara-eltra.com

### Zenodo Community Name Fix (DONE ✅ — by Jason manually)
- Community names were swapped, now corrected:
  - Canon 1 = "Lume Ecosystem — Architecture & Protocol Papers" (foundational)
  - Canon 2 = "Lume/DAIGS: Deterministic AI & Ecosystem" (domain papers)
  - Canon 3 = "The Lume Synthetic Organism Canon (L-SOC)" (Meridian + synthetic organism papers, 23 records)

---

## 4. WHAT NEEDS TO BE BUILT

### PRIORITY 1: Starter Hub / Project Wizard
Build a launch screen that replaces the current blank chat state. This is the biggest UX improvement needed.

### PRIORITY 2: Live Preview Pane
Split-panel code ↔ preview with swipeable toggle on mobile.

### PRIORITY 3: Voice Input for Lume
Microphone button for natural language → Lume code.

### PRIORITY 4: Project Persistence
Projects save state across sessions so users can resume.

### PRIORITY 5: Progress Tracker UI
Visual checklist that each starter generates, visible alongside chat.

### PRIORITY 6: Deploy Pipeline
One-tap export/deploy from within the IDE.

### PRIORITY 7: DOI Registry Completion
Finish the master DOI list and ORCID bulk upload.

### PRIORITY 8: Website DOI Updates
Add DOIs to paper listings on all three canon websites.

---

## 5. DETAILED FEATURE SPECIFICATIONS

### 5A. STARTER HUB (Launch Screen)

**Location**: This should be the default view when the user opens Axiom Studio and has no active conversation. Replace the current empty chat state.

**Layout (Mobile-First)**:
```
┌─────────────────────────┐
│  ⬡ AXIOM STUDIO         │
│  What will you build?    │
│                          │
│  ┌──────┐  ┌──────┐     │
│  │ 🏗️   │  │ 🎨   │     │
│  │Build │  │Anim- │     │
│  │an App│  │ation │     │
│  └──────┘  └──────┘     │
│  ┌──────┐  ┌──────┐     │
│  │ 🧊   │  │ 🗣️   │     │
│  │ 3D   │  │ Lume │     │
│  │Render│  │ App  │     │
│  └──────┘  └──────┘     │
│  ┌──────┐  ┌──────┐     │
│  │ 📋   │  │ 🐛   │     │
│  │Plan a│  │Debug │     │
│  │Proj. │  │ Code │     │
│  └──────┘  └──────┘     │
│                          │
│  ── or just start ──     │
│  [    Type anything   ]  │
│                          │
│  Built with Axiom ▸      │
│  (example gallery)       │
└─────────────────────────┘
```

**Each starter card does**:
1. Pre-fills the system prompt with domain-specific instructions
2. Auto-selects the best agent (skips auto-router)
3. Opens a new project workspace
4. Shows a guided checklist of steps
5. Sends an initial scaffolding message to the agent

**Starter definitions**:

```typescript
const STARTERS = [
  {
    id: 'build-app',
    icon: '🏗️',
    title: 'Build an App',
    subtitle: 'Web, mobile, or desktop',
    agent: 'sonnet', // or auto-route
    systemPrompt: `You are helping the user build a complete application from scratch. 
      Start by asking: What kind of app? (web/mobile/desktop) 
      Then: What framework? What features?
      Then scaffold the project and guide them step by step.`,
    checklist: ['Choose platform', 'Scaffold project', 'Build layout', 'Add features', 'Test', 'Deploy'],
    color: '#1565C0'
  },
  {
    id: 'animation',
    icon: '🎨',
    title: 'Animation',
    subtitle: 'CSS, JS, Lottie, SVG',
    agent: 'sonnet',
    systemPrompt: `You are an animation specialist. Help the user create stunning animations.
      Support CSS animations, GSAP, Lottie, SVG animations, and Canvas.
      Always provide live-previewable code.`,
    checklist: ['Choose animation type', 'Design keyframes', 'Build animation', 'Polish timing', 'Export'],
    color: '#E91E63'
  },
  {
    id: '3d-render',
    icon: '🧊',
    title: '3D Rendering',
    subtitle: 'Three.js + TrustGen',
    agent: 'opus',
    systemPrompt: `You are a 3D rendering expert using Three.js and WebGL.
      Help the user create 3D scenes, models, and interactive visualizations.
      When the user needs generated 3D assets, use the TrustGen API integration.`,
    checklist: ['Setup scene', 'Add geometry/models', 'Configure lighting', 'Add interactions', 'Optimize', 'Export'],
    color: '#00BCD4',
    requiresSubscription: 'trustgen' // Optional TrustGen tier
  },
  {
    id: 'lume-app',
    icon: '🗣️',
    title: 'Lume App',
    subtitle: 'Speak or type naturally',
    agent: 'opus',
    systemPrompt: `You are the Lume programming assistant. Lume is a deterministic natural-language 
      programming language created by DarkWave Studios. Help the user write Lume code by accepting 
      natural language descriptions (via text or voice) and translating them into valid Lume syntax.
      Reference: https://lume-lang.org`,
    checklist: ['Describe your app', 'Generate Lume code', 'Compile & test', 'Iterate', 'Deploy'],
    color: '#FF9800',
    enableVoice: true
  },
  {
    id: 'plan-project',
    icon: '📋',
    title: 'Plan a Project',
    subtitle: 'Architecture & specs',
    agent: 'opus',
    systemPrompt: `You are a senior software architect. Help the user plan their project from scratch.
      Generate: architecture diagrams (mermaid), tech stack recommendations, task breakdowns,
      database schemas, API specs, and implementation timelines.`,
    checklist: ['Define requirements', 'Choose architecture', 'Design schema', 'Plan tasks', 'Generate specs'],
    color: '#4CAF50'
  },
  {
    id: 'debug-code',
    icon: '🐛',
    title: 'Debug Code',
    subtitle: 'Paste, analyze, fix',
    agent: 'sonnet',
    systemPrompt: `You are an expert debugger. The user will paste code or describe a bug.
      Analyze the code thoroughly, identify the root cause, explain it clearly, and provide the fix.
      Always explain WHY the bug occurred, not just how to fix it.`,
    checklist: ['Paste/describe bug', 'Root cause analysis', 'Implement fix', 'Verify fix'],
    color: '#F44336'
  }
];
```

**Must work on both cloud and local builds.** On local, the agent selection uses the user's configured API key. On cloud, it uses the credit system.

---

### 5B. LIVE PREVIEW PANE

**What**: A split-panel view where code is on the left (or top on mobile) and a live iframe preview is on the right (or bottom).

**Mobile behavior**: 
- Swipeable tabs: Code | Preview | Chat
- Bottom toolbar with toggle buttons
- Preview auto-refreshes when the agent writes/modifies files

**Desktop behavior**:
- Resizable split panes
- Preview renders in a sandboxed iframe
- Hot-reload on file save

**Implementation notes**:
- Use a sandboxed iframe with srcdoc or blob URL
- For web projects, serve from the workspace directory
- Must work in Electron (local file serving) and cloud (virtual filesystem)

---

### 5C. VOICE INPUT FOR LUME

**What**: A microphone button in the chat input area that uses the Web Speech API (or Whisper API for better accuracy) to convert speech to text, then sends it to the Lume agent.

**Implementation**:
```typescript
// Use Web Speech API (free, works in Chrome/Edge)
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

// Or for higher accuracy, use Whisper API (costs credits)
// POST to /api/transcribe with audio blob
```

**UI**: 
- Pulsing microphone icon in the chat input bar
- Visual waveform while recording
- "Listening..." indicator
- Transcript appears in the input field before sending

---

### 5D. PROJECT PERSISTENCE

**What**: Each conversation/project saves its full state (files, chat history, checklist progress, agent config) so users can close the tab and resume later.

**Cloud**: Already partially handled by conversation storage. Need to add:
- Workspace file snapshots
- Checklist state
- Active starter config

**Local**: Save to `%APPDATA%/axiom-studio/projects/[project-id]/`

---

### 5E. PROGRESS TRACKER UI

**What**: A visual checklist sidebar/panel that shows the user's progress through the starter workflow.

**Design**:
```
┌─────────────────┐
│ 📋 BUILD AN APP │
│                 │
│ ✅ Scaffold     │
│ ✅ Layout       │
│ 🔄 Auth (now)   │
│ ⬜ Database     │
│ ⬜ Deploy       │
│                 │
│ Progress: 40%   │
│ ████░░░░░░      │
└─────────────────┘
```

**Mobile**: Collapsible top bar or swipe-left panel.

**Agent integration**: The agent can update checklist state by emitting structured tool calls:
```json
{ "tool": "update_checklist", "item": "Add authentication", "status": "complete" }
```

---

### 5F. DEPLOY PIPELINE

**Phase 1 (v1)**:
- Export as ZIP
- Push to Axiom Depot
- Copy shareable preview link

**Phase 2 (future)**:
- One-click deploy to Vercel/Netlify
- DarkWave hosted domains

---

### 5G. EXAMPLE GALLERY

**What**: A horizontal scrollable carousel on the Starter Hub showing 6-8 example projects built with Axiom Studio.

**Each example shows**:
- Screenshot/thumbnail
- Title
- "Built with [Starter Name]"
- Tap to view source or fork

**Can be static initially** — just curated screenshots with descriptions. No backend needed for v1.

---

### 5H. ONBOARDING CREDITS

**What**: New users get 50-100 free credits on signup so they can complete one full starter flow without paying.

**Implementation**: In the user creation flow (Stripe/auth), set initial credit balance. Already have the credit system in `tiers.ts`.

---

## 6. DOI REGISTRY TASK

### Current State
- `D:\darkwave\doi-registry.json` exists with 42 papers (from ORCID)
- Need ~54 more DOIs to reach 96 total
- Jason may complete this manually

### What Still Needs To Happen
1. **Complete the registry**: Add remaining DOIs. They can be found by:
   - Browsing Zenodo communities (search "DarkWave Studios" or "Lume")
   - Three communities exist (names now corrected):
     - Canon 1: "Lume Ecosystem — Architecture & Protocol Papers"
     - Canon 2: "Lume/DAIGS: Deterministic AI & Ecosystem"  
     - Canon 3: "The Lume Synthetic Organism Canon (L-SOC)" — 23 papers

2. **ORCID Bulk Upload Script**: Write a Node.js script that:
   - Reads `D:\darkwave\doi-registry.json`
   - Authenticates with ORCID API (needs OAuth token from Jason)
   - For each DOI not already on ORCID, POSTs a work entry
   - ORCID API docs: https://info.orcid.org/documentation/api-tutorials/
   - ORCID ID: `0009-0007-5214-649X`

3. **Website Updates**: Add DOI links to paper listing sections on:
   - `meridiancanon.com` (paper section)
   - `hydrocore.dev` (papers section — currently shows "DOI: Pending Zenodo")
   - `verdara-eltra.com` (paper section)

### Registry Structure (in doi-registry.json)
```json
{
  "_meta": { "totalPapers": 96, "catalogued": 42 },
  "canon1": { "papers": [...] },  // Foundational
  "canon2": { "papers": [...] },  // Domain L-SOC
  "canon3": { "papers": [...] }   // Meridian + Synthetic Organism
}
```

Ordered by **canonical importance** (not chronologically).

---

## 7. HYDROCORE FIX STATUS

### COMPLETED AND PUSHED ✅

**Problem**: Component breakdown cards in the Steam section of hydrocore.dev were nearly black — 3D GLB models in the modal viewer were invisible.

**Root cause**: Triple darkness — dark source images at 50% opacity + near-black card background + weak 3D scene lighting (HemisphereLight dim, DirectionalLight 0.8, exposure 1.2, heavy fog).

**Fix applied** (commit `8ea3678`, pushed to `main`):
- `style.css`: `.comp-card-bg` opacity 0.5→0.85, filter brightness(1.4)
- `vehicle3d.js` Scene 5 (Component Modal):
  - Fog: 0.05 → 0.015
  - Exposure: 1.2 → 2.5
  - Added AmbientLight, boosted HemisphereLight, DirectionalLight 0.8→1.8
  - Added fill light + rim light
  - GLB materials: post-load envMapIntensity, emissiveIntensity, roughness cap

**Verify**: Visit hydrocore.dev → scroll to Steam section → tap a component card → the 3D model should now be clearly visible and well-lit.

---

## 8. TECHNICAL CONFIGURATION

### Axiom Studio
- **Frontend**: React + Vite (TypeScript)
- **Cloud Backend**: Vercel serverless functions
- **Local Backend**: Express on port 5100 via Electron main process
- **AI**: Anthropic Claude (Opus/Sonnet), OpenAI GPT-4o/4o-mini
- **Billing**: Stripe
- **Auth**: (check current implementation)
- **Build**: `npm run build` for web, `npm run electron:build` for desktop

### HydroCore
- **Stack**: Static HTML/CSS/JS + Three.js r128
- **Hosting**: GitHub Pages or Vercel (from repo)
- **Repo**: https://github.com/cryptocreeper94-sudo/hydrocore.git
- **Local**: `D:\hydrocore\`

### Three.js version note
HydroCore uses Three.js **r128** loaded via CDN. This version makes position/rotation/scale read-only on Object3D. The `assignProps()` helper function in index.html handles this with try/catch + `.copy()`.

---

## 9. BUILD & DEPLOY INSTRUCTIONS

### Axiom Studio — Cloud
```bash
cd D:\axiom-studio
npm install
npm run build
# Deploy via Vercel CLI or git push
```

### Axiom Studio — Desktop (Electron)
```bash
cd D:\axiom-studio
npm run build
npm run electron:package    # Creates unpacked app
node build-installer.js     # Creates NSIS installer
# Output: D:\axiom-studio\release2\installer\Axiom Studio Setup.exe
```

### HydroCore
```bash
cd D:\hydrocore
git add -A; git commit -m "message"; git push origin main
# Auto-deploys via GitHub Pages / Vercel webhook
```

---

## 10. DESIGN SYSTEM & UI/UX RULES

### MANDATORY
1. **Mobile-first** — Design for 375px width first, then scale up
2. **Dark mode by default** — Background: `#04060c` to `#0c1220` range
3. **Font stack**: Inter (body), JetBrains Mono (code/monospace)
4. **Color palette**:
   - Primary cyan: `#00E5FF`
   - Blue: `#1565C0`
   - Teal: `#00695C`
   - Amber: `#FFC107`
   - Red: `#B71C1C` (destructive/error)
   - Grey: `#607D8B`
5. **Glassmorphism**: Use `backdrop-filter: blur()` on overlays
6. **Micro-animations**: All interactive elements must have transitions (0.2-0.4s)
7. **Border radius**: 10-16px for cards, 8-12px for buttons
8. **No plain/boring UI** — Everything should feel premium and polished
9. **Touch targets**: Minimum 44px × 44px on mobile
10. **Safe area insets**: Respect `env(safe-area-inset-*)` for notched devices

### Component Patterns (match existing HydroCore/Axiom style)
- Cards: `background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.06)`
- Hover: `transform: translateY(-3px)`, `box-shadow` with accent color at low opacity
- Badges: Small rounded pills with accent border and background at 6% opacity
- Buttons: Gradient backgrounds with shimmer animation on hover

---

## 11. KNOWN ISSUES & GOTCHAS

1. **PowerShell `&&`**: Windows PowerShell doesn't support `&&`. Use `;` instead for command chaining.

2. **Three.js r128 read-only properties**: Can't use `Object.assign()` for position/rotation/scale. Use the `assignProps()` helper or `.copy()`.

3. **Auto-router is cloud-only**: Local Electron users default to whatever model they've selected. Don't assume auto-routing works in local mode.

4. **Zenodo API**: The new InvenioRDM-based Zenodo API limits unauthenticated requests to 25 results per page. For bulk operations, you need an API token.

5. **ORCID API**: Requires OAuth 2.0 token for write operations. Jason needs to generate one at https://orcid.org/developer-tools.

6. **HydroCore GLB models**: Some GLBs are very small (e.g., `battery.glb` is 2KB, `electrolyzer.glb` is 2KB) — these are likely placeholder/minimal geometry. The larger ones (boiler 95KB, superheater 144KB, turbine 139KB) are real models.

7. **Credit system**: Changes to billing/credits in `tiers.ts` affect real money. Be careful.

8. **Electron + Express**: The local backend runs Express inside Electron's main process. Any crash in the Express server takes down the whole app.

---

## EXECUTION ORDER (for the AI agent picking this up)

1. **Read and understand** `D:\axiom-studio\src\` to see current component structure
2. **Build the Starter Hub** component (Section 5A) — this is the highest impact feature
3. **Add to both cloud and local** entry points
4. **Build the Progress Tracker** (Section 5E) — pairs with starters
5. **Add Voice Input** (Section 5C) — especially for Lume starter
6. **Build Live Preview** (Section 5B) — most complex, do after starters work
7. **Test on mobile** — every feature must work on 375px screens
8. **Build and verify** both cloud and Electron builds
9. **Handle DOI/ORCID tasks** (Section 6) if time permits

---

*End of handoff. Good luck. Make it beautiful.*
