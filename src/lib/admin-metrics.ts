import { db } from "@/lib/db";
import {
  users,
  messages,
  feedback,
  apiErrors,
  conversations,
  topicMastery,
  messageTags,
} from "@/lib/db/schema";
import { sql, eq, desc, and, isNotNull } from "drizzle-orm";

// === TECH METRICS ===
// Reply rate, response times, error rate

export interface TechMetrics {
  replyRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  totalErrors24h: number;
}

export async function getTechMetrics(): Promise<TechMetrics> {
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
      avgResponseTime: sql<number>`coalesce(round(avg(${messages.responseTimeMs})), 0)`,
      p95ResponseTime: sql<number>`coalesce(round(percentile_cont(0.95) within group (order by ${messages.responseTimeMs})), 0)`,
      minResponseTime: sql<number>`coalesce(round(min(${messages.responseTimeMs})), 0)`,
      maxResponseTime: sql<number>`coalesce(round(max(${messages.responseTimeMs})), 0)`,
    })
    .from(messages)
    .where(isNotNull(messages.responseTimeMs));

  // Error rate: errors in last 24h vs total API calls
  const [errorStats] = await db
    .select({
      totalErrors24h: sql<number>`count(*)`,
    })
    .from(apiErrors)
    .where(sql`${apiErrors.createdAt} >= now() - interval '24 hours'`);

  // Count total API calls (approximated by messages in last 24h)
  const [callStats] = await db
    .select({
      totalCalls24h: sql<number>`count(*)`,
    })
    .from(messages)
    .where(sql`${messages.createdAt} >= now() - interval '24 hours'`);

  const totalErrors = errorStats?.totalErrors24h || 0;
  const totalCalls = callStats?.totalCalls24h || 0;
  const errorRate = totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100 * 100) / 100 : 0;

  return {
    replyRate:
      replyRateStats.userMsgs > 0
        ? Math.round((replyRateStats.assistantMsgs / replyRateStats.userMsgs) * 100)
        : 0,
    avgResponseTime: responseTimeStats?.avgResponseTime || 0,
    p95ResponseTime: responseTimeStats?.p95ResponseTime || 0,
    minResponseTime: responseTimeStats?.minResponseTime || 0,
    maxResponseTime: responseTimeStats?.maxResponseTime || 0,
    errorRate,
    totalErrors24h: totalErrors,
  };
}

// === PRODUCT METRICS ===
// Sessions, retention, bounce, drop-off, feedback

export interface ProductMetrics {
  totalSessions: number;
  avgSessionDuration: number;
  avgMessagesPerSession: number;
  totalSessionTime: number;
  retentionD1: number;
  retentionD7: number;
  dropOffRate: number;
  bounceRate: number;
  feedbackRate: number;
  satisfactionRate: number;
}

export async function getProductMetrics(): Promise<ProductMetrics> {
  // Sessions: group messages by 30-min gaps
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
  } | undefined;

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
  } | undefined;

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
  } | undefined;

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
          msgCount: sql<number>`count(*)`.as("msg_count"),
        })
        .from(messages)
        .groupBy(messages.userId)
        .as("user_msg_counts")
    );

  // Feedback rate: % of assistant messages that got feedback
  const [feedbackRateStats] = await db
    .select({
      assistantMsgs: sql<number>`count(distinct ${messages.id}) filter (where ${messages.role} = 'assistant')`,
      feedbackCount: sql<number>`count(distinct ${feedback.messageId})`,
    })
    .from(messages)
    .leftJoin(feedback, eq(feedback.messageId, messages.id));

  // Satisfaction rate: % of feedback that is positive
  const [satisfactionStats] = await db
    .select({
      total: sql<number>`count(*)`,
      positive: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
    })
    .from(feedback);

  return {
    totalSessions: Number(sessionData?.total_sessions) || 0,
    avgSessionDuration: Number(sessionData?.avg_session_duration) || 0,
    avgMessagesPerSession: Number(sessionData?.avg_messages_per_session) || 0,
    totalSessionTime: Number(sessionData?.total_session_time) || 0,
    retentionD1: Number(retentionData?.retention_d1_pct) || 0,
    retentionD7: Number(retentionData?.retention_d7_pct) || 0,
    dropOffRate: Number(dropOffData?.drop_off_pct) || 0,
    bounceRate:
      bounceStats.totalUsers > 0
        ? Math.round((bounceStats.bouncedUsers / bounceStats.totalUsers) * 100)
        : 0,
    feedbackRate:
      feedbackRateStats.assistantMsgs > 0
        ? Math.round((feedbackRateStats.feedbackCount / feedbackRateStats.assistantMsgs) * 100)
        : 0,
    satisfactionRate:
      satisfactionStats.total > 0
        ? Math.round((satisfactionStats.positive / satisfactionStats.total) * 100)
        : 0,
  };
}

