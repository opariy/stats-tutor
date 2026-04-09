import { db } from "@/lib/db";
import {
  users,
  messages,
  conversations,
  topicMastery,
  courseEnrollments,
  professorInsights,
} from "@/lib/db/schema";
import { sql, eq, and, inArray, desc } from "drizzle-orm";
import { generateText } from "ai";
import { allTopics, getTopicById } from "@/lib/topics";

// === TYPES ===

export interface StuckPoint {
  topicId: string;
  topicName: string;
  studentCount: number;
  avgStruggleTime: number; // minutes spent without mastery
  suggestion?: string;
  excerpts?: { userId: string; userName?: string; excerpt: string }[];
}

export interface MisconceptionData {
  topicId: string;
  topicName: string;
  pattern: string;
  frequency: number;
  studentCount: number;
}

export interface StudentSummary {
  id: string;
  email: string;
  healthStatus: "healthy" | "at-risk" | "stuck" | "not-started";
  topicsStarted: number;
  topicsMastered: number;
  lastActive: Date | null;
  avgSessionMinutes: number;
}

export interface StudentDetail extends StudentSummary {
  recentTopics: { topicId: string; topicName: string; status: "mastered" | "in-progress" | "abandoned" }[];
  strugglingWith: string[];
  totalMessages: number;
  enrolledAt: Date;
}

export interface ClassHealth {
  totalStudents: number;
  activeStudents7d: number;
  avgTopicsMastered: number;
  avgSessionMinutes: number;
  healthyCount: number;
  atRiskCount: number;
  stuckCount: number;
  notStartedCount: number;
  engagementTrend: "up" | "down" | "stable";
}

// === HELPERS ===

async function getEnrolledUserIds(courseId: string): Promise<string[]> {
  const enrollments = await db
    .select({ userId: courseEnrollments.userId })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.courseId, courseId));

  return enrollments.map((e) => e.userId);
}

