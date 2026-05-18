/**
 * Axiom Studio — AI Provider Abstraction
 * Wraps Anthropic and OpenAI SDKs with a full agentic tool-use loop.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ANTHROPIC_TOOLS, OPENAI_TOOLS, executeTool } from "./agent-tools.js";

export interface StreamChunk {
  type: "text" | "usage" | "done" | "error" | "tool_call" | "tool_result";
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  tool?: string;
  args?: Record<string, any>;
  result?: string;
  isError?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  userId: string;
  userRole: string;
  signal?: AbortSignal;
}

const MAX_TOOL_ITERATIONS = 100;

// ─── Anthropic Provider ────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function* streamAnthropic(
  messages: ChatMessage[],
  config: ProviderConfig
): AsyncGenerator<StreamChunk> {
  try {
    // Build conversation as Anthropic-format messages (no system role in array)
    let convoMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      // Use non-streaming API when we need tool results to continue the loop.
      // We still stream text chunks from the first pass by checking the events.
      const stream = anthropic.messages.stream({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: config.systemPrompt,
        messages: convoMessages,
        tools: ANTHROPIC_TOOLS,
        tool_choice: { type: "auto" },
      }, { signal: config.signal });

      // Stream text tokens live to the client
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "text", content: event.delta.text };
        }
      }

      let finalMsg: Anthropic.Message;
      try {
        finalMsg = await stream.finalMessage();
      } catch (e: any) {
        console.warn("[Anthropic] finalMessage() failed:", e.message);
        yield { type: "error", error: e.message || "Anthropic API error" };
        yield { type: "done" };
        return;
      }

      totalInputTokens += finalMsg.usage.input_tokens;
      totalOutputTokens += finalMsg.usage.output_tokens;

      if (finalMsg.stop_reason === "end_turn") {
        // Normal finish
        yield { type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
        yield { type: "done" };
        return;
      }

      if (finalMsg.stop_reason === "tool_use") {
        // Collect tool-use blocks
        const toolUseBlocks = finalMsg.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        if (!toolUseBlocks.length) {
          yield { type: "done" };
          return;
        }

        // Append assistant turn to conversation
        convoMessages.push({ role: "assistant", content: finalMsg.content });

        // Execute each tool, stream events, collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const args = toolUse.input as Record<string, any>;
          yield { type: "tool_call", tool: toolUse.name, args };

          const result = await executeTool(
            toolUse.name,
            args,
            config.userId,
            config.userRole
          );

          const isError = result.startsWith("Error:");
          yield { type: "tool_result", tool: toolUse.name, result, isError };

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        // Append tool results and loop
        convoMessages.push({ role: "user", content: toolResults });
        continue;
      }

      // max_tokens or other stop reason — just finish
      yield { type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
      yield { type: "done" };
      return;
    }

    // Hit iteration cap
    yield { type: "text", content: "\n\n⚠️ Reached maximum tool iteration limit." };
    yield { type: "done" };
  } catch (err: any) {
    console.error("[Anthropic] Stream error:", err.message);
    yield { type: "error", error: err.message || "Anthropic API error" };
    yield { type: "done" };
  }
}

// ─── OpenAI Provider ───────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function* streamOpenAI(
  messages: ChatMessage[],
  config: ProviderConfig,
  client: OpenAI = openai
): AsyncGenerator<StreamChunk> {
  try {
    type OAIMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };
    let convoMessages: OAIMessage[] = [
      { role: "system", content: config.systemPrompt },
      ...messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      // Stream for text output
      const stream = await client.chat.completions.create({
        model: config.model,
        messages: convoMessages as any,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        tools: OPENAI_TOOLS,
        tool_choice: "auto",
        stream: true,
        stream_options: { include_usage: true },
      }, { signal: config.signal });

      let fullText = "";
      let toolCallsMap: Record<string, { name: string; arguments: string }> = {};
      let finishReason: string | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        const fr = chunk.choices?.[0]?.finish_reason;
        if (fr) finishReason = fr;

        if (delta?.content) {
          fullText += delta.content;
          yield { type: "text", content: delta.content };
        }

        // Accumulate tool call deltas
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = String(tc.index ?? 0);
            if (!toolCallsMap[idx]) {
              toolCallsMap[idx] = { name: tc.function?.name ?? "", arguments: "" };
            }
            if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
          }
        }

        if (chunk.usage) {
          totalInputTokens += chunk.usage.prompt_tokens ?? 0;
          totalOutputTokens += chunk.usage.completion_tokens ?? 0;
        }
      }

      if (finishReason === "stop") {
        yield { type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
        yield { type: "done" };
        return;
      }

      if (finishReason === "tool_calls") {
        const toolCalls = Object.entries(toolCallsMap).map(([, tc]) => ({
          name: tc.name,
          args: (() => { try { return JSON.parse(tc.arguments); } catch { return {}; } })(),
        }));

        // Append assistant message with tool_calls
        convoMessages.push({
          role: "assistant",
          content: fullText || "",
          ...(Object.keys(toolCallsMap).length
            ? {
                tool_calls: Object.entries(toolCallsMap).map(([idx, tc]) => ({
                  id: `call_${idx}`,
                  type: "function",
                  function: { name: tc.name, arguments: tc.arguments },
                })),
              }
            : {}),
        } as any);

        for (let i = 0; i < toolCalls.length; i++) {
          const { name, args } = toolCalls[i];
          yield { type: "tool_call", tool: name, args };

          const result = await executeTool(name, args, config.userId, config.userRole);
          const isError = result.startsWith("Error:");
          yield { type: "tool_result", tool: name, result, isError };

          convoMessages.push({
            role: "tool",
            content: result,
            tool_call_id: `call_${i}`,
            name,
          });
        }

        continue;
      }

      // length or other finish reason
      yield { type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
      yield { type: "done" };
      return;
    }

    yield { type: "text", content: "\n\n⚠️ Reached maximum tool iteration limit." };
    yield { type: "done" };
  } catch (err: any) {
    console.error("[OpenAI] Stream error:", err.message);
    yield { type: "error", error: err.message || "OpenAI API error" };
    yield { type: "done" };
  }
}

// ─── Provider Router ───────────────────────────────────────────────────

export function getProviderStream(
  provider: string,
  messages: ChatMessage[],
  config: ProviderConfig
): AsyncGenerator<StreamChunk> {
  if (provider === "anthropic") return streamAnthropic(messages, config);
  if (provider === "google") {
    const googleAI = new OpenAI({ 
      apiKey: process.env.GEMINI_API_KEY, 
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" 
    });
    return streamOpenAI(messages, config, googleAI);
  }
  return streamOpenAI(messages, config);
}
