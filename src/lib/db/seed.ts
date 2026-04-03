import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";
import { systemPrompts, chapters, topics } from "./schema";
import { KROKYO_PROMPT, CONTROL_PROMPT } from "../prompts";
import { chapters as chaptersData } from "../topics";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Seeding database...");

  // Seed system prompts
  console.log("Seeding system prompts...");
  await db.insert(systemPrompts).values([
    {
      name: "krokyo",
      content: KROKYO_PROMPT,
      description: "Socratic method - asks questions to probe understanding before giving answers",
    },
    {
      name: "control",
      content: CONTROL_PROMPT,
      description: "Direct answers - gives complete explanations immediately",
    },
  ]).onConflictDoNothing();

  // Seed chapters
  console.log("Seeding chapters...");
  for (const chapter of chaptersData) {
    await db.insert(chapters).values({
      number: chapter.number,
      title: chapter.title,
      sortOrder: chapter.number,
      isActive: true,
    }).onConflictDoNothing();
  }

  // Seed topics
  console.log("Seeding topics...");
  for (const chapter of chaptersData) {
    for (let i = 0; i < chapter.topics.length; i++) {
      const topic = chapter.topics[i];
      await db.insert(topics).values({
        id: topic.id,
        name: topic.name,
        chapterNumber: topic.chapter,
        description: topic.description,
        sortOrder: i,
        isActive: true,
      }).onConflictDoNothing();
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