// Helper to convert JS array to SQL array format for ANY() clauses
// Uses raw SQL since UUIDs are from our database (safe)
function sqlArray(ids: string[]) {
  if (ids.length === 0) return sql.raw(`ARRAY[]::uuid[]`);
  // Format as: ARRAY['uuid1','uuid2',...]::uuid[]
  const formatted = ids.map(id => `'${id}'`).join(',');
  return sql.raw(`ARRAY[${formatted}]::uuid[]`);
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// === STUCK POINTS ===

export async function getStuckPoints(
  courseId: string,
  days = 7,
  includeExcerpts = false
): Promise<StuckPoint[]> {
  const userIds = await getEnrolledUserIds(courseId);

  if (userIds.length === 0) {
    return [];
  }

  // Find topics where students have messages but no mastery
  const stuckTopicsResult = await db.execute(sql`
    WITH enrolled_activity AS (
      SELECT
        c.user_id,
        c.topic_id,
        MIN(m.created_at) as first_message,
        MAX(m.created_at) as last_message,
        COUNT(m.id) as message_count,
        EXTRACT(EPOCH FROM (MAX(m.created_at) - MIN(m.created_at))) / 60 as time_spent
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      WHERE c.topic_id IS NOT NULL
        AND c.user_id = ANY(${sqlArray(userIds)})
        AND m.created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY c.user_id, c.topic_id
    ),
    stuck_topics AS (
      SELECT
        ea.topic_id,
        COUNT(DISTINCT ea.user_id) as student_count,
        ROUND(AVG(ea.time_spent)::numeric, 1) as avg_struggle_time
      FROM enrolled_activity ea
      LEFT JOIN topic_mastery tm ON ea.user_id = tm.user_id AND ea.topic_id = tm.topic_id
      WHERE tm.id IS NULL
        AND ea.message_count >= 3
      GROUP BY ea.topic_id
      ORDER BY student_count DESC
      LIMIT 5
    )
    SELECT * FROM stuck_topics
  `);

  const stuckTopics = stuckTopicsResult.rows as {
    topic_id: string;
    student_count: number;
    avg_struggle_time: number;
  }[];

  // Build stuck points with optional AI suggestions
  const stuckPoints: StuckPoint[] = [];

  for (const row of stuckTopics) {
    const topic = getTopicById(row.topic_id);
    const topicName = topic?.name || row.topic_id;

    let excerpts: StuckPoint["excerpts"] = undefined;
    let suggestion: string | undefined = undefined;

    if (includeExcerpts) {
      // Get sample excerpts from struggling students
      const excerptResult = await db.execute(sql`
        SELECT
          m.user_id,
          u.email,
          m.content
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN users u ON m.user_id = u.id
        WHERE c.topic_id = ${row.topic_id}
          AND m.user_id = ANY(${sqlArray(userIds)})
          AND m.role = 'user'
        ORDER BY m.created_at DESC
        LIMIT 5
      `);

      excerpts = (excerptResult.rows as { user_id: string; email: string; content: string }[]).map((r) => ({
        userId: r.user_id,
        userName: r.email.split("@")[0],
        excerpt: r.content.slice(0, 200),
      }));
    }

    // Check for cached AI suggestion
    const cacheDate = getTodayDateString();
    const cachedInsight = await db.query.professorInsights.findFirst({
      where: and(
        eq(professorInsights.courseId, courseId),
        eq(professorInsights.topicId, row.topic_id),
        eq(professorInsights.cacheDate, cacheDate)
      ),
    });

    if (cachedInsight) {
      suggestion = cachedInsight.suggestion;
    } else if (row.student_count >= 2) {
      // Generate AI suggestion for topics where multiple students struggle
      suggestion = await generateStuckPointSuggestion(
        topicName,
        row.student_count,
        topic?.description || ""
      );

      // Cache the suggestion
      await db.insert(professorInsights).values({
        courseId,
        topicId: row.topic_id,
        cacheDate,
        suggestion,
        studentCount: row.student_count,
      }).onConflictDoUpdate({
        target: [professorInsights.courseId, professorInsights.topicId, professorInsights.cacheDate],
        set: { suggestion, studentCount: row.student_count },
      });
    }

    stuckPoints.push({
      topicId: row.topic_id,
      topicName,
      studentCount: row.student_count,
      avgStruggleTime: row.avg_struggle_time,
      suggestion,
      excerpts,
    });
  }

  return stuckPoints;
}

async function generateStuckPointSuggestion(
  topicName: string,
  studentCount: number,
  topicDescription: string
): Promise<string> {
  try {
    const result = await generateText({
      model: "anthropic/claude-3-5-sonnet-latest",
      prompt: `${studentCount} students are struggling with "${topicName}" (${topicDescription}).

As an experienced statistics professor, suggest ONE specific intervention the instructor could try in class. Be concise (2-3 sentences max). Focus on a common misconception or teaching approach that helps.

Example format: "Consider demonstrating X with a concrete example. Students often confuse Y with Z."`,
    });

    return result.text.trim();
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return "";
  }
}

// === MISCONCEPTIONS ===

export async function getMisconceptions(courseId: string): Promise<MisconceptionData[]> {
  const userIds = await getEnrolledUserIds(courseId);

  if (userIds.length === 0) {
    return [];
  }

  // Analyze message patterns for common misconceptions
  // This is a simplified version - in production you'd use NLP/AI for pattern detection
  const misconceptionPatterns = await db.execute(sql`
    WITH topic_messages AS (
      SELECT
        c.topic_id,
        m.content,
        m.user_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.topic_id IS NOT NULL
        AND m.user_id = ANY(${sqlArray(userIds)})
        AND m.role = 'user'
        AND m.created_at >= NOW() - INTERVAL '30 days'
    ),
    pattern_counts AS (
      SELECT
        topic_id,
        CASE
          WHEN content ILIKE '%confused%' OR content ILIKE '%don''t understand%' THEN 'confusion'
          WHEN content ILIKE '%formula%' OR content ILIKE '%equation%' THEN 'formula-trouble'
          WHEN content ILIKE '%when to use%' OR content ILIKE '%which test%' THEN 'application'
          WHEN content ILIKE '%wrong%' OR content ILIKE '%mistake%' THEN 'errors'
          ELSE 'general'
        END as pattern,
        COUNT(DISTINCT user_id) as student_count,
        COUNT(*) as frequency
      FROM topic_messages
      GROUP BY topic_id, pattern
      HAVING COUNT(DISTINCT user_id) >= 2
    )
    SELECT * FROM pattern_counts
    WHERE pattern != 'general'
    ORDER BY student_count DESC, frequency DESC
    LIMIT 20
  `);

  return (misconceptionPatterns.rows as {
    topic_id: string;
    pattern: string;
    student_count: number;
    frequency: number;
  }[]).map((row) => {
    const topic = getTopicById(row.topic_id);
    return {
      topicId: row.topic_id,
      topicName: topic?.name || row.topic_id,
      pattern: row.pattern,
      frequency: row.frequency,
      studentCount: row.student_count,
    };
  });
}

// === STUDENT LIST ===

export async function getStudentList(courseId: string): Promise<StudentSummary[]> {
  const userIds = await getEnrolledUserIds(courseId);

  if (userIds.length === 0) {
    return [];
  }

  const studentData = await db.execute(sql`
    WITH student_stats AS (
      SELECT
        u.id,
        u.email,
        COUNT(DISTINCT c.topic_id) FILTER (WHERE c.topic_id IS NOT NULL) as topics_started,
        COUNT(DISTINCT tm.topic_id) as topics_mastered,
        MAX(m.created_at) as last_active
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id
      LEFT JOIN messages m ON m.user_id = u.id
      LEFT JOIN topic_mastery tm ON tm.user_id = u.id
      WHERE u.id = ANY(${sqlArray(userIds)})
      GROUP BY u.id, u.email
    )
    SELECT
      id,
      email,
      topics_started,
      topics_mastered,
      last_active,
      0 as avg_session_minutes,
      CASE
        WHEN last_active IS NULL OR topics_started = 0 THEN 'not-started'
        WHEN last_active < NOW() - INTERVAL '7 days' AND topics_mastered < topics_started / 2 THEN 'stuck'
        WHEN last_active < NOW() - INTERVAL '3 days' OR topics_mastered < topics_started / 3 THEN 'at-risk'
        ELSE 'healthy'
      END as health_status
    FROM student_stats
    ORDER BY
      CASE
        WHEN last_active IS NULL OR topics_started = 0 THEN 0
        WHEN last_active < NOW() - INTERVAL '7 days' AND topics_mastered < topics_started / 2 THEN 1
        WHEN last_active < NOW() - INTERVAL '3 days' OR topics_mastered < topics_started / 3 THEN 2
        ELSE 3
      END,
      last_active DESC NULLS LAST
  `);

  return (studentData.rows as {
    id: string;
    email: string;
    health_status: "healthy" | "at-risk" | "stuck" | "not-started";
    topics_started: number;
    topics_mastered: number;
    last_active: Date | null;
    avg_session_minutes: number;
  }[]).map((row) => ({
    id: row.id,
    email: row.email,
    healthStatus: row.health_status,
    topicsStarted: row.topics_started,
    topicsMastered: row.topics_mastered,
    lastActive: row.last_active,
    avgSessionMinutes: row.avg_session_minutes,
  }));
}

// === STUDENT DETAIL ===

export async function getStudentDetail(
  courseId: string,
  studentId: string
): Promise<StudentDetail | null> {
  const userIds = await getEnrolledUserIds(courseId);

  if (!userIds.includes(studentId)) {
    return null;
  }

  // Get basic student info
  const student = await db.query.users.findFirst({
    where: eq(users.id, studentId),
  });

  if (!student) {
    return null;
  }

  // Get enrollment date
  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(
      eq(courseEnrollments.courseId, courseId),
      eq(courseEnrollments.userId, studentId)
    ),
  });

  // Get recent topic activity
  const topicActivity = await db.execute(sql`
    WITH topic_status AS (
      SELECT
        c.topic_id,
        MAX(m.created_at) as last_activity,
        tm.id as mastery_id
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN topic_mastery tm ON tm.user_id = c.user_id AND tm.topic_id = c.topic_id
      WHERE c.user_id = ${studentId}
        AND c.topic_id IS NOT NULL
      GROUP BY c.topic_id, tm.id
    )
    SELECT
      topic_id,
      CASE
        WHEN mastery_id IS NOT NULL THEN 'mastered'
        WHEN last_activity < NOW() - INTERVAL '7 days' THEN 'abandoned'
        ELSE 'in-progress'
      END as status
    FROM topic_status
    ORDER BY last_activity DESC
    LIMIT 10
  `);

  const recentTopics = (topicActivity.rows as { topic_id: string; status: string }[]).map((row) => {
    const topic = getTopicById(row.topic_id);
    return {
      topicId: row.topic_id,
      topicName: topic?.name || row.topic_id,
      status: row.status as "mastered" | "in-progress" | "abandoned",
    };
  });

  // Get struggling topics (many messages, no mastery)
  const strugglingResult = await db.execute(sql`
    SELECT c.topic_id
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    LEFT JOIN topic_mastery tm ON tm.user_id = c.user_id AND tm.topic_id = c.topic_id
    WHERE c.user_id = ${studentId}
      AND c.topic_id IS NOT NULL
      AND tm.id IS NULL
    GROUP BY c.topic_id
    HAVING COUNT(m.id) >= 5
  `);

  const strugglingWith = (strugglingResult.rows as { topic_id: string }[]).map((row) => {
    const topic = getTopicById(row.topic_id);
    return topic?.name || row.topic_id;
  });

  // Get message count
  const [messageStats] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(eq(messages.userId, studentId));

  // Get mastery count
  const [masteryStats] = await db
    .select({ count: sql<number>`count(*)` })
    .from(topicMastery)
    .where(eq(topicMastery.userId, studentId));

  // Get topics started
  const [topicsStartedStats] = await db
    .select({ count: sql<number>`count(distinct topic_id)` })
    .from(conversations)
    .where(eq(conversations.userId, studentId));

  // Get last active
  const [lastActiveStats] = await db
    .select({ lastActive: sql<Date>`max(created_at)` })
    .from(messages)
    .where(eq(messages.userId, studentId));

  // Determine health status
  const topicsStarted = topicsStartedStats?.count || 0;
  const topicsMastered = masteryStats?.count || 0;
  const lastActive = lastActiveStats?.lastActive || null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  let healthStatus: "healthy" | "at-risk" | "stuck" | "not-started" = "healthy";
  if (!lastActive || topicsStarted === 0) {
    healthStatus = "not-started";
  } else if (lastActive < sevenDaysAgo && topicsMastered < topicsStarted / 2) {
    healthStatus = "stuck";
  } else if (lastActive < threeDaysAgo || topicsMastered < topicsStarted / 3) {
    healthStatus = "at-risk";
  }

  return {
    id: student.id,
    email: student.email,
    healthStatus,
    topicsStarted,
    topicsMastered,
    lastActive,
    avgSessionMinutes: 0, // Would need session calculation
    recentTopics,
    strugglingWith,
    totalMessages: messageStats?.count || 0,
    enrolledAt: enrollment?.enrolledAt || student.createdAt,
  };
}