// === LEARNING METRICS ===
// Topics started, mastery, completion, abandonment

export interface LearningMetrics {
  topicsStarted: number;
  topicsMastered: number;
  completionRate: number;
  avgTimeToMastery: number;
  abandonmentRate: number;
  topTopics: { topicId: string; count: number }[];
}

export async function getLearningMetrics(): Promise<LearningMetrics> {
  // Topics started: unique topics with conversations
  const [topicsStartedStats] = await db
    .select({
      count: sql<number>`count(distinct ${conversations.topicId})`,
    })
    .from(conversations)
    .where(isNotNull(conversations.topicId));

  // Topics mastered: from topic_mastery table
  const [masteryStats] = await db
    .select({
      totalMastered: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct ${topicMastery.userId})`,
      uniqueTopics: sql<number>`count(distinct ${topicMastery.topicId})`,
    })
    .from(topicMastery);

  // Average time to mastery: time between first message and mastery declaration
  const avgTimeToMasteryStats = await db.execute(sql`
    WITH first_messages AS (
      SELECT
        c.user_id,
        c.topic_id,
        MIN(m.created_at) as first_message_at
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      WHERE c.topic_id IS NOT NULL
      GROUP BY c.user_id, c.topic_id
    )
    SELECT
      ROUND(AVG(EXTRACT(EPOCH FROM (tm.declared_at - fm.first_message_at)) / 60)::numeric, 1) as avg_minutes
    FROM topic_mastery tm
    JOIN first_messages fm ON tm.user_id = fm.user_id AND tm.topic_id = fm.topic_id
  `);

  const avgTimeData = avgTimeToMasteryStats.rows[0] as { avg_minutes: number } | undefined;

  // Abandonment rate: topics started but not mastered (no activity in 7 days)
  const abandonmentStats = await db.execute(sql`
    WITH topic_activity AS (
      SELECT
        c.user_id,
        c.topic_id,
        MAX(m.created_at) as last_activity
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      WHERE c.topic_id IS NOT NULL
      GROUP BY c.user_id, c.topic_id
    ),
    not_mastered AS (
      SELECT ta.user_id, ta.topic_id, ta.last_activity
      FROM topic_activity ta
      LEFT JOIN topic_mastery tm ON ta.user_id = tm.user_id AND ta.topic_id = tm.topic_id
      WHERE tm.id IS NULL
    )
    SELECT
      COUNT(*) as total_not_mastered,
      SUM(CASE WHEN last_activity < now() - interval '7 days' THEN 1 ELSE 0 END) as abandoned
    FROM not_mastered
  `);

  const abandonmentData = abandonmentStats.rows[0] as {
    total_not_mastered: number;
    abandoned: number;
  } | undefined;

  // Top topics by message count
  const topTopics = await db
    .select({
      topicId: messageTags.topicId,
      count: sql<number>`count(*)`,
    })
    .from(messageTags)
    .groupBy(messageTags.topicId)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const topicsStarted = topicsStartedStats?.count || 0;
  const topicsMastered = masteryStats?.uniqueTopics || 0;
  const totalNotMastered = Number(abandonmentData?.total_not_mastered) || 0;
  const abandoned = Number(abandonmentData?.abandoned) || 0;

  return {
    topicsStarted,
    topicsMastered,
    completionRate: topicsStarted > 0 ? Math.round((topicsMastered / topicsStarted) * 100) : 0,
    avgTimeToMastery: Number(avgTimeData?.avg_minutes) || 0,
    abandonmentRate: totalNotMastered > 0 ? Math.round((abandoned / totalNotMastered) * 100) : 0,
    topTopics: topTopics.map((t) => ({
      topicId: t.topicId,
      count: t.count,
    })),
  };
}

// Get all metrics in parallel
export async function getAllMetrics() {
  const [techMetrics, productMetrics, learningMetrics] = await Promise.all([
    getTechMetrics(),
    getProductMetrics(),
    getLearningMetrics(),
  ]);

  return { techMetrics, productMetrics, learningMetrics };
}
