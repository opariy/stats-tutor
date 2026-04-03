import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Running migrations...");

  // Create chapters table if not exists
  console.log("Creating chapters table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "chapters" (
      "id" serial PRIMARY KEY NOT NULL,
      "number" integer NOT NULL,
      "title" text NOT NULL,
      "sort_order" integer DEFAULT 0,
      "is_active" boolean DEFAULT true,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "chapters_number_unique" UNIQUE("number")
    )
  `;

  // Create system_prompts table if not exists
  console.log("Creating system_prompts table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "system_prompts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "content" text NOT NULL,
      "description" text,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "system_prompts_name_unique" UNIQUE("name")
    )
  `;

  // Create topics table if not exists
  console.log("Creating topics table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "topics" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "chapter_number" integer NOT NULL,
      "description" text NOT NULL,
      "sort_order" integer DEFAULT 0,
      "is_active" boolean DEFAULT true,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  console.log("Migrations complete!");
}

migrate().catch(console.error);