// === CLASS HEALTH ===

export async function getClassHealth(courseId: string): Promise<ClassHealth> {
  const userIds = await getEnrolledUserIds(courseId);

  if (userIds.length === 0) {
    return {
      totalStudents: 0,
      activeStudents7d: 0,
      avgTopicsMastered: 0,
      avgSessionMinutes: 0,
      healthyCount: 0,
      atRiskCount: 0,
      stuckCount: 0,
      notStartedCount: 0,
      engagementTrend: "stable",
    };
  }

  const healthStats = await db.execute(sql`
    WITH student_metrics AS (
      SELECT
        u.id,
        COUNT(DISTINCT tm.topic_id) as topics_mastered,
        COUNT(DISTINCT c.topic_id) FILTER (WHERE c.topic_id IS NOT NULL) as topics_started,
        MAX(m.created_at) as last_active,
        COUNT(m.id) FILTER (WHERE m.created_at >= NOW() - INTERVAL '7 days') as messages_7d,
        COUNT(m.id) FILTER (WHERE m.created_at >= NOW() - INTERVAL '14 days' AND m.created_at < NOW() - INTERVAL '7 days') as messages_prev_7d
      FROM users u
      LEFT JOIN topic_mastery tm ON tm.user_id = u.id
      LEFT JOIN conversations c ON c.user_id = u.id
      LEFT JOIN messages m ON m.user_id = u.id
      WHERE u.id = ANY(${sqlArray(userIds)})
      GROUP BY u.id
    ),
    health_status AS (
      SELECT
        id,
        topics_mastered,
        topics_started,
        messages_7d,
        messages_prev_7d,
        CASE
          WHEN last_active IS NULL OR topics_started = 0 THEN 'not-started'
          WHEN last_active < NOW() - INTERVAL '7 days' AND topics_mastered < topics_started / 2 THEN 'stuck'
          WHEN last_active < NOW() - INTERVAL '3 days' OR topics_mastered < topics_started / 3 THEN 'at-risk'
          ELSE 'healthy'
        END as status,
        CASE WHEN last_active >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END as active_7d
      FROM student_metrics
    )
    SELECT
      COUNT(*) as total_students,
      SUM(active_7d) as active_students_7d,
      ROUND(AVG(topics_mastered)::numeric, 1) as avg_topics_mastered,
      SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
      SUM(CASE WHEN status = 'at-risk' THEN 1 ELSE 0 END) as at_risk_count,
      SUM(CASE WHEN status = 'stuck' THEN 1 ELSE 0 END) as stuck_count,
      SUM(CASE WHEN status = 'not-started' THEN 1 ELSE 0 END) as not_started_count,
      SUM(messages_7d) as total_messages_7d,
      SUM(messages_prev_7d) as total_messages_prev_7d
    FROM health_status
  `);

  const stats = healthStats.rows[0] as {
    total_students: number;
    active_students_7d: number;
    avg_topics_mastered: number;
    healthy_count: number;
    at_risk_count: number;
    stuck_count: number;
    not_started_count: number;
    total_messages_7d: number;
    total_messages_prev_7d: number;
  };

  // Determine engagement trend
  let engagementTrend: "up" | "down" | "stable" = "stable";
  if (stats.total_messages_7d > stats.total_messages_prev_7d * 1.2) {
    engagementTrend = "up";
  } else if (stats.total_messages_7d < stats.total_messages_prev_7d * 0.8) {
    engagementTrend = "down";
  }

  return {
    totalStudents: Number(stats.total_students) || 0,
    activeStudents7d: Number(stats.active_students_7d) || 0,
    avgTopicsMastered: Number(stats.avg_topics_mastered) || 0,
    avgSessionMinutes: 0, // Would need session calculation
    healthyCount: Number(stats.healthy_count) || 0,
    atRiskCount: Number(stats.at_risk_count) || 0,
    stuckCount: Number(stats.stuck_count) || 0,
    notStartedCount: Number(stats.not_started_count) || 0,
    engagementTrend,
  };
}
