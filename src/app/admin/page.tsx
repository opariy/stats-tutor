import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { getAllMetrics } from "@/lib/admin-metrics";
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

  // === TECH METRICS ===

  // Reply rate: % of user messages that got a response
  const [replyRateStats] = await db
    .select({
      userMsgs: sql<number>`count(*) filter (where role = 'user')`,
      assistantMsgs: sql<number>`count(*) filter (where role = 'assistant')`,
    })
    .from(messages);

  // Response time stats (avg and p95)
  const [responseTimeStats] = await db
    .select({
      avgResponseTime: sql<number>`round(avg(${messages.responseTimeMs}))`,
      p95ResponseTime: sql<number>`round(percentile_cont(0.95) within group (order by ${messages.responseTimeMs}))`,
      minResponseTime: sql<number>`round(min(${messages.responseTimeMs}))`,
      maxResponseTime: sql<number>`round(max(${messages.responseTimeMs}))`,
    })
    .from(messages)
    .where(sql`${messages.responseTimeMs} is not null`);

  // === PRODUCT METRICS ===

  // Sessions: group messages by 30-min gaps using window functions
  const sessionStats = await db.execute(sql`
    WITH message_gaps AS (
      SELECT
        user_id,
        created_at,
        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at))) / 60 as gap_minutes
      FROM messages
    ),
    session_boundaries AS (
      SELECT
        user_id,
        created_at,
        CASE WHEN gap_minutes IS NULL OR gap_minutes > 30 THEN 1 ELSE 0 END as is_new_session
      FROM message_gaps
    ),
    sessions AS (
      SELECT
        user_id,
        created_at,
        SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY created_at) as session_id
      FROM session_boundaries
    ),
    session_durations AS (
      SELECT
        user_id,
        session_id,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as duration_minutes,
        COUNT(*) as message_count
      FROM sessions
      GROUP BY user_id, session_id
    )
    SELECT
      COUNT(*) as total_sessions,
      ROUND(AVG(duration_minutes)::numeric, 1) as avg_session_duration,
      ROUND(AVG(message_count)::numeric, 1) as avg_messages_per_session,
      ROUND(SUM(duration_minutes)::numeric, 1) as total_session_time
    FROM session_durations
  `);

  const sessionData = sessionStats.rows[0] as {
    total_sessions: number;
    avg_session_duration: number;
    avg_messages_per_session: number;
    total_session_time: number;
  };

  // Retention: users who came back on day 1 and day 7
  const retentionStats = await db.execute(sql`
    WITH user_days AS (
      SELECT
        user_id,
        DATE(created_at) as message_date,
        MIN(DATE(created_at)) OVER (PARTITION BY user_id) as first_day
      FROM messages
      GROUP BY user_id, DATE(created_at)
    ),
    user_retention AS (
      SELECT
        user_id,
        first_day,
        MAX(CASE WHEN message_date = first_day + 1 THEN 1 ELSE 0 END) as returned_d1,
        MAX(CASE WHEN message_date >= first_day + 7 THEN 1 ELSE 0 END) as returned_d7
      FROM user_days
      GROUP BY user_id, first_day
    )
    SELECT
      COUNT(*) as total_users,
      SUM(returned_d1) as retained_d1,
      SUM(returned_d7) as retained_d7,
      ROUND(100.0 * SUM(returned_d1) / NULLIF(COUNT(*), 0), 1) as retention_d1_pct,
      ROUND(100.0 * SUM(returned_d7) / NULLIF(COUNT(*), 0), 1) as retention_d7_pct
    FROM user_retention
  `);

  const retentionData = retentionStats.rows[0] as {
    total_users: number;
    retained_d1: number;
    retained_d7: number;
    retention_d1_pct: number;
    retention_d7_pct: number;
  };

  // Drop-off: users with only 1 session
  const dropOffStats = await db.execute(sql`
    WITH user_sessions AS (
      SELECT
        user_id,
        COUNT(DISTINCT DATE(created_at)) as session_days
      FROM messages
      GROUP BY user_id
    )
    SELECT
      COUNT(*) as total_users,
      SUM(CASE WHEN session_days = 1 THEN 1 ELSE 0 END) as single_session_users,
      ROUND(100.0 * SUM(CASE WHEN session_days = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as drop_off_pct
    FROM user_sessions
  `);

  const dropOffData = dropOffStats.rows[0] as {
    total_users: number;
    single_session_users: number;
    drop_off_pct: number;
  };

  // Bounce rate: users with ≤2 messages
  const [bounceStats] = await db
    .select({
      totalUsers: sql<number>`count(distinct user_id)`,
      bouncedUsers: sql<number>`count(distinct user_id) filter (where msg_count <= 2)`,
    })
    .from(
      db
        .select({
          userId: messages.userId,
          msgCount: sql<number>`count(*)`.as('msg_count'),
        })
        .from(messages)
        .groupBy(messages.userId)
        .as('user_msg_counts')
    );

  // Feedback rate: % of assistant messages that got feedback
  const [feedbackRateStats] = await db
    .select({
      assistantMsgs: sql<number>`count(distinct ${messages.id}) filter (where ${messages.role} = 'assistant')`,
      feedbackCount: sql<number>`count(distinct ${feedback.messageId})`,
    })
    .from(messages)
    .leftJoin(feedback, eq(feedback.messageId, messages.id));

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

  // Tech metrics summary
  const techMetrics = {
    replyRate: replyRateStats.userMsgs > 0
      ? Math.round((replyRateStats.assistantMsgs / replyRateStats.userMsgs) * 100)
      : 0,
    avgResponseTime: responseTimeStats.avgResponseTime || 0,
    p95ResponseTime: responseTimeStats.p95ResponseTime || 0,
    minResponseTime: responseTimeStats.minResponseTime || 0,
    maxResponseTime: responseTimeStats.maxResponseTime || 0,
  };

  // Product metrics summary
  const productMetrics = {
    totalSessions: Number(sessionData?.total_sessions) || 0,
    avgSessionDuration: Number(sessionData?.avg_session_duration) || 0,
    avgMessagesPerSession: Number(sessionData?.avg_messages_per_session) || 0,
    totalSessionTime: Number(sessionData?.total_session_time) || 0,
    retentionD1: Number(retentionData?.retention_d1_pct) || 0,
    retentionD7: Number(retentionData?.retention_d7_pct) || 0,
    dropOffRate: Number(dropOffData?.drop_off_pct) || 0,
    bounceRate: bounceStats.totalUsers > 0
      ? Math.round((bounceStats.bouncedUsers / bounceStats.totalUsers) * 100)
      : 0,
    feedbackRate: feedbackRateStats.assistantMsgs > 0
      ? Math.round((feedbackRateStats.feedbackCount / feedbackRateStats.assistantMsgs) * 100)
      : 0,
  };

  return {
    users: userStats,
    messages: messageStats,
    feedback: feedbackStats,
    feedbackByGroup,
    messagesPerUserByGroup,
    responseTimeByGroup,
    dailyActivity,
    recentUsers,
    techMetrics,
    productMetrics,
  };
}

export default async function AdminPage() {
  // Run legacy stats and new metrics in parallel
  const [stats, pillarMetrics] = await Promise.all([
    getStats(),
    getAllMetrics(),
  ]);

  return <AdminDashboard stats={stats} pillarMetrics={pillarMetrics} />;
}
