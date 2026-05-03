#!/usr/bin/env npx tsx
/**
 * CLI script to test tutor quality
 *
 * Usage:
 *   npx tsx scripts/test-tutor.ts "hypothesis testing" statistics
 *   npx tsx scripts/test-tutor.ts "regression" statistics --turns 5 --persona struggling_student
 *   npx tsx scripts/test-tutor.ts "mean" statistics --full
 */

// Load environment variables BEFORE importing modules that use them
import { config } from "dotenv";
config({ path: ".env.local" });

// Dynamic imports to ensure env vars are loaded first
async function main() {
  const { quickTest, runTestSuite, createDefaultTestSuite } = await import(
    "../src/lib/agents/tutor-test-runner"
  );
  type StudentPersonaType =
    | "curious_beginner"
    | "struggling_student"
    | "advanced_student"
    | "distracted_student"
    | "anxious_student";

  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: npx tsx scripts/test-tutor.ts <topic> <domain> [options]

Options:
  --turns <n>          Number of conversation turns (default: 3)
  --persona <type>     Student persona (default: curious_beginner)
  --full               Run full test suite with all personas

Personas:
  curious_beginner, struggling_student, advanced_student,
  distracted_student, anxious_student

Examples:
  npx tsx scripts/test-tutor.ts "standard deviation" statistics
  npx tsx scripts/test-tutor.ts "hypothesis testing" statistics --turns 5
  npx tsx scripts/test-tutor.ts "mean" statistics --full
`);
    process.exit(1);
  }

  const topic = args[0];
  const domain = args[1];
  const fullMode = args.includes("--full");
  const turnsIndex = args.indexOf("--turns");
  const turns = turnsIndex !== -1 ? parseInt(args[turnsIndex + 1]) : 3;
  const personaIndex = args.indexOf("--persona");
  const persona: StudentPersonaType = personaIndex !== -1
    ? (args[personaIndex + 1] as StudentPersonaType)
    : "curious_beginner";

  console.log("\n🧪 Tutor Quality Test");
  console.log("═".repeat(50));
  console.log(`Topic: ${topic}`);
  console.log(`Domain: ${domain}`);
  console.log(`Mode: ${fullMode ? "Full suite" : "Quick test"}`);
  console.log(`Turns: ${turns}`);
  if (!fullMode) console.log(`Persona: ${persona}`);
  console.log("═".repeat(50));

  try {
    if (fullMode) {
      console.log("\nRunning full test suite...\n");
      const scenarios = createDefaultTestSuite(topic, domain, turns);
      const result = await runTestSuite(scenarios);

      console.log("\n📊 Results Summary");
      console.log("─".repeat(50));
      console.log(`Total scenarios: ${result.summary.totalScenarios}`);
      console.log(`Average score: ${result.summary.averageScore.toFixed(1)}/100`);
      console.log(`Pass rate (≥70): ${result.summary.passRate.toFixed(1)}%`);
      console.log(`Total cost: $${result.summary.totalCostUsd.toFixed(4)}`);
      console.log(`Duration: ${(result.summary.totalDurationMs / 1000).toFixed(1)}s`);

      console.log("\n📈 By Persona:");
      for (const [p, stats] of Object.entries(result.byPersona)) {
        const s = stats as { avgScore: number; count: number };
        console.log(`  ${p}: ${s.avgScore.toFixed(1)}/100 (${s.count} tests)`);
      }

      console.log("\n📝 Individual Results:");
      for (const r of result.scenarios) {
        const icon = r.judgment.overallScore >= 70 ? "✅" : "❌";
        console.log(`\n${icon} ${r.scenario.name}`);
        console.log(`   Score: ${r.judgment.overallScore}/100`);
        console.log(`   Expected: ${r.judgment.expectedResponseType}`);
        console.log(`   Actual: ${r.judgment.actualResponseType}`);
        console.log(`   Appropriate: ${r.judgment.wasAppropriate ? "Yes" : "No"}`);
        if (r.judgment.strengths.length > 0) {
          console.log(`   Strengths: ${r.judgment.strengths.join(", ")}`);
        }
        if (r.judgment.improvements.length > 0) {
          console.log(`   Improvements: ${r.judgment.improvements.join(", ")}`);
        }
      }
    } else {
      console.log("\nRunning quick test...\n");
      const result = await quickTest(topic, domain, persona, turns);

      console.log("\n📊 Result");
      console.log("─".repeat(50));
      const icon = result.judgment.overallScore >= 70 ? "✅" : "❌";
      console.log(`${icon} Score: ${result.judgment.overallScore}/100`);

      console.log("\n📈 Criteria Scores:");
      const criteria = result.judgment.criteria;
      console.log(`  Clarity:         ${criteria.clarity}/10`);
      console.log(`  Accuracy:        ${criteria.accuracy}/10`);
      console.log(`  Appropriateness: ${criteria.appropriateness}/10`);
      console.log(`  Engagement:      ${criteria.engagement}/10`);
      console.log(`  Scaffolding:     ${criteria.scaffolding}/10`);
      console.log(`  Conciseness:     ${criteria.conciseness}/10`);

      console.log("\n🎯 Response Analysis:");
      console.log(`  Expected: ${result.judgment.expectedResponseType}`);
      console.log(`  Actual: ${result.judgment.actualResponseType}`);
      console.log(`  Appropriate: ${result.judgment.wasAppropriate ? "Yes ✓" : "No ✗"}`);

      if (result.judgment.strengths.length > 0) {
        console.log("\n✨ Strengths:");
        result.judgment.strengths.forEach(s => console.log(`  • ${s}`));
      }

      if (result.judgment.improvements.length > 0) {
        console.log("\n🔧 Improvements:");
        result.judgment.improvements.forEach(s => console.log(`  • ${s}`));
      }

      console.log("\n💭 Reasoning:");
      console.log(`  ${result.judgment.reasoning}`);

      console.log("\n💬 Conversation:");
      console.log("─".repeat(50));
      result.conversation.forEach((msg: { role: string; content: string }, i: number) => {
        const speaker = msg.role === "user" ? "🎓 Student" : "🤖 Tutor";
        console.log(`\n[${i + 1}] ${speaker}:`);
        console.log(msg.content);
      });

      console.log("\n─".repeat(50));
      console.log(`Cost: $${result.cost.totalCostUsd.toFixed(4)}`);
      console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    }

    console.log("\n✅ Test complete!\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main();
