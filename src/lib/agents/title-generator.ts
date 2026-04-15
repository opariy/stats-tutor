/**
 * Title Generator Agent
 * Creates concise titles for conversations
 */

import { callAgent } from "./base";
import { AGENTS } from "./types";

const SYSTEM_PROMPT = `You generate short, descriptive titles for conversations.

RULES:
- Maximum 6 words
- Capture the main topic or question
- No quotes, no punctuation at the end
- Be specific, not generic

EXAMPLES:
- "Confidence intervals basics"
- "T-test vs Z-test comparison"
- "Python loops and iteration"
- "Calculating sample size"

Return ONLY the title, nothing else.`;

export async function generateTitle(
  firstUserMessage: string,
  firstAssistantMessage?: string
): Promise<string> {
  const userMessage = `Generate a title for this conversation:

User: ${firstUserMessage.slice(0, 500)}
${firstAssistantMessage ? `Assistant: ${firstAssistantMessage.slice(0, 300)}` : ""}

Return only the title.`;

  const response = await callAgent({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    agentConfig: AGENTS.titleGenerator,
  });

  // Clean up the title
  let title = response.content.trim();
  // Remove quotes if present
  title = title.replace(/^["']|["']$/g, "");
  // Remove trailing punctuation
  title = title.replace(/[.!?]$/, "");
  // Truncate if too long
  if (title.length > 50) {
    title = title.slice(0, 47) + "...";
  }

  return title || "New conversation";
}
