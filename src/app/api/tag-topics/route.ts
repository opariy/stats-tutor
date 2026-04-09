import { NextRequest, NextResponse } from "next/server";
import { db, messages, messageTags, conversations, courseTopics } from "@/lib/db";
import { eq, desc, asc } from "drizzle-orm";
import { allTopics } from "@/lib/topics";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// Get topics for a course, or fall back to global topics
async function getTopicsForConversation(conversation: { courseId: string | null }) {
  if (conversation.courseId) {
    // Get course-specific topics
    const topics = await db.query.courseTopics.findMany({
      where: eq(courseTopics.courseId, conversation.courseId),
      orderBy: [asc(courseTopics.sortOrder)],
    });
    return {
      isCourse: true,
      topics: topics.map(t => ({
        id: t.id, // UUID for course topics
        slug: t.slug,
        name: t.name,
        description: t.description || '',
      })),
    };
  }
  // Fall back to global topics
  return {
    isCourse: false,
    topics: allTopics.map(t => ({
      id: t.id,
      slug: t.id,
      name: t.name,
      description: t.description,
    })),
  };
}

// POST /api/tag-topics - Auto-tag recent messages with detected topics
// Called async after chat exchanges
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Get the conversation to check if it's course-based
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
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

    // Get topics for this conversation (course-specific or global)
    const { isCourse, topics } = await getTopicsForConversation(conversation);

    // Get topic list for classification
    const topicList = topics
      .map((t) => `- ${isCourse ? t.id : t.slug}: ${t.name} (${t.description})`)
      .join("\n");

    // Use Claude to classify topics
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
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

    // Validate topic IDs against available topics
    const validTopicIds = new Set(topics.map((t) => isCourse ? t.id : t.slug));
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
        if (isCourse) {
          // For course topics, use courseTopicId field
          await db.insert(messageTags).values({
            messageId: userMessage.id,
            topicId: '', // Empty for course-based (legacy field)
            courseTopicId: topicId,
            confidence: 80,
          });
        } else {
          // For global topics, use topicId field
          await db.insert(messageTags).values({
            messageId: userMessage.id,
            topicId,
            confidence: 80,
          });
        }
        taggedCount++;
      } catch (error) {
        // Likely duplicate, skip
        console.log("Skipping duplicate tag:", topicId);
      }
    }

    // Set primary topic on conversation if not already set
    // Use the first (most relevant) detected topic
    if (!conversation.topicId && detectedTopics.length > 0) {
      // For course topics, we store the slug in topicId for now
      // (could be enhanced to use a separate courseTopicId field)
      const primaryTopicId = isCourse
        ? topics.find(t => t.id === detectedTopics[0])?.slug || detectedTopics[0]
        : detectedTopics[0];

      await db
        .update(conversations)
        .set({ topicId: primaryTopicId })
        .where(eq(conversations.id, conversationId));
    }

    return NextResponse.json({
      tagged: taggedCount,
      topics: detectedTopics,
      messageId: userMessage.id,
      primaryTopic: detectedTopics[0],
      isCourse,
    });
  } catch (error) {
    console.error("Topic tagging error:", error);
    return NextResponse.json({ error: "Failed to tag topics" }, { status: 500 });
  }
}
