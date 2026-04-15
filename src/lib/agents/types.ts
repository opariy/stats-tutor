/**
 * Agent Types and Base Configuration
 */

export type ModelType = "opus" | "sonnet" | "haiku";

export interface AgentConfig {
  name: string;
  model: ModelType;
  maxTokens: number;
  temperature?: number;
}

// Model IDs for Anthropic API
export const MODEL_IDS: Record<ModelType, string> = {
  opus: "claude-opus-4-20250514",
  sonnet: "claude-sonnet-4-0",
  haiku: "claude-3-5-haiku-20241022",
};

// Agent configurations
export const AGENTS: Record<string, AgentConfig> = {
  curriculumArchitect: {
    name: "Curriculum Architect",
    model: "sonnet",
    maxTokens: 4096,
    temperature: 0.7,
  },
  objectiveGenerator: {
    name: "Objective Generator",
    model: "haiku",
    maxTokens: 1024,
    temperature: 0.5,
  },
  tutor: {
    name: "Tutor",
    model: "sonnet",
    maxTokens: 1024,
    temperature: 0.7,
  },
  quizGenerator: {
    name: "Quiz Generator",
    model: "haiku",
    maxTokens: 2048,
    temperature: 0.5,
  },
  evaluator: {
    name: "Evaluator",
    model: "haiku",
    maxTokens: 512,
    temperature: 0.3,
  },
  titleGenerator: {
    name: "Title Generator",
    model: "haiku",
    maxTokens: 64,
    temperature: 0.5,
  },
};
