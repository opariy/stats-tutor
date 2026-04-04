import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../route";

// Mock the database module
vi.mock("@/lib/db", () => {
  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      conversations: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  };

  return {
    db: mockDb,
    users: { email: "email" },
    conversations: { id: "id", userId: "userId" },
    messages: { conversationId: "conversationId" },
    topicMastery: { userId: "userId", topicId: "topicId" },
  };
});

function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/mastery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/mastery");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url, { method: "GET" });
}

describe("POST /api/mastery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when sessionId is missing", async () => {
    const request = createRequest({
      topicId: "topic-1",
      conversationId: "conv-1",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("sessionId required");
  });

  it("returns 400 when topicId is missing", async () => {
    const request = createRequest({
      sessionId: "session-1",
      conversationId: "conv-1",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("topicId required");
  });

  it("returns 400 when conversationId is missing", async () => {
    const request = createRequest({
      sessionId: "session-1",
      topicId: "topic-1",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("conversationId required");
  });

  it("returns 404 when user not found", async () => {
    const { db } = await import("@/lib/db");
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = createRequest({
      sessionId: "session-1",
      topicId: "topic-1",
      conversationId: "conv-1",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 404 when conversation not found", async () => {
    const { db } = await import("@/lib/db");
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });
    (db.query.conversations.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = createRequest({
      sessionId: "session-1",
      topicId: "topic-1",
      conversationId: "conv-1",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });
});

describe("GET /api/mastery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when sessionId is missing", async () => {
    const request = createGetRequest({});

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.masteredTopics).toEqual([]);
  });

  it("returns empty array when user not found", async () => {
    const { db } = await import("@/lib/db");
    (db.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = createGetRequest({ sessionId: "session-1" });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.masteredTopics).toEqual([]);
  });
});
