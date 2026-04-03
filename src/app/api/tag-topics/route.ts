import { NextRequest, NextResponse } from "next/server";
import { db, messages, messageTags, conversations } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { allTopics } from "@/lib/topics";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// POST /api/tag-topics - Auto-tag recent messages with detected topics
// Called async after chat exchanges
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Get the last few untagged messages from this conversation
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: desc(messages.createdAt),
      limit: 4, // Last 2 exchanges (user + assistant pairs)
    });

    if (recentMessages.length === 0) {
      return NextResponse.json({ tagged: 0 });
    }

    // Combine recent messages into context for classification
    const messageContext = recentMessages
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    // Get topic list for classification
    const topicList = allTopics
      .map((t) => `- ${t.id}: ${t.name} (${t.description})`)
      .join("\n");

    // Use Claude to classify topics
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Classify this statistics tutoring conversation into topics. Return ONLY a JSON array of topic IDs that are being discussed. Return empty array [] if none match.

AVAILABLE TOPICS:
${topicList}

CONVERSATION:
${messageContext}

Respond with ONLY a JSON array like ["topic-id-1", "topic-id-2"] or []. No explanation.`,
        },
      ],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ tagged: 0 });
    }

    let detectedTopics: string[] = [];
    try {
      // Extract JSON array from response
      const match = content.text.match(/\[[\s\S]*\]/);
      if (match) {
        detectedTopics = JSON.parse(match[0]);
      }
    } catch {
      console.error("Failed to parse topic response:", content.text);
      return NextResponse.json({ tagged: 0 });
    }

    // Validate topic IDs
    const validTopicIds = new Set(allTopics.map((t) => t.id));
    detectedTopics = detectedTopics.filter((id) => validTopicIds.has(id));

    if (detectedTopics.length === 0) {
      return NextResponse.json({ tagged: 0 });
    }

    // Tag the most recent user message with detected topics
    const userMessage = recentMessages.find((m) => m.role === "user");
    if (!userMessage) {
      return NextResponse.json({ tagged: 0 });
    }

    // Insert topic tags (skip if already tagged with same topic)
    let taggedCount = 0;
    for (const topicId of detectedTopics) {
      try {
        await db.insert(messageTags).values({
          messageId: userMessage.id,
          topicId,
          confidence: 80, // Default confidence for LLM classification
        });
        taggedCount++;
      } catch (error) {
        // Likely duplicate, skip
        console.log("Skipping duplicate tag:", topicId);
      }
    }

    // Set primary topic on conversation if not already set
    // Use the first (most relevant) detected topic
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (conversation && !conversation.topicId && detectedTopics.length > 0) {
      await db
        .update(conversations)
        .set({ topicId: detectedTopics[0] })
        .where(eq(conversations.id, conversationId));
    }

    return NextResponse.json({
      tagged: taggedCount,
      topics: detectedTopics,
      messageId: userMessage.id,
      primaryTopic: detectedTopics[0],
    });
  } catch (error) {
    console.error("Topic tagging error:", error);
    return NextResponse.json({ error: "Failed to tag topics" }, { status: 500 });
  }
}
