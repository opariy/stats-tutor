/**
 * Demo Data Seed Script
 *
 * Generates realistic student-tutor conversations using AI
 * Run with: npx tsx src/lib/db/seed-demo.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";
import { users, conversations, messages, feedback, messageTags, topicMastery, professors, courses, courseEnrollments } from "./schema";
import bcrypt from "bcryptjs";
import { chapters as chaptersData } from "../topics";
import { KROKYO_PROMPT, CONTROL_PROMPT } from "../prompts";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
const anthropic = new Anthropic();

// Configuration
const NUM_USERS = 30;
const CONVERSATIONS_PER_USER = { min: 1, max: 4 };
const GOLD_CONVERSATIONS = 10;  // Long, high-quality Socratic dialogues
const REGULAR_CONVERSATIONS = 20;  // Mix of shorter conversations
const TARGET_CONVERSATIONS = GOLD_CONVERSATIONS + REGULAR_CONVERSATIONS;

// Get all topics flattened
const allTopics = chaptersData.flatMap(ch => ch.topics);

// Realistic student email patterns (engineering students)
const demoEmails = [
  "alex.chen23", "jsmith_ee", "maria.garcia", "k.patel22", "emily.wong",
  "rjohnson94", "sofia.martinez", "david.kim", "aisha.m", "tyler.brooks",
  "priya.sharma", "jacob.miller", "nina.petrov", "oscar.lee", "hannah.b",
  "kevin.nguyen", "isabella.r", "marcus.jones", "lily.zhang", "ethan.davis",
  "camila.lopez", "ryan.wilson", "zoe.anderson", "jason.t", "maya.patel",
  "lucas.brown", "emma.taylor", "noah.garcia", "olivia.w", "liam.chen"
];

type GeneratedConversation = {
  topic: { id: string; name: string; chapter: number };
  group: "krokyo" | "control";
  exchanges: Array<{ role: "user" | "assistant"; content: string }>;
  hasFeedback: boolean;
  feedbackPositive: boolean;
  hasMastery: boolean;
  isAbandoned: boolean;
};

async function generateConversation(
  topic: typeof allTopics[0],
  group: "krokyo" | "control",
  conversationLength: number,
  scenario: "successful" | "abandoned" | "struggling" | "gold"
): Promise<GeneratedConversation["exchanges"]> {
  const style = group === "krokyo"
    ? "The tutor uses the Socratic method - asking questions to probe understanding before giving answers. Short responses, one question at a time."
    : "The tutor gives direct, complete answers immediately with formulas and worked examples.";

  const scenarioPrompts: Record<string, string> = {
    successful: "The student starts confused but gradually understands through the conversation. They ask good follow-up questions.",
    abandoned: "The student asks 1-2 questions but then stops responding (generate only 2-4 exchanges total). They seem busy or distracted.",
    struggling: "The student is having difficulty understanding. They ask for clarification multiple times. The conversation is longer.",
    gold: `This is a SHOWCASE conversation demonstrating excellent Socratic dialogue. The student:
- Starts with a vague or confused question
- Gets guided by the tutor's probing questions
- Has "aha moments" where they figure things out themselves
- Makes mistakes that the tutor helps them discover
- Eventually reaches understanding through their own reasoning
- Shows genuine learning progression over ${conversationLength} exchanges

The tutor:
- Never gives the answer directly
- Asks ONE focused question per response
- Builds on student's responses
- Guides them to discover their own misconceptions
- Celebrates when they figure it out (briefly, not over the top)
- Uses concrete examples when the student is stuck`
  };

  const scenarioPrompt = scenarioPrompts[scenario];

  const studentStyleGuide = scenario === "gold"
    ? `Student messages should sound like REAL students typing to an AI tutor:
- Direct questions, not overly polished
- Occasional typos or shortcuts ("dont", "im", "thats", "idk")
- Can be confused or uncertain
- Sometimes answer wrong, then get corrected
- Ask follow-up questions based on tutor's response
- NO filler words like "hmm", "oh", "wait" - students don't type these to AI
- NO ellipsis thinking out loud - just ask the question directly

Examples of GOOD student messages:
- "if sample size increases, does standard error decrease?"
- "im confused about when to use t vs z test"
- "so its because we dont know the population variance?"
- "but what if n is less than 30"
- "can you give me an example with actual numbers"`
    : `Student messages should sound like real engineering students typing to AI (direct, casual, sometimes typos)`;

  const prompt = `Generate a realistic tutoring conversation about "${topic.name}" (${topic.description}).

TUTOR STYLE: ${style}

SCENARIO: ${scenarioPrompt}

${studentStyleGuide}

Generate exactly ${conversationLength} message exchanges (${conversationLength * 2} total messages).

Format as JSON array:
[
  {"role": "user", "content": "student message"},
  {"role": "assistant", "content": "tutor response"},
  ...
]

Rules:
- Tutor follows the style strictly (Socratic asks questions, no direct answers)
- NO small talk or "Great question!" from the tutor - be direct
- Include relevant math notation where appropriate (use: x̄, σ, μ, ±, √, ², etc.)
- Student questions should be specific to the topic
- Make the learning progression feel authentic

Return ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: scenario === "gold" ? 4000 : 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Parse the JSON response
    const exchanges = JSON.parse(content.text);
    return exchanges;
  } catch (error) {
    console.error(`Error generating conversation for ${topic.name}:`, error);
    // Return a fallback simple conversation
    return [
      { role: "user" as const, content: `Can you explain ${topic.name}?` },
      { role: "assistant" as const, content: group === "krokyo"
        ? `What's your current understanding of ${topic.name}?`
        : `${topic.name} refers to ${topic.description}. Let me explain the key concepts...`
      },
    ];
  }
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 14) + 8); // 8am - 10pm
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

function randomResponseTime(): number {
  // Realistic response times: 800ms - 4000ms, weighted toward faster
  return Math.floor(800 + Math.random() * Math.random() * 3200);
}

async function seedDemoData() {
  console.log("🎭 Starting demo data generation...\n");

  // Step 1: Create demo users
  console.log(`Creating ${NUM_USERS} demo users...`);
  const createdUsers: Array<{ id: string; email: string; group: "krokyo" | "control" }> = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const group = "krokyo"; // Only Socratic method for demo
    // Use @demo.university.edu - looks realistic but identifiable as demo
    const email = `${demoEmails[i]}@demo.university.edu`;
    const createdAt = randomDate(30);

    try {
      const [user] = await db.insert(users).values({
        email,
        group,
        createdAt,
      }).returning();

      createdUsers.push({ id: user.id, email, group });
      process.stdout.write(".");
    } catch {
      // User might already exist, skip
      process.stdout.write("x");
    }
  }
  console.log(`\n✓ Created ${createdUsers.length} users\n`);

  if (createdUsers.length === 0) {
    console.log("No new users created. Demo data may already exist.");
    console.log("To regenerate, delete demo users first: DELETE FROM users WHERE email LIKE '%@demo.university.edu'");
    return;
  }

  // Step 1.5: Create DEMO professor and course, enroll demo users
  console.log("Creating DEMO professor and course...");

  const demoPasswordHash = await bcrypt.hash("demo-password-123", 12);
  const [demoProf] = await db.insert(professors).values({
    email: "prof.williams@demo.university.edu",
    name: "Dr. Sarah Williams",
    passwordHash: demoPasswordHash,
  }).onConflictDoNothing().returning();

  if (demoProf) {
    const [demoCourse] = await db.insert(courses).values({
      professorId: demoProf.id,
      name: "Demo Course (Generated Data)",
      code: "DEMO-001",
    }).onConflictDoNothing().returning();

    if (demoCourse) {
      console.log(`✓ Created DEMO course: ${demoCourse.code}`);

      // Enroll all demo users in the DEMO course
      for (const user of createdUsers) {
        await db.insert(courseEnrollments).values({
          courseId: demoCourse.id,
          userId: user.id,
        }).onConflictDoNothing();
      }
      console.log(`✓ Enrolled ${createdUsers.length} demo users in DEMO course\n`);
    }
  } else {
    console.log("Demo professor already exists, skipping course creation\n");
  }

  // Step 2: Generate conversations
  console.log(`Generating ${TARGET_CONVERSATIONS} conversations with AI...\n`);
  console.log(`  - ${GOLD_CONVERSATIONS} gold (long, showcase Socratic dialogues)`);
  console.log(`  - ${REGULAR_CONVERSATIONS} regular (mixed lengths)\n`);

  const conversationPlan: Array<{
    user: typeof createdUsers[0];
    topic: typeof allTopics[0];
    scenario: "successful" | "abandoned" | "struggling" | "gold";
    length: number;
  }> = [];

  // Focus on Chapter 9: Tests of Hypotheses for a Single Sample
  // This is the current week's material
  const chapter9Topics = allTopics.filter(t => t.chapter === 9);

  // Priority topics for gold conversations - primarily Chapter 9
  const goldTopics = chapter9Topics.length > 0 ? chapter9Topics : allTopics.filter(t => [
    "hypothesis-basics", "test-mean-var-known", "test-mean-var-unknown", "test-variance"
  ].some(keyword => t.id.includes(keyword)));

  // Generate GOLD conversations first (top 10, long Socratic dialogues)
  console.log("=== Generating GOLD conversations ===");
  for (let i = 0; i < GOLD_CONVERSATIONS; i++) {
    const user = createdUsers[i % createdUsers.length];
    const topic = goldTopics.length > 0
      ? goldTopics[i % goldTopics.length]
      : allTopics[Math.floor(Math.random() * allTopics.length)];

    conversationPlan.push({
      user,
      topic,
      scenario: "gold",
      length: 7 + Math.floor(Math.random() * 2),  // 7-8 exchanges = 14-16 messages
    });
  }

  // Generate regular conversations
  console.log("\n=== Generating regular conversations ===");
  let regularCount = 0;
  for (const user of createdUsers) {
    if (regularCount >= REGULAR_CONVERSATIONS) break;

    const numConvs = Math.min(
      Math.floor(Math.random() * (CONVERSATIONS_PER_USER.max - CONVERSATIONS_PER_USER.min + 1)) + CONVERSATIONS_PER_USER.min,
      REGULAR_CONVERSATIONS - regularCount
    );

    for (let c = 0; c < numConvs; c++) {
      // 70% Chapter 9 topics, 30% other topics for variety
      const useChapter9 = Math.random() < 0.7 && chapter9Topics.length > 0;
      const topicPool = useChapter9 ? chapter9Topics : allTopics;
      const topic = topicPool[Math.floor(Math.random() * topicPool.length)];

      // 50% successful, 30% abandoned, 20% struggling
      const rand = Math.random();
      const scenario = rand < 0.5 ? "successful" : rand < 0.8 ? "abandoned" : "struggling";

      const length = scenario === "abandoned" ? 2 :
                     scenario === "struggling" ? Math.floor(Math.random() * 3) + 4 :
                     Math.floor(Math.random() * 3) + 3;

      conversationPlan.push({ user, topic, scenario, length });
      regularCount++;
    }
  }

  // Generate conversations
  let generated = 0;
  for (const plan of conversationPlan) {
    const { user, topic, scenario, length } = plan;

    const label = scenario === "gold" ? "🌟 GOLD" : scenario;
    console.log(`[${generated + 1}/${conversationPlan.length}] ${label}: "${topic.name}" (${length} exchanges)...`);

    const exchanges = await generateConversation(topic, user.group, length, scenario);

    // Create conversation
    const convCreatedAt = randomDate(28);
    const [conversation] = await db.insert(conversations).values({
      userId: user.id,
      topicId: topic.id,
      title: exchanges[0]?.content.slice(0, 50) + "..." || topic.name,
      isDemo: true,  // Mark as demo conversation
      createdAt: convCreatedAt,
      updatedAt: convCreatedAt,
    }).returning();

    // Insert messages with realistic timing
    let messageTime = new Date(convCreatedAt);
    const messageIds: string[] = [];

    for (const exchange of exchanges) {
      // Add time gap between messages (30s - 5min for user, instant for assistant)
      if (exchange.role === "user") {
        messageTime = new Date(messageTime.getTime() + (30000 + Math.random() * 270000));
      }

      const [msg] = await db.insert(messages).values({
        userId: user.id,
        conversationId: conversation.id,
        role: exchange.role,
        content: exchange.content,
        responseTimeMs: exchange.role === "assistant" ? randomResponseTime() : null,
        createdAt: messageTime,
      }).returning();

      messageIds.push(msg.id);

      // Assistant responds quickly after user
      if (exchange.role === "assistant") {
        messageTime = new Date(messageTime.getTime() + 500 + Math.random() * 2000);
      }
    }

    // Add message tags for the topic
    const userMessageIds = messageIds.filter((_, i) => i % 2 === 0);
    for (const msgId of userMessageIds) {
      await db.insert(messageTags).values({
        messageId: msgId,
        topicId: topic.id,
        confidence: 80 + Math.floor(Math.random() * 20),
      });
    }

    // Add feedback (gold: 80%, successful: 40%)
    const feedbackChance = scenario === "gold" ? 0.8 : scenario === "successful" ? 0.4 : 0;
    if (feedbackChance > 0 && Math.random() < feedbackChance) {
      const lastAssistantMsgId = messageIds[messageIds.length - 1];
      const isPositive = scenario === "gold" ? Math.random() < 0.95 : Math.random() < 0.85;

      await db.insert(feedback).values({
        messageId: lastAssistantMsgId,
        userId: user.id,
        rating: isPositive ? "up" : "down",
      });
    }

    // Add mastery declaration (gold: 70%, successful: 30%)
    const masteryChance = scenario === "gold" ? 0.7 : scenario === "successful" ? 0.3 : 0;
    if (masteryChance > 0 && Math.random() < masteryChance) {
      try {
        await db.insert(topicMastery).values({
          userId: user.id,
          topicId: topic.id,
          conversationId: conversation.id,
          declaredAt: messageTime,
        });
      } catch {
        // Unique constraint violation - user already mastered this topic
      }
    }

    generated++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Demo data generation complete!`);
  console.log(`   - ${createdUsers.length} users`);
  console.log(`   - ${generated} conversations`);
  console.log(`\nView at /admin or /study (use demo user session)`);
}

// Run the script
seedDemoData().catch(console.error);
