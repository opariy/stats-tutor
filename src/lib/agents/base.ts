/**
 * Base Agent Client
 * Provides logging, error handling, retry logic, and cost tracking
 *
 * OPTIMIZATIONS:
 * - Prompt caching for system prompts (90% cost reduction on cache hits)
 * - Conversation history truncation (last 10 messages max)
 */

import Anthropic from "@anthropic-ai/sdk";
import { AgentConfig, MODEL_IDS, ModelType } from "./types";

const anthropic = new Anthropic();

// Max messages to send (older messages get truncated)
const MAX_CONVERSATION_MESSAGES = 10;

export interface AgentCallOptions {
  systemPrompt: string;
  userMessage: string;
  agentConfig: AgentConfig;
  metadata?: Record<string, string>; // For logging/debugging
}

export interface AgentResponse {
  content: string;
  model: ModelType;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  agentName: string;
}

// Pricing per 1M tokens (as of 2024)
const PRICING: Record<ModelType, { input: number; output: number }> = {
  opus: { input: 15.0, output: 75.0 },
  sonnet: { input: 3.0, output: 15.0 },
  haiku: { input: 0.25, output: 1.25 },
};

function calculateCost(
  model: ModelType,
  inputTokens: number,
  outputTokens: number
): number {
  const prices = PRICING[model];
  return (
    (inputTokens * prices.input) / 1_000_000 +
    (outputTokens * prices.output) / 1_000_000
  );
}

/**
 * Call an agent with full logging and error handling
 */
export async function callAgent(options: AgentCallOptions): Promise<AgentResponse> {
  const { systemPrompt, userMessage, agentConfig, metadata } = options;
  const startTime = Date.now();

  const logPrefix = `[${agentConfig.name}]`;

  console.log(`${logPrefix} Starting call...`, {
    model: agentConfig.model,
    maxTokens: agentConfig.maxTokens,
    ...metadata,
  });

  try {
    const response = await anthropic.messages.create({
      model: MODEL_IDS[agentConfig.model],
      max_tokens: agentConfig.maxTokens,
      temperature: agentConfig.temperature,
      // Use prompt caching for system prompt (90% cost reduction on cache hits)
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const durationMs = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costUsd = calculateCost(agentConfig.model, inputTokens, outputTokens);

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`${logPrefix} Completed`, {
      durationMs,
      inputTokens,
      outputTokens,
      costUsd: `$${costUsd.toFixed(6)}`,
      contentLength: content.length,
    });

    return {
      content,
      model: agentConfig.model,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      agentName: agentConfig.name,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`${logPrefix} Failed after ${durationMs}ms`, error);

    // Retry with backoff for overload errors
    if (error instanceof Anthropic.APIError && error.status === 529) {
      console.log(`${logPrefix} Retrying after overload...`);
      await new Promise((r) => setTimeout(r, 2000));
      return callAgent(options); // Recursive retry
    }

    throw error;
  }
}

/**
 * Stream an agent response (for chat)
 */
export async function streamAgent(options: AgentCallOptions): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number; costUsd: number }>;
}> {
  const { systemPrompt, userMessage, agentConfig, metadata } = options;
  const startTime = Date.now();
  const logPrefix = `[${agentConfig.name}]`;

  console.log(`${logPrefix} Starting stream...`, {
    model: agentConfig.model,
    ...metadata,
  });

  const stream = await anthropic.messages.stream({
    model: MODEL_IDS[agentConfig.model],
    max_tokens: agentConfig.maxTokens,
    temperature: agentConfig.temperature,
    // Use prompt caching for system prompt
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  let inputTokens = 0;
  let outputTokens = 0;

  const textStream = async function* () {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
      if (event.type === "message_delta" && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
      if (event.type === "message_start" && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
      }
    }

    const durationMs = Date.now() - startTime;
    const costUsd = calculateCost(agentConfig.model, inputTokens, outputTokens);
    console.log(`${logPrefix} Stream completed`, {
      durationMs,
      inputTokens,
      outputTokens,
      costUsd: `$${costUsd.toFixed(6)}`,
    });
  };

  return {
    stream: textStream(),
    getUsage: async () => {
      await stream.finalMessage();
      return {
        inputTokens,
        outputTokens,
        costUsd: calculateCost(agentConfig.model, inputTokens, outputTokens),
      };
    },
  };
}

/**
 * Stream agent for multi-turn conversation
 */
export async function streamAgentConversation(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  agentConfig: AgentConfig;
  metadata?: Record<string, string>;
}): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number; costUsd: number }>;
}> {
  const { systemPrompt, messages, agentConfig, metadata } = options;
  const startTime = Date.now();
  const logPrefix = `[${agentConfig.name}]`;

  // Truncate conversation history to save tokens
  const truncatedMessages = messages.length > MAX_CONVERSATION_MESSAGES
    ? messages.slice(-MAX_CONVERSATION_MESSAGES)
    : messages;

  const wasTruncated = messages.length > MAX_CONVERSATION_MESSAGES;

  console.log(`${logPrefix} Starting conversation stream...`, {
    model: agentConfig.model,
    messageCount: truncatedMessages.length,
    truncated: wasTruncated ? `${messages.length} → ${truncatedMessages.length}` : "no",
    ...metadata,
  });

  const stream = await anthropic.messages.stream({
    model: MODEL_IDS[agentConfig.model],
    max_tokens: agentConfig.maxTokens,
    temperature: agentConfig.temperature,
    // Use prompt caching for system prompt (90% cost reduction on cache hits)
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: truncatedMessages,
  });

  let inputTokens = 0;
  let outputTokens = 0;

  const textStream = async function* () {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
      if (event.type === "message_delta" && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
      if (event.type === "message_start" && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
      }
    }

    const durationMs = Date.now() - startTime;
    const costUsd = calculateCost(agentConfig.model, inputTokens, outputTokens);
    console.log(`${logPrefix} Conversation stream completed`, {
      durationMs,
      inputTokens,
      outputTokens,
      costUsd: `$${costUsd.toFixed(6)}`,
    });
  };

  return {
    stream: textStream(),
    getUsage: async () => {
      await stream.finalMessage();
      return {
        inputTokens,
        outputTokens,
        costUsd: calculateCost(agentConfig.model, inputTokens, outputTokens),
      };
    },
  };
}
