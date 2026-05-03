/**
 * Tutor Test Runner
 * Orchestrates simulated conversations and evaluates tutor quality
 */

import {
  SimulatorConfig,
  StudentPersona,
  generateFirstMessage,
  generateStudentResponse,
  generateTestScenarios,
} from "./student-simulator";
import { judgeTutorResponse, TutorJudgment } from "./tutor-judge";
import { streamTutorResponse } from "./tutor";
import { TutorContext } from "./tutor";

export interface TestScenario {
  id: string;
  name: string;
  persona: StudentPersona;
  topic: string;
  domain: string;
  priorKnowledge: "none" | "some" | "solid";
  turns: number;  // How many conversation turns to run
}

export interface TestResult {
  scenario: TestScenario;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
  judgment: TutorJudgment;
  durationMs: number;
  cost: {
    simulatorCostUsd: number;
    tutorCostUsd: number;
    judgeCostUsd: number;
    totalCostUsd: number;
  };
}

export interface TestSuiteResult {
  scenarios: TestResult[];
  summary: {
    totalScenarios: number;
    averageScore: number;
    passRate: number;  // % scoring >= 70
    totalCostUsd: number;
    totalDurationMs: number;
  };
  byPersona: Record<StudentPersona, { avgScore: number; count: number }>;
  byDomain: Record<string, { avgScore: number; count: number }>;
}

/**
 * Helper to consume a stream and get the full text
 */
async function consumeStream(
  stream: AsyncIterable<string>,
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number; costUsd: number }>
): Promise<{ content: string; costUsd: number }> {
  let content = "";
  for await (const chunk of stream) {
    content += chunk;
  }
  const usage = await getUsage();
  return { content, costUsd: usage.costUsd };
}

/**
 * Run a single test scenario
 */
export async function runTestScenario(scenario: TestScenario): Promise<TestResult> {
  const startTime = Date.now();
  const conversation: Array<{ role: "user" | "assistant"; content: string }> = [];

  let simulatorCostUsd = 0;
  let tutorCostUsd = 0;

  const simulatorConfig: SimulatorConfig = {
    persona: scenario.persona,
    topic: scenario.topic,
    domain: scenario.domain,
    priorKnowledge: scenario.priorKnowledge,
  };

  // Build tutor context (simplified for testing)
  const tutorContext: TutorContext = {
    courseName: `${scenario.domain} Course`,
    courseDescription: `A course about ${scenario.domain}`,
    topicsList: scenario.topic,
    teachingStyle: "guided",
    currentTopicName: scenario.topic,
  };

  console.log(`[TestRunner] Starting scenario: ${scenario.name}`);

  // Generate first student message
  const firstMessage = await generateFirstMessage(simulatorConfig);
  conversation.push({ role: "user", content: firstMessage });
  console.log(`[TestRunner] Student: ${firstMessage.substring(0, 50)}...`);

  // Run conversation for specified turns
  for (let turn = 0; turn < scenario.turns; turn++) {
    // Get tutor response
    const tutorResult = await streamTutorResponse(conversation, tutorContext);
    const { content: tutorContent, costUsd } = await consumeStream(
      tutorResult.stream,
      tutorResult.getUsage
    );
    tutorCostUsd += costUsd;
    conversation.push({ role: "assistant", content: tutorContent });
    console.log(`[TestRunner] Tutor (turn ${turn + 1}): ${tutorContent.substring(0, 50)}...`);

    // If not the last turn, generate student response
    if (turn < scenario.turns - 1) {
      const studentResponse = await generateStudentResponse(
        simulatorConfig,
        conversation
      );
      conversation.push({ role: "user", content: studentResponse });
      console.log(`[TestRunner] Student (turn ${turn + 1}): ${studentResponse.substring(0, 50)}...`);
    }
  }

  // Judge the final tutor response
  console.log(`[TestRunner] Judging final tutor response...`);
  const judgment = await judgeTutorResponse(
    conversation,
    scenario.persona,
    scenario.topic,
    scenario.domain
  );

  const durationMs = Date.now() - startTime;

  // Estimate judge cost (approximation based on conversation length)
  const judgeCostUsd = 0.001;  // ~1000 tokens at Sonnet rates

  console.log(`[TestRunner] Scenario complete. Score: ${judgment.overallScore}/100`);

  return {
    scenario,
    conversation,
    judgment,
    durationMs,
    cost: {
      simulatorCostUsd,
      tutorCostUsd,
      judgeCostUsd,
      totalCostUsd: simulatorCostUsd + tutorCostUsd + judgeCostUsd,
    },
  };
}

