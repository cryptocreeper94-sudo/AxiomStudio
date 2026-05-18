/**
 * Axiom Studio — Intelligent Auto-Router
 * Classifies message complexity and routes to the optimal model.
 * Uses GPT-4o-mini as the classifier (~$0.001 per classification).
 * 
 * DarkWave Studios LLC — Copyright 2026
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type RouteTarget = "opus" | "gemini" | "sonnet" | "mini";

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
    // Build context hints
    let contextHints = "";
    if (hasErrorContext) contextHints += " [ERROR CONTEXT ATTACHED]";
    if (hasFileContext) contextHints += " [FILE CONTEXT ATTACHED]";
    if (conversationLength > 20) contextHints += " [DEEP CONVERSATION: " + conversationLength + " messages]";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user", content: message + contextHints },
      ],
      max_tokens: 80,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || '{"score":5,"reason":"default"}';
    const parsed = JSON.parse(raw);
    const score = Math.min(10, Math.max(1, parsed.score || 5));
    const reason = parsed.reason || "auto-classified";

    // Route based on score
    let target: RouteTarget;
    if (score <= 3) {
      target = "mini";
    } else if (score <= 6) {
      target = "sonnet";
    } else if (hasFileContext) {
      // 7-10 with files attached -> Gemini
      target = "gemini";
    } else {
      // 7-10 pure logic -> Opus
      target = "opus";
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
  opus: { model: "claude-opus-4-7", provider: "anthropic", agentId: "opus" },
  gemini: { model: "gemini-3.1-pro", provider: "google", agentId: "gemini" },
  sonnet: { model: "claude-sonnet-4-6", provider: "anthropic", agentId: "sonnet" },
  mini: { model: "gpt-4o-mini", provider: "openai", agentId: "mini" },
};
