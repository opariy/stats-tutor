/**
 * Agent System Index
 *
 * This module exports all specialized AI agents used in the application.
 * Each agent has a specific purpose and uses an appropriate model for cost/quality balance.
 *
 * AGENTS:
 * - Curriculum Architect (Sonnet): Creates course structure
 * - Objective Generator (Haiku): Creates learning objectives
 * - Tutor (Sonnet): Main teaching/chat agent
 * - Quiz Generator (Haiku): Creates quiz questions
 * - Evaluator (Haiku): Grades free-text answers
 * - Title Generator (Haiku): Creates conversation titles
 */

// Types
export { AGENTS, MODEL_IDS } from "./types";
export type { AgentConfig, ModelType } from "./types";

// Base utilities
export { callAgent, streamAgent, streamAgentConversation } from "./base";
export type { AgentCallOptions, AgentResponse } from "./base";

// Specialized agents
export { generateCurriculum } from "./curriculum-architect";
export type { CurriculumOutput } from "./curriculum-architect";

export { generateObjectives, generateObjectivesBatch } from "./objective-generator";
export type { LearningObjectiveOutput } from "./objective-generator";

export { streamTutorResponse, streamTutorResponseWithPlan, createInitialState } from "./tutor";
export type { TutorContext, TeachingState, TeachingPlan } from "./tutor";

export { generateQuiz } from "./quiz-generator";
export type { QuizQuestion, QuizOutput } from "./quiz-generator";

export { evaluateAnswer, evaluateAnswersBatch } from "./evaluator";
export type { EvaluationResult } from "./evaluator";

export { generateTitle } from "./title-generator";
