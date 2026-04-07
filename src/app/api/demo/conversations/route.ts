import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, conversations, messages } from "@/lib/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { getTopicById } from "@/lib/topics";

export async function GET() {
  try {
    // Get all demo conversations (using isDemo flag)
    const demoConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.isDemo, true))
      .orderBy(desc(conversations.updatedAt));

    if (demoConversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get users for these conversations
    const userIds = [...new Set(demoConversations.map((c) => c.userId))];
    const demoUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));
    const userMap = new Map(demoUsers.map((u) => [u.id, u]));

    // Get message counts for all conversations
    const conversationIds = demoConversations.map((c) => c.id);
    const messageCounts = await db
      .select({
        conversationId: messages.conversationId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .groupBy(messages.conversationId);

    const countMap = new Map(
      messageCounts.map((mc) => [mc.conversationId, Number(mc.count)])
    );

    // Format response with topic names and user info
    const formattedConversations = demoConversations.map((conv) => {
      const user = userMap.get(conv.userId);
      const topic = conv.topicId ? getTopicById(conv.topicId) : null;

      return {
        id: conv.id,
        topicId: conv.topicId,
        topicName: topic?.name || null,
        title: conv.title || topic?.name || "General",
        createdAt: conv.createdAt?.toISOString(),
        updatedAt: conv.updatedAt?.toISOString(),
        messageCount: countMap.get(conv.id) || 0,
        userName: user?.email || "Unknown",
        userGroup: user?.group || "krokyo",
      };
    });

    // Sort by message count descending - longest conversations (best quality) at top
    formattedConversations.sort((a, b) => b.messageCount - a.messageCount);

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error("Failed to fetch demo conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
