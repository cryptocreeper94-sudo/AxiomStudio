/**
 * EcosystemAccountHub V3 — Trust Layer Identity Panel
 * =====================================================
 * Self-contained, zero-dependency React component.
 * Works in any Trust Layer ecosystem app (React JSX or TSX).
 *
 * Features:
 * - Live identity fetch from trusthub.tlid.io/api/user/ecosystem-identity
 * - Profile avatar with upload CTA
 * - TLID domain, Ecosystem ID (uniqueHash), copyable referral code
 * - Affiliate tier + stats (referrals, earned SIG)
 * - Presale SIG balance widget
 * - Member tier badge (Founder / Premium / Standard)
 * - Rotating weekly bonus
 * - Ecosystem app quick-links
 * - Theme-aware (works in light + dark mode)
 * - Mobile-first, full-screen panel on mobile
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────
const HUB      = 'https://trusthub.tlid.io';
const DWTL     = 'https://dwtl.io';
const PRESALE  = 'https://dwtl.io/presale';
const IDENTITY_API = `${HUB}/api/user/ecosystem-identity`;

// Session token keys (checked in priority order)
const TOKEN_KEYS = ['dwtl_session_token', 'tl_session_token', 'trustlayer_token', 'hub_session_token'];

// Fallback user keys from localStorage snapshot
const USER_KEYS  = ['dwtl_user', 'tl_user', 'trustlayer_user', 'user', 'auth_user', 'eco_user'];

// ── Weekly bonus rotation ──────────────────────────────────────────────────────
const BONUSES = [
  { id:'chronicles', app:'Chronicles',   icon:'📜', headline:'Legacy Founders Drive',  reward:'Refer a friend to Chronicles',  sig:500,  mult:'2×', perk:'Founder Badge',   url:'https://yourlegacy.io/chronicles/login', ac:'#06b6d4', gl:'rgba(6,182,212,0.07)',  s:'2026-03-24', e:'2026-04-07' },
  { id:'orbit',      app:'ORBIT',         icon:'🌐', headline:'ORBIT Member Drive',     reward:'Onboard someone to ORBIT',      sig:1000, mult:'3×', perk:'Hallmark boost',  url:'https://orbitstaffing.io',               ac:'#0ea5e9', gl:'rgba(14,165,233,0.07)', s:'2026-04-07', e:'2026-04-21' },
  { id:'trustgen',   app:'TrustGen 3D',   icon:'🎨', headline:'Creator Collective',     reward:'Bring 3 users to TrustGen',     sig:750,  mult:'2×', perk:'3D asset pack',   url:'https://trustgen.design',       ac:'#f43f5e', gl:'rgba(244,63,94,0.07)',  s:'2026-04-21', e:'2026-05-05' },
  { id:'bomber',     app:'Bomber 3D',     icon:'⛳', headline:'Long Drive Challenge',   reward:'Invite players',                sig:300,  mult:'2×', perk:'Pro skin',         url:'https://bombergolf.tlid.io',                 ac:'#10b981', gl:'rgba(16,185,129,0.07)', s:'2026-05-05', e:'2026-05-19' },
  { id:'vault',      app:'TrustVault',    icon:'🔐', headline:'Secure the Network',     reward:'Refer friends to TrustVault',   sig:600,  mult:'2×', perk:'Vault tier',       url:'https://trustvault.studio',             ac:'#06b6d4', gl:'rgba(6,182,212,0.07)',  s:'2026-05-19', e:'2026-06-02' },
  { id:'void',       app:'THE VOID',      icon:'🕳️', headline:'Void Explorers Drive',  reward:'Bring friends to The Void',     sig:400,  mult:'2×', perk:'Void skin',        url:'https://intothevoid.app',                ac:'#0ea5e9', gl:'rgba(14,165,233,0.07)', s:'2026-06-02', e:'2026-06-16' },
  { id:'lotops',     app:'Lot Ops Pro',   icon:'🚗', headline:'Fleet Expansion Drive',  reward:'Onboard a dealership',          sig:1500, mult:'5×', perk:'Analytics pack',   url:'https://lotopspro.io',                   ac:'#f59e0b', gl:'rgba(245,158,11,0.07)', s:'2026-06-16', e:'2026-06-30' },
  { id:'lume',       app:'Lume',          icon:'💡', headline:'Language Pioneers',      reward:'Invite developers to Lume',     sig:500,  mult:'2×', perk:'Early access',     url:'https://lume-lang.org',                  ac:'#06b6d4', gl:'rgba(6,182,212,0.07)',  s:'2026-06-30', e:'2026-07-14' },
];

function getBonus() {
  const t = new Date().toISOString().split('T')[0];
  const m = BONUSES.find(b => t >= b.s && t < b.e);
  if (m) return m;
  const w = Math.ceil(((Date.now() - new Date(new Date().getFullYear(),0,1).getTime()) / 864e5 + new Date().getDay() + 1) / 7);
  return BONUSES[w % BONUSES.length];
}

function timeLeft(b: typeof BONUSES[0]) {
  const d = new Date(b.e).getTime() - Date.now();
  if (d <= 0) return 'Ending soon';
  const days = Math.floor(d / 864e5);
  return days > 1 ? `${days} days left` : `${Math.floor((d % 864e5) / 36e5)}h left`;
}

// ── Ecosystem app grid ─────────────────────────────────────────────────────────
const APPS = [
  // Core Platform
  { n:'Trust Layer', u:'https://dwtl.io',               i:'🌊' },
  { n:'Trust Hub',   u:'https://trusthub.tlid.io',      i:'🛡️' },
  { n:'TLID',        u:'https://tlid.io',               i:'🔗' },
  { n:'TrustVault',  u:'https://trustvault.studio',     i:'🔐' },
  { n:'TrustShield', u:'https://trustshield.tech',      i:'🛡️' },
  { n:'DWSC',        u:'https://dwsc.io',               i:'◈'  },
  { n:'Trust Home',  u:'https://trusthome.tlid.io',     i:'🏠' },
  { n:'Academy',     u:'https://academy.tlid.io',       i:'🎓' },
  // AI & Development
  { n:'Axiom',       u:'https://axiom42.com',            i:'🧠' },
  { n:'Axiom Studio',u:'https://axiomstudio.dev',        i:'💻' },
  { n:'Pulse',       u:'https://darkwavepulse.com',      i:'📈' },
  { n:'Lume',        u:'https://lume-lang.org',          i:'💡' },
  { n:'Lume42',      u:'https://lume42.com',             i:'⚡' },
  { n:'Lume-Cortex', u:'https://lume-cortex.com',        i:'🧬' },
  { n:'SignalCast',  u:'https://signalcast.tlid.io',     i:'📡' },
  // Creative & Publishing
  { n:'TrustGen',    u:'https://trustgen.design',        i:'🎨' },
  { n:'Trust Book',  u:'https://trustbook.tlid.io',      i:'📚' },
  { n:'DWStudios',   u:'https://darkwavestudios.io',     i:'🎛️' },
  // Entertainment & Gaming
  { n:'Chronicles',  u:'https://yourlegacy.io',          i:'📜' },
  { n:'THE VOID',    u:'https://intothevoid.app',        i:'🕳️' },
  { n:'Arcade',      u:'https://darkwavegames.io',       i:'🕹️' },
  { n:'Bomber Golf', u:'https://bombergolf.tlid.io',     i:'⛳' },
  { n:'Veil',        u:'https://throughtheveil.tlid.io',  i:'🌀' },
  // Enterprise & Staffing
  { n:'ORBIT',       u:'https://orbitstaffing.io',       i:'🌐' },
  { n:'Orby',        u:'https://getorby.io',             i:'📋' },
  // Automotive
  { n:'GarageBot',   u:'https://garagebot.io',           i:'🔧' },
  { n:'Lume Auto',   u:'https://lumeauto.tech',          i:'🚗' },
  { n:'Driver',      u:'https://driver.tlid.io',         i:'🚛' },
  { n:'TL DrvConn',  u:'https://tldriverconnect.com',    i:'🔌' },
  // Services & Lifestyle
  { n:'PaintPros',   u:'https://paintpros.io',           i:'🎨' },
  { n:'Trust Golf',  u:'https://trustgolf.app',          i:'🏌️' },
  { n:'VedaSolus',   u:'https://vedasolus.io',           i:'🧘' },
  { n:'Brew&Board',  u:'https://brewandboard.coffee',    i:'☕' },
  { n:'HappyEats',   u:'https://happyeats.app',          i:'🍔' },
  // Outdoor & Nature
  { n:'Verdara',     u:'https://verdara.tlid.io',        i:'🌿' },
  { n:'Arbora',      u:'https://arbora.tlid.io',         i:'🌳' },
  { n:'VerdUltra',   u:'https://verdaraultra.com',       i:'🏔️' },
  { n:'HydroCore',   u:'https://hydrocore.com',          i:'💧' },
  // Analytics & Education
  { n:'LumeLine',    u:'https://lumeline.bet',            i:'📊' },
  { n:'Meridian',    u:'https://meridiancanon.com',       i:'📖' },
  { n:'Screener',    u:'https://dwtl.io/guardian-ai',     i:'🔍' },
  { n:'AxiomDepot', u:'https://axiomdepot.com',           i:'📦' },
];
const APPS_PER_PAGE = 8;
const APP_TOTAL_PAGES = Math.ceil(APPS.length / APPS_PER_PAGE);

// ── Helpers ────────────────────────────────────────────────────────────────────
function getStoredToken(): string | null {
  for (const k of TOKEN_KEYS) {
    try { const v = localStorage.getItem(k); if (v) return v; } catch {}
  }
  return null;
}

function getStoredUserSnapshot(): any {
  for (const k of USER_KEYS) {
    try {
      const r = localStorage.getItem(k);
      if (r) {
        const d = JSON.parse(r);
        if (d && (d.name || d.email || d.username || d.displayName)) return d;
      }
    } catch {}
  }
  return null;
}

function toInitials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
}

const TIER_COLORS: Record<string, {bg: string, text: string, label: string}> = {
  founder:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', label: '🏅 Founder'  },
  premium:  { bg: 'rgba(14,165,233,0.12)',  text: '#7dd3fc', label: '💎 Premium'  },
  standard: { bg: 'rgba(6,182,212,0.10)',   text: '#67e8f9', label: '✓ Standard'  },
  free:     { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.35)', label: 'Free' },
};

const AFFILIATE_TIER_COLORS: Record<string,string> = {
  Diamond: '#67e8f9', Platinum: '#c4b5fd', Gold: '#fbbf24', Silver: '#d1d5db', Base: 'rgba(255,255,255,0.4)',
};

// ── Mobile detection ───────────────────────────────────────────────────────────
const isMob = typeof window !== 'undefined' && window.innerWidth <= 640;

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  trigger: (open: boolean) => ({
    position: 'fixed' as const, top: 14, right: 16, zIndex: 9998,
    width: 38, height: 38, borderRadius: '50%',
    border: `2px solid ${open ? '#06b6d4' : 'rgba(6,182,212,0.35)'}`,
    background: 'linear-gradient(135deg,rgba(8,10,18,0.92),rgba(8,10,18,0.92))',
    backdropFilter: 'blur(20px)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, color: 'rgba(255,255,255,0.85)',
    boxShadow: open ? '0 0 20px rgba(6,182,212,0.3)' : '0 4px 20px rgba(0,0,0,0.4)',
    padding: 0, outline: 'none', transition: 'all 0.2s ease',
  }),
  backdrop: { position: 'fixed' as const, inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' },
  panel: {
    position: 'fixed' as const, top: 0, right: 0, zIndex: 9999,
    width: isMob ? '100vw' : 380, maxWidth: '100vw', height: '100dvh',
    background: 'linear-gradient(180deg,rgba(6,8,16,0.99),rgba(2,4,10,0.995))',
    borderLeft: isMob ? 'none' : '1px solid rgba(6,182,212,0.12)',
    backdropFilter: 'blur(60px)', overflowY: 'auto' as const,
    display: 'flex', flexDirection: 'column' as const, overscrollBehavior: 'contain' as const,
    fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
  },
  drag: { display: isMob ? 'flex' : 'none', justifyContent: 'center', padding: '10px 0 4px' },
  dragBar: { width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' },
  hdr: { padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 },
  av: (url?: string | null) => ({
    width: 48, height: 48, borderRadius: '50%',
    border: '2px solid rgba(6,182,212,0.25)',
    overflow: 'hidden' as const, flexShrink: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(14,165,233,0.08))',
    boxShadow: '0 0 20px rgba(6,182,212,0.10)',
    fontSize: 18, fontWeight: 800, color: '#67e8f9',
    position: 'relative' as const,
  }),
  avImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  avEditHint: {
    position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, color: '#fff', opacity: 0, transition: 'opacity 0.2s',
    borderRadius: '50%',
  },
  nm: { fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  em: { fontSize: 10, color: 'rgba(6,182,212,0.55)', fontFamily: "'JetBrains Mono',monospace", marginTop: 1 },
  tlid: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  close: {
    width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, flexShrink: 0, padding: 0, outline: 'none', marginLeft: 'auto' as const,
  },
  tierBadge: (tier: string) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
    letterSpacing: '0.06em', marginTop: 3,
    background: TIER_COLORS[tier]?.bg || TIER_COLORS.free.bg,
    color: TIER_COLORS[tier]?.text || TIER_COLORS.free.text,
    border: `1px solid ${TIER_COLORS[tier]?.text || 'rgba(255,255,255,0.06)'}22`,
  }),
  // Identity section
  idSec: { margin: '0 14px 0', padding: '12px 14px', borderRadius: 12, background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.08)', marginBottom: 2 },
  idRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  idLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', width: 68, flexShrink: 0 },
  idValue: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono',monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  copyBtn: { background: 'none', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 5, padding: '1px 6px', fontSize: 9, color: '#67e8f9', cursor: 'pointer', flexShrink: 0, fontWeight: 700 },
  // Affiliate section
  affSec: { margin: '0 14px', padding: '10px 14px', borderRadius: 12, background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.08)', marginBottom: 2 },
  affHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  affTier: (tier: string) => ({ fontSize: 11, fontWeight: 800, color: AFFILIATE_TIER_COLORS[tier] || '#fff' }),
  affStats: { display: 'flex', gap: 12 },
  affStat: { display: 'flex', flexDirection: 'column' as const, gap: 1 },
  affStatNum: { fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.88)' },
  affStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  affCta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' },
  affLink: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'linear-gradient(135deg,rgba(14,165,233,0.15),rgba(6,182,212,0.10))', border: '1px solid rgba(14,165,233,0.2)', fontSize: 11, fontWeight: 700, color: '#7dd3fc', cursor: 'pointer', textDecoration: 'none' as const },
  // Bonus
  bonus: (b: typeof BONUSES[0]) => ({ margin: '12px 14px 0', padding: 14, borderRadius: 14, border: '1px solid rgba(6,182,212,0.10)', background: `linear-gradient(135deg,${b.gl},rgba(0,0,0,0.08))`, position: 'relative' as const, overflow: 'hidden' }),
  bLbl: (ac: string) => ({ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 8, color: ac }),
  bDot: (ac: string) => ({ width: 5, height: 5, borderRadius: '50%', background: ac }),
  bHead: { fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.92)', marginBottom: 3 },
  bRew: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.4 },
  bStats: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 10 },
  bSig: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 7, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', fontSize: 11, fontWeight: 900, color: '#67e8f9', fontFamily: "'JetBrains Mono',monospace" },
  bMult: { display: 'inline-flex', padding: '3px 7px', borderRadius: 7, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', fontSize: 10, fontWeight: 900, color: '#7dd3fc' },
  bPerk: { display: 'inline-flex', padding: '3px 7px', borderRadius: 7, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', fontSize: 9, fontWeight: 700, color: '#6ee7b7' },
  bTimer: { fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 },
  bCta: (ac: string) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: isMob ? '13px 0' : '10px 0', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' as const, border: 'none', cursor: 'pointer', minHeight: isMob ? 48 : 42, background: `linear-gradient(135deg,${ac},#0ea5e9)` }),
  // Wallet
  walSec: { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.025)' },
  walRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' },
  walIcon: { width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 },
  walTitle: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.72)' },
  walSub: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 },
  pill: (c: 'cyan' | 'green' | 'purple') => {
    const m = { cyan: ['rgba(6,182,212,0.08)','rgba(6,182,212,0.15)','#67e8f9'], green: ['rgba(16,185,129,0.08)','rgba(16,185,129,0.15)','#6ee7b7'], purple: ['rgba(14,165,233,0.08)','rgba(14,165,233,0.15)','#7dd3fc'] }[c];
    return { padding: '2px 7px', borderRadius: 5, background: m[0], border: `1px solid ${m[1]}`, fontSize: 9, fontWeight: 800, color: m[2] };
  },
  // Section header
  secLbl: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', marginBottom: 8 },
  // App grid
  carouselWrap: { overflow: 'hidden', touchAction: 'pan-y' },
  carouselTrack: (page: number) => ({ display: 'flex', transform: `translateX(${-page * 100}%)`, transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)', willChange: 'transform' as const }),
  carouselPage: { minWidth: '100%', display: 'flex', flexWrap: 'wrap' as const, gap: 5, padding: '0 2px' },
  carouselControls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  carouselArrow: (disabled: boolean) => ({
    background: 'none', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 6,
    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: (disabled ? 'default' : 'pointer') as const, padding: 0, outline: 'none',
    color: disabled ? 'rgba(255,255,255,0.12)' : '#67e8f9', fontSize: 14, lineHeight: 1,
    opacity: disabled ? 0.4 : 1, transition: 'all 0.15s',
  }),
  carouselDot: (active: boolean) => ({
    width: active ? 18 : 6, height: 6, borderRadius: 3,
    background: active ? '#06b6d4' : 'rgba(255,255,255,0.15)',
    border: 'none', cursor: 'pointer' as const, padding: 0, outline: 'none',
    transition: 'all 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',
  }),
  appBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, minHeight: 30, transition: 'all 0.15s' },
  // Settings row
  setRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', textDecoration: 'none' as const, color: 'rgba(255,255,255,0.55)', transition: 'all 0.15s', borderRadius: 10, margin: '0 4px' },
  setIcon: { width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 },
  setTitle: { fontSize: 12, fontWeight: 600 },
  setSub: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 1 },
  // Connect screen
  conn: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 14, padding: '32px 24px', textAlign: 'center' as const },
  connBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: isMob ? '14px 36px' : '12px 28px', borderRadius: 999, background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', color: '#fff', fontSize: isMob ? 14 : 13, fontWeight: 700, textDecoration: 'none' as const, border: 'none', cursor: 'pointer', minHeight: isMob ? 48 : 44 },
  ft: { marginTop: 'auto' as const, padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.025)', fontSize: 9, color: 'rgba(255,255,255,0.12)', textAlign: 'center' as const },
  ftL: { color: 'rgba(6,182,212,0.4)', textDecoration: 'none' as const },
};

// ── Component ──────────────────────────────────────────────────────────────────
export function EcosystemAccountHub() {
  const [open, setOpen]         = useState(false);
  const [appPage, setAppPage] = useState(0);
  const [identity, setIdentity] = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const bonus = getBonus();
  const [tLeft, setTLeft]       = useState(() => timeLeft(bonus));
  const panelRef                = useRef<HTMLDivElement>(null);

  // ── Timer countdown
  useEffect(() => {
    const iv = setInterval(() => setTLeft(timeLeft(bonus)), 60000);
    return () => clearInterval(iv);
  }, [bonus]);

  // ── Fetch live identity from trusthub when panel opens
  useEffect(() => {
    if (!open) return;
    const token = getStoredToken();
    if (!token) {
      // Try localStorage snapshot as fallback
      const snap = getStoredUserSnapshot();
      if (snap) setIdentity({ displayName: snap.displayName || snap.name || snap.username, email: snap.email, avatarUrl: snap.avatar || snap.avatarUrl });
      return;
    }
    setLoading(true);
    fetch(IDENTITY_API, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setIdentity(data); })
      .catch(() => {
        const snap = getStoredUserSnapshot();
        if (snap) setIdentity({ displayName: snap.displayName || snap.name || snap.username, email: snap.email, avatarUrl: snap.avatar || snap.avatarUrl });
      })
      .finally(() => setLoading(false));
  }, [open]);

  // ── Keyboard + scroll lock
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open]);

  const toggle = useCallback(() => setOpen(o => !o), []);
  const close  = useCallback(() => setOpen(false), []);

  const redir = (() => { try { return encodeURIComponent(window.location.origin); } catch { return ''; } })();

  async function copyToClipboard(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const bonusRef = identity?.referralCode
    ? `${bonus.url}${bonus.url.includes('?') ? '&' : '?'}${bonus.id === 'chronicles' ? 'ref' : 'ref'}=${identity.referralCode}&bonus=${bonus.id}`
    : bonus.url;

  const displayName = identity?.displayName || identity?.username || null;
  const email       = identity?.email || null;
  const avatarUrl   = identity?.avatarUrl || null;
  const tlid        = identity?.tlid || null;
  const uniqueHash  = identity?.uniqueHash || null;
  const refCode     = identity?.referralCode || identity?.uniqueHash || null;
  const refLink     = identity?.referralLink || (uniqueHash ? `${HUB}/ref/${uniqueHash}` : null);
  const memberTier  = identity?.memberTier || 'free';
  const affTier     = identity?.affiliateTier || { name: 'Base', commissionRate: 10 };
  const affStats    = identity?.affiliateStats || { totalReferrals: 0, convertedReferrals: 0, totalEarnings: 0 };
  const isLoggedIn  = !!identity;
  const token       = getStoredToken();

  return (
    <>
      {/* Trigger button */}
      <button
        style={S.trigger(open)}
        onClick={toggle}
        aria-label="Ecosystem Account Hub"
        data-testid="btn-ecosystem-hub"
      >
        {avatarUrl ? (
          <img style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} src={avatarUrl} alt="" />
        ) : displayName ? (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#67e8f9' }}>{toInitials(displayName)}</span>
        ) : '👤'}
      </button>

      {/* Backdrop */}
      {open && <div style={S.backdrop} onClick={close} />}

      {/* Panel */}
      {open && (
        <div style={S.panel} ref={panelRef}>
          {/* Mobile drag handle */}
          <div style={S.drag}><div style={S.dragBar} /></div>

          {/* Header — profile */}
          <div style={S.hdr}>
            <a
              href={`${HUB}/profile-editor`}
              target="_blank"
              rel="noopener noreferrer"
              style={S.av(avatarUrl)}
              title="Edit profile photo"
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
            >
              {avatarUrl ? (
                <img style={S.avImg} src={avatarUrl} alt="Profile" />
              ) : displayName ? (
                toInitials(displayName)
              ) : '👤'}
              <div style={{ ...S.avEditHint, opacity: avatarHover ? 1 : 0 }}>✏️</div>
            </a>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.nm}>{loading ? 'Loading…' : displayName || 'Trust Layer'}</div>
              {email && <div style={S.em}>{email}</div>}
              {tlid && <div style={S.tlid}>{tlid}</div>}
              {isLoggedIn && (
                <div style={S.tierBadge(memberTier)}>
                  {TIER_COLORS[memberTier]?.label || 'Free'}
                </div>
              )}
            </div>
            <button style={S.close} onClick={close} aria-label="Close">✕</button>
          </div>

          {/* ── LOGGED IN ─────────────────────────────────────────── */}
          {isLoggedIn ? (
            <>
              {/* Identity Section */}
              {(uniqueHash || tlid) && (
                <div style={{ margin: '10px 14px 2px' }}>
                  <div style={S.secLbl}>Identity</div>
                  <div style={S.idSec}>
                    {tlid && (
                      <div style={S.idRow}>
                        <span style={S.idLabel}>TLID</span>
                        <span style={S.idValue}>{tlid}</span>
                        <button style={S.copyBtn} onClick={() => copyToClipboard(tlid, 'tlid')}>
                          {copied === 'tlid' ? '✓' : '📋'}
                        </button>
                      </div>
                    )}
                    {uniqueHash && (
                      <div style={{ ...S.idRow, marginBottom: 0 }}>
                        <span style={S.idLabel}>Eco ID</span>
                        <span style={{ ...S.idValue, fontSize: 10 }}>{uniqueHash.slice(0, 8)}…</span>
                        <button style={S.copyBtn} onClick={() => copyToClipboard(uniqueHash, 'hash')}>
                          {copied === 'hash' ? '✓' : '📋'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Affiliate Section */}
              {refCode && (
                <div style={{ margin: '0 14px 2px' }}>
                  <div style={S.secLbl}>Affiliate & Referrals</div>
                  <div style={S.affSec}>
                    <div style={S.affHeader}>
                      <div>
                        <div style={S.affTier(affTier.name)}>
                          {affTier.name} · {affTier.commissionRate}% commission
                        </div>
                      </div>
                      <span style={S.pill('purple')}>Affiliate</span>
                    </div>
                    <div style={S.affStats}>
                      <div style={S.affStat}>
                        <span style={S.affStatNum}>{affStats.totalReferrals}</span>
                        <span style={S.affStatLabel}>Referrals</span>
                      </div>
                      <div style={S.affStat}>
                        <span style={S.affStatNum}>{affStats.convertedReferrals}</span>
                        <span style={S.affStatLabel}>Converted</span>
                      </div>
                      <div style={S.affStat}>
                        <span style={{ ...S.affStatNum, color: '#6ee7b7' }}>
                          {affStats.totalEarnings > 0 ? `${affStats.totalEarnings.toLocaleString()} SIG` : '—'}
                        </span>
                        <span style={S.affStatLabel}>Earned</span>
                      </div>
                    </div>
                    <div style={S.affCta}>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Your referral code</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#7dd3fc', fontFamily: "'JetBrains Mono',monospace" }}>
                          {refCode.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {refLink && (
                          <button style={S.copyBtn} onClick={() => copyToClipboard(refLink, 'reflink')}>
                            {copied === 'reflink' ? '✓ Copied' : '📋 Copy Link'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly Bonus */}
              <div style={S.bonus(bonus)}>
                <div style={S.bLbl(bonus.ac)}><span style={S.bDot(bonus.ac)} />🔥 This Week's Bonus</div>
                <div style={S.bHead}>{bonus.icon} {bonus.headline}</div>
                <div style={S.bRew}>{bonus.reward}</div>
                <div style={S.bStats}>
                  <span style={S.bSig}>⚡ {bonus.sig.toLocaleString()} SIG</span>
                  {bonus.mult && <span style={S.bMult}>{bonus.mult}</span>}
                  {bonus.perk && <span style={S.bPerk}>+ {bonus.perk}</span>}
                </div>
                <div style={S.bTimer}>⏱ {tLeft}</div>
                <a style={S.bCta(bonus.ac)} href={bonusRef} target="_blank" rel="noopener noreferrer">
                  🚀 Refer & Earn
                </a>
              </div>

              {/* Signal Wallet */}
              <div style={{ ...S.walSec, marginTop: 10 }}>
                <div style={S.secLbl}>Signal Wallet</div>
                <a style={{ ...S.walRow, textDecoration: 'none' }} href={PRESALE} target="_blank" rel="noopener noreferrer">
                  <div style={S.walIcon}>⚡</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.walTitle}>Signal (SIG)</div>
                    <div style={S.walSub}>
                      {identity?.presaleBalance > 0 ? `${identity.presaleBalance.toLocaleString()} SIG charged` : 'Signal Charging · $0.001'}
                    </div>
                  </div>
                  <span style={S.pill('cyan')}>LIVE</span>
                </a>
                <a style={{ ...S.walRow, textDecoration: 'none' }} href={`${DWTL}/wallet`} target="_blank" rel="noopener noreferrer">
                  <div style={S.walIcon}>💎</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.walTitle}>Manage Wallet</div>
                    <div style={S.walSub}>Balance, transactions, assets</div>
                  </div>
                </a>
              </div>

              {/* Trust & Identity links */}
              <div style={{ ...S.walSec }}>
                <div style={S.secLbl}>Trust & Identity</div>
                <a style={{ ...S.walRow, textDecoration: 'none' }} href={`${DWTL}/hallmark`} target="_blank" rel="noopener noreferrer">
                  <div style={S.walIcon}>🏛️</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.walTitle}>DW-STAMP Hallmark</div>
                    <div style={S.walSub}>Trust verification & tier</div>
                  </div>
                  <span style={S.pill('green')}>✓</span>
                </a>
                <a style={{ ...S.walRow, textDecoration: 'none' }} href={`${HUB}/affiliate`} target="_blank" rel="noopener noreferrer">
                  <div style={S.walIcon}>🤝</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.walTitle}>Affiliate Dashboard</div>
                    <div style={S.walSub}>Full referral stats & payouts</div>
                  </div>
                </a>
                <a style={{ ...S.walRow, textDecoration: 'none' }} href={`${DWTL}/rewards`} target="_blank" rel="noopener noreferrer">
                  <div style={S.walIcon}>🎁</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.walTitle}>Ecosystem Rewards</div>
                    <div style={S.walSub}>Points, referrals, bonuses</div>
                  </div>
                </a>
              </div>

              {/* Ecosystem Apps */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
                <div style={S.secLbl}>Ecosystem Apps</div>
                <div style={{overflow:'hidden',touchAction:'pan-y'}}
  onTouchStart={(e:React.TouchEvent)=>{(window as any)._hubTx=e.touches[0].clientX;}}
  onTouchEnd={(e:React.TouchEvent)=>{const dx=e.changedTouches[0].clientX-(window as any)._hubTx;if(dx<-40)setAppPage(p=>Math.min(APP_TOTAL_PAGES-1,p+1));else if(dx>40)setAppPage(p=>Math.max(0,p-1));}}>
  <div style={S.carouselTrack(appPage)}>
    {Array.from({length:APP_TOTAL_PAGES}).map((_,pi)=>(
      <div key={pi} style={S.carouselPage}>
        {APPS.slice(pi*APPS_PER_PAGE,(pi+1)*APPS_PER_PAGE).map(a=>(
          <a key={a.n} style={S.appBtn} href={a.u} target="_blank" rel="noopener noreferrer">
            <span style={{fontSize:11}}>{a.i}</span>{a.n}
          </a>
        ))}
      </div>
    ))}
  </div>
</div>
<div style={S.carouselControls}>
  <button style={S.carouselArrow(appPage===0)} onClick={()=>setAppPage(p=>Math.max(0,p-1))} disabled={appPage===0} aria-label="Previous">‹</button>
  <div style={{display:'flex',gap:4,alignItems:'center'}}>
    {Array.from({length:APP_TOTAL_PAGES}).map((_,i)=>(
      <button key={i} style={S.carouselDot(i===appPage)} onClick={()=>setAppPage(i)} aria-label={`Page ${i+1}`} />
    ))}
  </div>
  <button style={S.carouselArrow(appPage===APP_TOTAL_PAGES-1)} onClick={()=>setAppPage(p=>Math.min(APP_TOTAL_PAGES-1,p+1))} disabled={appPage===APP_TOTAL_PAGES-1} aria-label="Next">›</button>
</div></div>

              {/* ── Trust Hub — Free Download ── */}
              <div style={{ padding: '10px 14px' }}>
                <a href="https://expo.dev/accounts/cryptocreeper/projects/trust-layer-hub/builds/e90deea6-4ae4-43b8-8a7a-628c0b51ce49"
                   target="_blank" rel="noopener noreferrer"
                   style={{
                     display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                     borderRadius:12, textDecoration:'none',
                     background:'linear-gradient(135deg,rgba(6,182,212,0.10),rgba(14,165,233,0.06))',
                     border:'1px solid rgba(6,182,212,0.18)', transition:'border-color 0.2s',
                   }}
                   onMouseEnter={(e:any)=>e.currentTarget.style.borderColor='rgba(6,182,212,0.4)'}
                   onMouseLeave={(e:any)=>e.currentTarget.style.borderColor='rgba(6,182,212,0.18)'}
                >
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                    background:'linear-gradient(135deg,#06b6d4,#0ea5e9)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🛡️</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.92)' }}>Trust Layer Hub</div>
                    <div style={{ fontSize:10, color:'rgba(6,182,212,0.6)', marginTop:1 }}>Your entire ecosystem in one app</div>
                  </div>
                  <div style={{
                    padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:700,
                    background:'linear-gradient(135deg,#06b6d4,#0ea5e9)', color:'#000',
                    whiteSpace:'nowrap' as const,
                  }}>FREE ↓</div>
                </a>
              </div>

              {/* ── Lume Scan — Paid Product Ad ── */}
              <div style={{ padding: '0 14px 14px' }}>
                <a href="https://lumeauto.tech/order"
                   target="_blank" rel="noopener noreferrer"
                   style={{
                     display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                     borderRadius:12, textDecoration:'none',
                     background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(245,158,11,0.05))',
                     border:'1px solid rgba(16,185,129,0.15)', transition:'border-color 0.2s',
                   }}
                   onMouseEnter={(e:any)=>e.currentTarget.style.borderColor='rgba(16,185,129,0.35)'}
                   onMouseLeave={(e:any)=>e.currentTarget.style.borderColor='rgba(16,185,129,0.15)'}
                >
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                    background:'linear-gradient(135deg,#10b981,#f59e0b)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔧</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.92)' }}>Lume Scan</div>
                    <div style={{ fontSize:10, color:'rgba(16,185,129,0.6)', marginTop:1 }}>Pro OBD-II diagnostics · 42 live signals</div>
                  </div>
                  <div style={{
                    padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:700,
                    background:'linear-gradient(135deg,#10b981,#059669)', color:'#000',
                    whiteSpace:'nowrap' as const,
                  }}>$29.99</div>
                </a>
              </div>
    </>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>Connect to Trust Layer</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20, lineHeight: 1.5 }}>Sign in to access your wallet, identity, and ecosystem apps.</div>
              <a href={`${HUB}/login`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Sign In</a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
