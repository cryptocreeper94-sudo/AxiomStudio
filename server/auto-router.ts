/**
 * Axiom Studio — Intelligent Auto-Router
 * Classifies message complexity and routes to the optimal model.
 * Uses Gemini 2.0 Flash Lite as the classifier ($0.00 per classification).
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

export type RouteTarget = "opus" | "gemini" | "sonnet" | "flash" | "gpt4" | "gpt4mini" | "deepseek" | "fable" | "lume";

interface RouteDecision {
  target: RouteTarget;
  score: number;
  reason: string;
}

const CLASSIFIER_PROMPT = `You are a message complexity classifier for an AI coding assistant. Analyze the user's message and return a JSON object with:
- "score": integer 1-10 (1=trivial, 10=extremely complex)
- "reason": one-line explanation (max 15 words)

Scoring guide:
1-3 (SIMPLE): formatting, short questions, "what is X?", simple lookups, typos, one-liners
4-6 (MODERATE): code explanations, refactoring, writing functions, debugging simple errors, documentation
7-10 (COMPLEX): architecture design, multi-file refactoring, complex debugging with stack traces, system design, security audits, performance optimization, building entire features

Boost score by +2 if:
- Error context or stack trace is attached
- Multiple files are referenced
- Message is longer than 500 characters
- User asks to "build", "architect", "design", or "implement" something significant

Return ONLY valid JSON. Example: {"score": 7, "reason": "Multi-file architecture redesign"}`;

export async function classifyMessage(
  message: string,
  hasErrorContext: boolean,
  hasFileContext: boolean,
  conversationLength: number
): Promise<RouteDecision> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[AutoRouter] No GEMINI_API_KEY, defaulting to sonnet");
      return { target: "sonnet", score: 5, reason: "no classifier key" };
    }

    // Build context hints
    let contextHints = "";
    if (hasErrorContext) contextHints += " [ERROR CONTEXT ATTACHED]";
    if (hasFileContext) contextHints += " [FILE CONTEXT ATTACHED]";
    if (conversationLength > 20) contextHints += " [DEEP CONVERSATION: " + conversationLength + " messages]";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: CLASSIFIER_PROMPT + "\n\nUser message:\n" + message + contextHints }] }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 80
        }
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"score":5,"reason":"default"}';
    const parsed = JSON.parse(raw);
    const score = Math.min(10, Math.max(1, parsed.score || 5));
    const reason = parsed.reason || "auto-classified";

    // Route based on score and context
    let target: RouteTarget;
    const msgLower = message.toLowerCase();
    
    // Explicit routing for Lume/Trust Layer domains
    if (msgLower.includes("lume") || msgLower.includes("ldir") || msgLower.includes("trust layer") || msgLower.includes("canon²")) {
      target = "lume";
    } else if (score <= 2) {
      target = "flash"; // Simple tasks → Gemini Flash Lite (free)
    } else if (score <= 3) {
      target = "gpt4mini"; // Quick logic → GPT-4.1 Mini
    } else if (score <= 4) {
      target = "deepseek"; // Medium tasks → DeepSeek V3
    } else if (score <= 5) {
      target = "sonnet"; // Medium-hard → Sonnet
    } else if (score <= 6) {
      target = "gpt4"; // General purpose coding/planning → GPT-4.1
    } else if (score <= 8 && hasFileContext) {
      target = "gemini"; // Complex with files → Gemini Pro (2M context)
    } else if (score <= 8) {
      target = "opus"; // Complex pure logic → Opus
    } else {
      target = "fable"; // Score 9-10 → Fable 5 (Mythos-class)
    }

    return { target, score, reason };
  } catch (err) {
    // On classifier failure, default to sonnet (safe middle ground)
    console.error("[AutoRouter] Classification failed, defaulting to sonnet:", err);
    return { target: "sonnet", score: 5, reason: "classifier fallback" };
  }
}

// Model mapping for each route target
export const ROUTE_MODELS: Record<RouteTarget, { model: string; provider: string; agentId: string }> = {
  fable:    { model: "claude-fable-5", provider: "anthropic", agentId: "fable" },
  opus:     { model: "claude-opus-4-8", provider: "anthropic", agentId: "opus" },
  gemini:   { model: "gemini-3.1-pro", provider: "google", agentId: "gemini" },
  sonnet:   { model: "claude-sonnet-4-6", provider: "anthropic", agentId: "sonnet" },
  deepseek: { model: "deepseek-chat", provider: "deepseek", agentId: "deepseek" },
  flash:    { model: "gemini-2.0-flash-lite", provider: "google", agentId: "flash" },
  gpt4:     { model: "gpt-4.1", provider: "openai", agentId: "gpt4" },
  gpt4mini: { model: "gpt-4.1-mini", provider: "openai", agentId: "gpt4mini" },
  lume:     { model: "claude-opus-4-8", provider: "anthropic", agentId: "lume" },
};
