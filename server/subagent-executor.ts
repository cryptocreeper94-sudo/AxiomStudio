/**
 * Axiom Studio — Subagent Executor
 * Runs an ephemeral inner agent conversation for delegate_task.
 * Max 20 tool iterations, 2-minute timeout, no DB persistence.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import Anthropic from "@anthropic-ai/sdk";
import { executeTool } from "./agent-tools.js";
import { ANTHROPIC_TOOLS } from "./agent-tools.js";
import { AGENT_PROMPTS } from "./agent-prompts.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model mapping for subagent agent IDs
const SUBAGENT_MODELS: Record<string, string> = {
  sonnet: "claude-sonnet-4-6",
  mini: "claude-sonnet-4-6", // Use Sonnet as fallback for mini (cheaper than Opus)
  gemini: "claude-sonnet-4-6", // Use Sonnet for now — Gemini subagent support later
};

const MAX_ITERATIONS = 20;
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export async function executeSubagent(
  task: string,
  agentId: string,
  userId: string,
  userRole: string,
  conversationId: string
): Promise<string> {
  const model = SUBAGENT_MODELS[agentId] || "claude-sonnet-4-6";
  const systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.sonnet || "";

  const subagentSystem = `${systemPrompt}

## Subagent Context
You are running as a SUBAGENT delegated by the primary Axiom agent. Complete the assigned task efficiently:
- Focus only on the specific task given
- Use tools as needed (read, write, list, search)
- Be concise in your final response — the parent agent will use your output
- Do NOT delegate further tasks (no recursive subagents)
- You have a maximum of ${MAX_ITERATIONS} tool iterations`;

  // Filter out delegate_task to prevent recursive subagents
  const subagentTools = ANTHROPIC_TOOLS.filter(t => t.name !== "delegate_task");

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task },
  ];

  let finalText = "";

  // Wrap in a timeout
  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("Subagent timed out after 2 minutes")), TIMEOUT_MS)
  );

  const executionPromise = (async () => {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: subagentSystem,
        messages,
        tools: subagentTools,
      });

      // Collect text content
      const textBlocks = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text);
      
      if (textBlocks.length) {
        finalText += textBlocks.join("\n");
      }

      // If stop_reason is end_turn, we're done
      if (response.stop_reason === "end_turn") {
        return finalText || "(Subagent completed with no output)";
      }

      // Handle tool use
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        if (!toolUseBlocks.length) return finalText || "(Subagent completed)";

        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          const args = toolUse.input as Record<string, any>;
          const result = await executeTool(toolUse.name, args, userId, userRole, conversationId);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Other stop reasons — done
      return finalText || "(Subagent completed)";
    }

    return finalText + "\n\n⚠️ Subagent reached maximum iteration limit.";
  })();

  return Promise.race([executionPromise, timeoutPromise]);
}
