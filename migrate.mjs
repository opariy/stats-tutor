import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Read DATABASE_URL from .env.local
const envFile = readFileSync(".env.local", "utf-8");
const match = envFile.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("Creating tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      "group" TEXT NOT NULL CHECK ("group" IN ('krokyo', 'control')),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  console.log("- users table created");

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  console.log("- sessions table created");

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      response_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  console.log("- messages table created");

  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id),
      user_id UUID NOT NULL REFERENCES users(id),
      rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  console.log("- feedback table created");

  // Conversations table for topic-based chat management
  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      topic_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  console.log("- conversations table created");

  // Add conversation_id column to messages if it doesn't exist
  await sql`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id)
  `;
  console.log("- conversation_id added to messages");

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user_topic ON conversations(user_id, topic_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`;
  console.log("- indexes created");

  console.log("Migration complete!");
}

migrate().catch(console.error);
