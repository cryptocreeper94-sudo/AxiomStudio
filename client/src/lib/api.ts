/**
 * Axiom Studio — API Client
 * Typed fetch helpers for the agent API.
 */

const BASE = "/api/agent";

function headers(token: string | null) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function fetchModels() {
  const res = await fetch(`${BASE}/models`);
  return res.json();
}

export async function fetchConversations(token: string) {
  const res = await fetch(`${BASE}/conversations`, { headers: headers(token) });
  return res.json();
}

export async function createConversation(token: string, agentId: string, model: string) {
  const res = await fetch(`${BASE}/conversations`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ agentId, model }),
  });
  if (!res.ok) {
    let msg = `Status ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchMessages(token: string, conversationId: string) {
  const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
    headers: headers(token),
  });
  return res.json();
}

export async function deleteConversation(token: string, id: string) {
  await fetch(`${BASE}/conversations/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function fetchCredits(token: string) {
  const res = await fetch(`${BASE}/credits`, { headers: headers(token) });
  return res.json();
}

export async function* streamChat(
  token: string,
  conversationId: string,
  message: string,
  agentId: string,
  errorContext?: string,
  contextFiles?: string[]
): AsyncGenerator<{ type: string; content?: string; inputTokens?: number; outputTokens?: number; error?: string; model?: string; agent?: string; score?: number; reason?: string }> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ conversationId, message, agentId, errorContext, contextFiles }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Stream failed" }));
    yield { type: "error", error: err.error || err.message || "Request failed" };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";
  const TIMEOUT_MS = 30000; // 30s inactivity guard

  try {
    while (true) {
      // Race the read against a timeout so we never hang forever
      const readPromise = reader.read();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Stream timeout after 30s")), TIMEOUT_MS)
      );

      const { done, value } = await Promise.race([readPromise, timeoutPromise]);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6));
          } catch {}
        }
      }
    }
  } catch (err: any) {
    yield { type: "error", error: err.message || "Stream interrupted" };
  } finally {
    reader.cancel().catch(() => {});
  }
}
