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

  // Create learning_objectives table if not exists
  console.log("Creating learning_objectives table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "learning_objectives" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "course_topic_id" uuid NOT NULL REFERENCES "course_topics"("id"),
      "objective" text NOT NULL,
      "check_method" text NOT NULL,
      "difficulty" text DEFAULT 'core' NOT NULL,
      "sort_order" integer DEFAULT 0,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  // Create student_objective_progress table if not exists
  console.log("Creating student_objective_progress table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "student_objective_progress" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id"),
      "objective_id" uuid NOT NULL REFERENCES "learning_objectives"("id"),
      "status" text DEFAULT 'not_started' NOT NULL,
      "attempts" integer DEFAULT 0 NOT NULL,
      "last_attempt_at" timestamp,
      "passed_at" timestamp,
      "conversation_id" uuid REFERENCES "conversations"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "unique_user_objective" UNIQUE("user_id", "objective_id")
    )
  `;

  // Create student_topic_status table if not exists
  console.log("Creating student_topic_status table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "student_topic_status" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id"),
      "course_topic_id" uuid NOT NULL REFERENCES "course_topics"("id"),
      "status" text DEFAULT 'locked' NOT NULL,
      "core_objectives_passed" integer DEFAULT 0 NOT NULL,
      "total_core_objectives" integer DEFAULT 0 NOT NULL,
      "unlocked_at" timestamp,
      "completed_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "unique_user_topic_status" UNIQUE("user_id", "course_topic_id")
    )
  `;

  // Create topic_quiz_results table if not exists
  console.log("Creating topic_quiz_results table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "topic_quiz_results" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id"),
      "course_topic_id" uuid NOT NULL REFERENCES "course_topics"("id"),
      "quiz_type" text NOT NULL,
      "questions_json" jsonb NOT NULL,
      "answers_json" jsonb,
      "score" integer,
      "passed" boolean DEFAULT false,
      "completed_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  // Create indexes for knowledge check system
  console.log("Creating indexes for knowledge check system...");
  await sql`CREATE INDEX IF NOT EXISTS "idx_objectives_topic" ON "learning_objectives"("course_topic_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_progress_user" ON "student_objective_progress"("user_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_progress_objective" ON "student_objective_progress"("objective_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_status_user" ON "student_topic_status"("user_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_status_topic" ON "student_topic_status"("course_topic_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_quiz_user" ON "topic_quiz_results"("user_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_quiz_topic" ON "topic_quiz_results"("course_topic_id")`;

  console.log("Migrations complete!");
}

migrate().catch(console.error);