/**
 * Run a full test suite with multiple scenarios
 */
export async function runTestSuite(scenarios: TestScenario[]): Promise<TestSuiteResult> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  console.log(`[TestRunner] Starting test suite with ${scenarios.length} scenarios`);

  for (const scenario of scenarios) {
    try {
      const result = await runTestScenario(scenario);
      results.push(result);
    } catch (error) {
      console.error(`[TestRunner] Scenario "${scenario.name}" failed:`, error);
      // Continue with other scenarios
    }
  }

  // Calculate summary statistics
  const scores = results.map(r => r.judgment.overallScore);
  const averageScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const passRate = scores.length > 0
    ? (scores.filter(s => s >= 70).length / scores.length) * 100
    : 0;
  const totalCostUsd = results.reduce((sum, r) => sum + r.cost.totalCostUsd, 0);

  // Group by persona
  const byPersona: Record<StudentPersona, { avgScore: number; count: number }> = {} as any;
  for (const result of results) {
    const persona = result.scenario.persona;
    if (!byPersona[persona]) {
      byPersona[persona] = { avgScore: 0, count: 0 };
    }
    byPersona[persona].count++;
    byPersona[persona].avgScore =
      (byPersona[persona].avgScore * (byPersona[persona].count - 1) +
        result.judgment.overallScore) /
      byPersona[persona].count;
  }

  // Group by domain
  const byDomain: Record<string, { avgScore: number; count: number }> = {};
  for (const result of results) {
    const domain = result.scenario.domain;
    if (!byDomain[domain]) {
      byDomain[domain] = { avgScore: 0, count: 0 };
    }
    byDomain[domain].count++;
    byDomain[domain].avgScore =
      (byDomain[domain].avgScore * (byDomain[domain].count - 1) +
        result.judgment.overallScore) /
      byDomain[domain].count;
  }

  console.log(`[TestRunner] Test suite complete. Average score: ${averageScore.toFixed(1)}/100`);

  return {
    scenarios: results,
    summary: {
      totalScenarios: results.length,
      averageScore,
      passRate,
      totalCostUsd,
      totalDurationMs: Date.now() - startTime,
    },
    byPersona,
    byDomain,
  };
}

/**
 * Create a default test suite for a given topic
 */
export function createDefaultTestSuite(
  topic: string,
  domain: string,
  turnsPerScenario: number = 5
): TestScenario[] {
  const personas: StudentPersona[] = [
    "curious_beginner",
    "struggling_student",
    "advanced_student",
    "anxious_student",
  ];

  return personas.map((persona, i) => ({
    id: `${domain}-${topic}-${persona}`.toLowerCase().replace(/\s+/g, "-"),
    name: `${persona.replace("_", " ")} learning ${topic}`,
    persona,
    topic,
    domain,
    priorKnowledge: persona === "advanced_student" ? "solid" as const :
                    persona === "curious_beginner" ? "none" as const : "some" as const,
    turns: turnsPerScenario,
  }));
}

/**
 * Quick single-scenario test for development
 */
export async function quickTest(
  topic: string,
  domain: string,
  persona: StudentPersona = "curious_beginner",
  turns: number = 3
): Promise<TestResult> {
  const scenario: TestScenario = {
    id: "quick-test",
    name: `Quick test: ${persona} learning ${topic}`,
    persona,
    topic,
    domain,
    priorKnowledge: "some",
    turns,
  };

  return runTestScenario(scenario);
}
