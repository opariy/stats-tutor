import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import AdminLogin from "./admin-login";
import AdminDashboard from "./admin-dashboard";

async function getStats() {
  const [userStats] = await db
    .select({
      total: sql<number>`count(*)`,
      krokyo: sql<number>`count(*) filter (where "group" = 'krokyo')`,
      control: sql<number>`count(*) filter (where "group" = 'control')`,
    })
    .from(users);

  const [messageStats] = await db
    .select({
      total: sql<number>`count(*)`,
      userMessages: sql<number>`count(*) filter (where role = 'user')`,
      assistantMessages: sql<number>`count(*) filter (where role = 'assistant')`,
    })
    .from(messages);

  const [feedbackStats] = await db
    .select({
      total: sql<number>`count(*)`,
      thumbsUp: sql<number>`count(*) filter (where rating = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where rating = 'down')`,
    })
    .from(feedback);

  // Get feedback stats by group
  const feedbackByGroup = await db
    .select({
      group: users.group,
      thumbsUp: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where ${feedback.rating} = 'down')`,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.userId, users.id))
    .groupBy(users.group);

  // Get messages per user by group
  const messagesPerUserByGroup = await db
    .select({
      group: users.group,
      avgMessages: sql<number>`round(count(${messages.id})::numeric / nullif(count(distinct ${users.id}), 0), 1)`,
      totalUsers: sql<number>`count(distinct ${users.id})`,
      totalMessages: sql<number>`count(${messages.id})`,
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.role, "user"))
    .groupBy(users.group);

  // Get average response time by group
  const responseTimeByGroup = await db
    .select({
      group: users.group,
      avgResponseTime: sql<number>`round(avg(${messages.responseTimeMs}))`,
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(sql`${messages.responseTimeMs} is not null`)
    .groupBy(users.group);

  // Get daily activity (last 7 days)
  const dailyActivity = await db
    .select({
      date: sql<string>`to_char(${messages.createdAt}::date, 'MM/DD')`,
      count: sql<number>`count(*)`,
    })
    .from(messages)
    .where(sql`${messages.createdAt} >= now() - interval '7 days'`)
    .groupBy(sql`${messages.createdAt}::date`)
    .orderBy(sql`${messages.createdAt}::date`);

  // Get recent participants
  const recentUsers = await db
    .select({
      id: users.id,
      group: users.group,
      createdAt: users.createdAt,
      messageCount: sql<number>`count(${messages.id})`,
    })
    .from(users)
    .leftJoin(messages, eq(messages.userId, users.id))
    .groupBy(users.id, users.group, users.createdAt)
    .orderBy(desc(users.createdAt))
    .limit(10);

  return {
    users: userStats,
    messages: messageStats,
    feedback: feedbackStats,
    feedbackByGroup,
    messagesPerUserByGroup,
    responseTimeByGroup,
    dailyActivity,
    recentUsers,
  };
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export default async function AdminPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  const stats = await getStats();

  return <AdminDashboard stats={stats} />;
}
