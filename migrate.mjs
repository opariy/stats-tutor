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

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`;
  console.log("- indexes created");

  console.log("Migration complete!");
}

migrate().catch(console.error);
