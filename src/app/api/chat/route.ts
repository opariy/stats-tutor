import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getPromptForGroup } from "@/lib/prompts";
import { db, users, messages, conversations } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { logApiError } from "@/lib/api-error-logger";

const anthropic = new Anthropic();

async function getOrCreateUser(sessionId: string, group: "krokyo" | "control") {
  const email = `anon-${sessionId}@stats-tutor.local`;

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({ email, group })
      .returning();
    user = newUser;
  }

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const { messages: chatMessages, group = "krokyo", sessionId, conversationId } = await request.json();

    const systemPrompt = getPromptForGroup(group as "krokyo" | "control");
    const startTime = Date.now();

    // Get or create user for logging
    let user = null;
    if (sessionId) {
      user = await getOrCreateUser(sessionId, group as "krokyo" | "control");

      // Log user's message with conversationId
      const lastUserMessage = chatMessages[chatMessages.length - 1];
      if (lastUserMessage?.role === "user") {
        await db.insert(messages).values({
          userId: user.id,
          conversationId: conversationId || null,
          role: "user",
          content: lastUserMessage.content,
        });
      }

      // Update conversation's updated_at timestamp
      if (conversationId) {
        await db
          .update(conversations)
          .set({ updatedAt: sql`NOW()` })
          .where(eq(conversations.id, conversationId));
      }
    }

    // Use Anthropic SDK directly with streaming
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    let fullText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        stream.on("text", (text) => {
          fullText += text;
          controller.enqueue(encoder.encode(text));
        });

        stream.on("end", async () => {
          // Log assistant message when done
          if (user) {
            const responseTimeMs = Date.now() - startTime;
            await db.insert(messages).values({
              userId: user.id,
              conversationId: conversationId || null,
              role: "assistant",
              content: fullText,
              responseTimeMs,
            });

            // Auto-tag topics async (fire and forget)
            if (conversationId) {
              const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

              fetch(`${baseUrl}/api/tag-topics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId }),
              }).catch((err) => console.error("Topic tagging failed:", err));

              // Generate title if this is an early exchange (first 2 messages)
              if (chatMessages.length <= 2) {
                fetch(`${baseUrl}/api/conversations/${conversationId}/generate-title`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                }).catch((err) => console.error("Title generation failed:", err));
              }
            }
          }
          controller.close();
        });

        stream.on("error", (error) => {
          console.error("Stream error:", error);
          controller.error(error);
        });
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Log error to apiErrors table
    const { sessionId } = await request.clone().json().catch(() => ({}));
    await logApiError(
      "/api/chat",
      500,
      error instanceof Error ? error.message : "Unknown error",
      sessionId
    );

    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
