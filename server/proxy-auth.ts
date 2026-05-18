/**
 * Axiom Studio — Proxy Auth for Local Mode
 * Handles login against axiomstudio.dev, token persistence,
 * and API key fetching for the npm package.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createInterface } from "readline";

const CONFIG_DIR = join(homedir(), ".axiom-studio");
const AUTH_FILE = join(CONFIG_DIR, "auth.json");
const CLOUD_URL = process.env.AXIOM_CLOUD_URL || "https://axiomstudio.dev";

// ─── Token Persistence ────────────────────────────────────────────────

export function saveAuth(data: { token: string; email: string; userId: string }) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function loadAuth(): { token: string; email: string; userId: string } | null {
  if (!existsSync(AUTH_FILE)) return null;
  try {
    return JSON.parse(readFileSync(AUTH_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (existsSync(AUTH_FILE)) {
    writeFileSync(AUTH_FILE, "", "utf-8");
  }
}

// ─── Cloud API Calls ──────────────────────────────────────────────────

export async function loginToCloud(email: string, password: string): Promise<{
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${CLOUD_URL}/api/agent/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as any;
    if (data.token) {
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, error: data.error || "Login failed" };
  } catch (err: any) {
    return { success: false, error: `Cannot reach ${CLOUD_URL}: ${err.message}` };
  }
}

export async function validateToken(token: string): Promise<{
  valid: boolean;
  user?: any;
  credits?: number;
}> {
  try {
    const res = await fetch(`${CLOUD_URL}/api/agent/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { valid: false };
    const data = await res.json() as any;
    return { valid: true, user: data, credits: data.credits };
  } catch {
    return { valid: false };
  }
}

export async function fetchApiKeys(token: string): Promise<{
  anthropic: string | null;
  openai: string | null;
  gemini: string | null;
  expires: number;
} | null> {
  try {
    const res = await fetch(`${CLOUD_URL}/api/agent/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json() as any;
  } catch {
    return null;
  }
}

export async function checkCredits(token: string, agentId: string): Promise<{
  approved: boolean;
  cost: number;
  balance: number;
  error?: string;
}> {
  try {
    const res = await fetch(`${CLOUD_URL}/api/agent/credits/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ agentId }),
    });
    return await res.json() as any;
  } catch (err: any) {
    return { approved: false, cost: 0, balance: 0, error: err.message };
  }
}

export async function deductCredits(token: string, agentId: string, description: string): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUD_URL}/api/agent/credits/deduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ agentId, description }),
    });
    const data = await res.json() as any;
    return data.success === true;
  } catch {
    return false;
  }
}

// ─── Interactive Login Prompt ─────────────────────────────────────────

export async function promptLogin(): Promise<{ token: string; email: string; userId: string } | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  console.log("\n  ┌────────────────────────────────────────┐");
  console.log("  │  Login to your axiomstudio.dev account │");
  console.log("  └────────────────────────────────────────┘\n");

  const email = await ask("  Email: ");
  const password = await ask("  Password: ");
  rl.close();

  console.log("\n  Authenticating...");
  const result = await loginToCloud(email.trim(), password.trim());

  if (result.success && result.token) {
    const auth = {
      token: result.token,
      email: result.user?.email || email.trim(),
      userId: result.user?.id || "unknown",
    };
    saveAuth(auth);
    console.log(`  ✓ Logged in as ${auth.email}`);
    console.log(`  ✓ Token saved to ~/.axiom-studio/auth.json\n`);
    return auth;
  }

  console.error(`  ✗ Login failed: ${result.error}\n`);
  return null;
}

export function getCloudUrl(): string {
  return CLOUD_URL;
}
