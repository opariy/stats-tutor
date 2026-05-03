/**
 * Tutor Testing API
 * Run simulated conversations and evaluate tutor quality
 *
 * POST /api/test-tutor
 * Body: {
 *   topic: string,
 *   domain: string,
 *   personas?: StudentPersona[],  // defaults to all
 *   turns?: number,               // defaults to 5
 *   mode?: "quick" | "full"       // quick = 1 persona, full = all personas
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  runTestSuite,
  quickTest,
  createDefaultTestSuite,
  TestScenario,
} from "@/lib/agents/tutor-test-runner";
import { StudentPersona } from "@/lib/agents/student-simulator";

export const maxDuration = 300; // 5 minutes for long test suites

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      domain,
      personas,
      turns = 5,
      mode = "quick",
    } = body;

    if (!topic || !domain) {
      return NextResponse.json(
        { error: "topic and domain are required" },
        { status: 400 }
      );
    }

    console.log(`[TestAPI] Starting ${mode} test for "${topic}" in ${domain}`);

    if (mode === "quick") {
      // Quick test with one persona
      const persona: StudentPersona = personas?.[0] || "curious_beginner";
      const result = await quickTest(topic, domain, persona, Math.min(turns, 5));

      return NextResponse.json({
        mode: "quick",
        result: {
          scenario: result.scenario,
          score: result.judgment.overallScore,
          criteria: result.judgment.criteria,
          wasAppropriate: result.judgment.wasAppropriate,
          expectedResponseType: result.judgment.expectedResponseType,
          actualResponseType: result.judgment.actualResponseType,
          strengths: result.judgment.strengths,
          improvements: result.judgment.improvements,
          reasoning: result.judgment.reasoning,
          conversation: result.conversation,
          cost: result.cost,
          durationMs: result.durationMs,
        },
      });
    }

    // Full test suite
    let scenarios: TestScenario[];

    if (personas && personas.length > 0) {
      // Use specified personas
      scenarios = personas.map((persona: StudentPersona, i: number) => ({
        id: `${domain}-${topic}-${persona}-${i}`.toLowerCase().replace(/\s+/g, "-"),
        name: `${persona.replace("_", " ")} learning ${topic}`,
        persona,
        topic,
        domain,
        priorKnowledge: persona === "advanced_student" ? "solid" as const :
                        persona === "curious_beginner" ? "none" as const : "some" as const,
        turns,
      }));
    } else {
      // Default to all personas
      scenarios = createDefaultTestSuite(topic, domain, turns);
    }

    const suiteResult = await runTestSuite(scenarios);

    return NextResponse.json({
      mode: "full",
      summary: suiteResult.summary,
      byPersona: suiteResult.byPersona,
      byDomain: suiteResult.byDomain,
      scenarios: suiteResult.scenarios.map((r) => ({
        scenarioName: r.scenario.name,
        persona: r.scenario.persona,
        score: r.judgment.overallScore,
        wasAppropriate: r.judgment.wasAppropriate,
        strengths: r.judgment.strengths,
        improvements: r.judgment.improvements,
        reasoning: r.judgment.reasoning,
        // Include conversation for debugging
        conversation: r.conversation,
      })),
    });
  } catch (error) {
    console.error("[TestAPI] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint for simple health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    description: "Tutor testing API. POST with { topic, domain } to run tests.",
    example: {
      topic: "standard deviation",
      domain: "statistics",
      mode: "quick",
      turns: 3,
    },
  });
}
