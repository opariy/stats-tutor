import { pgTable, text, timestamp, boolean, uuid, integer, serial, unique, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  group: text("group", { enum: ["krokyo", "control"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations group messages by topic
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  topicId: text("topic_id"),  // null = general/legacy conversation (references global topics)
  courseId: uuid("course_id"),  // null = legacy/global course, otherwise references courses.id
  title: text("title").notNull().default(''),
  isDemo: boolean("is_demo").default(false),  // true = demo conversation for showcase
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Composite index for learning metrics queries
  index("idx_messages_conv_user").on(table.conversationId, table.userId, table.createdAt),
]);

export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").references(() => messages.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  rating: text("rating", { enum: ["up", "down"] }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  conversations: many(conversations),
  messages: many(messages),
  feedback: many(feedback),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  feedback: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  message: one(messages, {
    fields: [feedback.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

// Message topic tags - AI auto-detected topics for analytics
export const messageTags = pgTable("message_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").references(() => messages.id).notNull(),
  topicId: text("topic_id").notNull(),  // References global topics.id (legacy)
  courseTopicId: uuid("course_topic_id"),  // References course_topics.id (new per-course topics)
  confidence: integer("confidence").default(100),  // 0-100 confidence score
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageTagsRelations = relations(messageTags, ({ one }) => ({
  message: one(messages, {
    fields: [messageTags.messageId],
    references: [messages.id],
  }),
}));

// System prompts for runtime editing
export const systemPrompts = pgTable("system_prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // 'krokyo' | 'control'
  content: text("content").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chapters for topic organization
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Topics for study content
export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  chapterNumber: integer("chapter_number").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for chapters and topics
export const chaptersRelations = relations(chapters, ({ many }) => ({
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one }) => ({
  chapter: one(chapters, {
    fields: [topics.chapterNumber],
    references: [chapters.number],
  }),
}));

// ============================================
// Per-course curriculum tables (domain-agnostic)
// ============================================

// Per-course chapters (replaces global chapters for custom courses)
export const courseChapters = pgTable("course_chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_course_chapter").on(table.courseId, table.number),
  index("idx_course_chapters_course").on(table.courseId),
]);

// Per-course topics (replaces global topics for custom courses)
export const courseTopics = pgTable("course_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  chapterId: uuid("chapter_id").references(() => courseChapters.id).notNull(),
  slug: text("slug").notNull(),  // URL-friendly identifier like "hypothesis-testing"
  name: text("name").notNull(),
  description: text("description"),
  suggestions: jsonb("suggestions").$type<string[]>().default([]),  // Starter question prompts
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  source: text("source", { enum: ["manual", "ai_generated", "material_extracted"] }).default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_course_topic_slug").on(table.courseId, table.slug),
  index("idx_course_topics_course").on(table.courseId),
  index("idx_course_topics_chapter").on(table.chapterId),
]);

// Course materials (for material-based curriculum generation)
export const courseMaterials = pgTable("course_materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["pdf", "text"] }).notNull(),
  blobUrl: text("blob_url"),  // Vercel Blob URL for PDFs
  textContent: text("text_content"),  // Raw text content
  processed: boolean("processed").default(false),
  extractedTopics: jsonb("extracted_topics").$type<Array<{ slug: string; name: string; description: string }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_course_materials_course").on(table.courseId),
]);

// Per-course system prompts
export const coursePrompts = pgTable("course_prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  name: text("name").default("default").notNull(),  // Allow multiple named prompts per course
  content: text("content"),  // Custom system prompt content (if null, auto-generate)
  teachingStyle: text("teaching_style", { enum: ["socratic", "direct", "guided"] }).default("guided"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_course_prompt").on(table.courseId, table.name),
]);

// Relations for per-course curriculum
export const courseChaptersRelations = relations(courseChapters, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseChapters.courseId],
    references: [courses.id],
  }),
  topics: many(courseTopics),
}));

export const courseTopicsRelations = relations(courseTopics, ({ one }) => ({
  course: one(courses, {
    fields: [courseTopics.courseId],
    references: [courses.id],
  }),
  chapter: one(courseChapters, {
    fields: [courseTopics.chapterId],
    references: [courseChapters.id],
  }),
}));

export const courseMaterialsRelations = relations(courseMaterials, ({ one }) => ({
  course: one(courses, {
    fields: [courseMaterials.courseId],
    references: [courses.id],
  }),
}));

export const coursePromptsRelations = relations(coursePrompts, ({ one }) => ({
  course: one(courses, {
    fields: [coursePrompts.courseId],
    references: [courses.id],
  }),
}));

// Topic mastery - tracks when users declare they understand a topic
export const topicMastery = pgTable("topic_mastery", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  topicId: text("topic_id").notNull(),  // Global topic ID (legacy)
  courseTopicId: uuid("course_topic_id"),  // References course_topics.id (new per-course topics)
  conversationId: uuid("conversation_id").references(() => conversations.id),
  declaredAt: timestamp("declared_at").defaultNow().notNull(),
}, (table) => [
  // One mastery declaration per user per topic
  unique("unique_user_topic").on(table.userId, table.topicId),
]);

export const topicMasteryRelations = relations(topicMastery, ({ one }) => ({
  user: one(users, {
    fields: [topicMastery.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [topicMastery.conversationId],
    references: [conversations.id],
  }),
}));

// API errors - for tech metrics error rate tracking
export const apiErrors = pgTable("api_errors", {
  id: uuid("id").defaultRandom().primaryKey(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("status_code").notNull(),
  errorMessage: text("error_message"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_api_errors_created").on(table.createdAt),
]);

export const apiErrorsRelations = relations(apiErrors, ({ one }) => ({
  user: one(users, {
    fields: [apiErrors.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageTag = typeof messageTags.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type SystemPrompt = typeof systemPrompts.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type TopicMastery = typeof topicMastery.$inferSelect;
export type ApiError = typeof apiErrors.$inferSelect;

// Professor accounts (bcrypt passwords for external users)
export const professors = pgTable("professors", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Courses
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  professorId: uuid("professor_id").references(() => professors.id),  // null for self-serve courses
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  // New fields for domain-agnostic tutoring
  curriculumMode: text("curriculum_mode", { enum: ["auto_generated", "manual", "material_extracted"] }).default("auto_generated"),
  subjectDescription: text("subject_description"),  // User's description of what they want to learn
  isSelfServe: boolean("is_self_serve").default(false),  // true = individual learner, false = professor course
  ownerUserId: uuid("owner_user_id").references(() => users.id),  // for self-serve courses
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student enrollments (manual for pilots)
export const courseEnrollments = pgTable("course_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_course_user").on(table.courseId, table.userId),
  index("idx_enrollments_course").on(table.courseId),
  index("idx_enrollments_user").on(table.userId),
]);

// Cached AI suggestions (24h cache)
export const professorInsights = pgTable("professor_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  topicId: text("topic_id").notNull(),
  cacheDate: text("cache_date").notNull(),
  suggestion: text("suggestion").notNull(),
  studentCount: integer("student_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_insight").on(table.courseId, table.topicId, table.cacheDate),
]);

// Bug reports / user feedback
export const bugReports = pgTable("bug_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  type: text("type", { enum: ["bug", "feedback", "feature"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  page: text("page"), // URL/page where the issue occurred
  status: text("status", { enum: ["new", "in-progress", "resolved", "closed"] }).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const bugReportsRelations = relations(bugReports, ({ one }) => ({
  user: one(users, {
    fields: [bugReports.userId],
    references: [users.id],
  }),
}));

export type BugReport = typeof bugReports.$inferSelect;

// Professor relations
export const professorsRelations = relations(professors, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  professor: one(professors, {
    fields: [courses.professorId],
    references: [professors.id],
  }),
  owner: one(users, {
    fields: [courses.ownerUserId],
    references: [users.id],
  }),
  enrollments: many(courseEnrollments),
  insights: many(professorInsights),
  chapters: many(courseChapters),
  topics: many(courseTopics),
  materials: many(courseMaterials),
  prompts: many(coursePrompts),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseEnrollments.userId],
    references: [users.id],
  }),
}));

export const professorInsightsRelations = relations(professorInsights, ({ one }) => ({
  course: one(courses, {
    fields: [professorInsights.courseId],
    references: [courses.id],
  }),
}));

export type Professor = typeof professors.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type ProfessorInsight = typeof professorInsights.$inferSelect;

// Per-course curriculum types
export type CourseChapter = typeof courseChapters.$inferSelect;
export type CourseTopic = typeof courseTopics.$inferSelect;
export type CourseMaterial = typeof courseMaterials.$inferSelect;
export type CoursePrompt = typeof coursePrompts.$inferSelect;

// Insert types for new tables
export type NewCourseChapter = typeof courseChapters.$inferInsert;
export type NewCourseTopic = typeof courseTopics.$inferInsert;
export type NewCourseMaterial = typeof courseMaterials.$inferInsert;
export type NewCoursePrompt = typeof coursePrompts.$inferInsert;
export type NewCourse = typeof courses.$inferInsert;

// ============================================
// Knowledge Check System tables
// ============================================

// Learning objectives - what the student needs to learn per topic
export const learningObjectives = pgTable("learning_objectives", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseTopicId: uuid("course_topic_id").references(() => courseTopics.id).notNull(),
  objective: text("objective").notNull(),
  checkMethod: text("check_method", { enum: ["conversational", "quiz_mcq", "quiz_free_text"] }).notNull(),
  difficulty: text("difficulty", { enum: ["core", "advanced"] }).default("core").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_objectives_topic").on(table.courseTopicId),
]);

// Student progress on individual objectives
export const studentObjectiveProgress = pgTable("student_objective_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  objectiveId: uuid("objective_id").references(() => learningObjectives.id).notNull(),
  status: text("status", { enum: ["not_started", "attempted", "passed", "failed"] }).default("not_started").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  passedAt: timestamp("passed_at"),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_user_objective").on(table.userId, table.objectiveId),
  index("idx_progress_user").on(table.userId),
  index("idx_progress_objective").on(table.objectiveId),
]);

// Quiz results for end-of-topic assessments
export const topicQuizResults = pgTable("topic_quiz_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseTopicId: uuid("course_topic_id").references(() => courseTopics.id).notNull(),
  quizType: text("quiz_type", { enum: ["end_of_topic", "cross_topic_review"] }).notNull(),
  questionsJson: jsonb("questions_json").$type<Array<{
    objectiveId: string;
    question: string;
    type: "mcq" | "free_text";
    options?: string[];
    correctAnswer?: string;
  }>>().notNull(),
  answersJson: jsonb("answers_json").$type<Array<{
    objectiveId: string;
    answer: string;
    isCorrect: boolean;
  }>>(),
  score: integer("score"),
  passed: boolean("passed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_quiz_user").on(table.userId),
  index("idx_quiz_topic").on(table.courseTopicId),
]);

// Overall topic completion status
export const studentTopicStatus = pgTable("student_topic_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseTopicId: uuid("course_topic_id").references(() => courseTopics.id).notNull(),
  status: text("status", { enum: ["locked", "in_progress", "quiz_ready", "completed"] }).default("locked").notNull(),
  coreObjectivesPassed: integer("core_objectives_passed").default(0).notNull(),
  totalCoreObjectives: integer("total_core_objectives").default(0).notNull(),
  unlockedAt: timestamp("unlocked_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_user_topic_status").on(table.userId, table.courseTopicId),
  index("idx_status_user").on(table.userId),
  index("idx_status_topic").on(table.courseTopicId),
]);

// Relations for Knowledge Check System
export const learningObjectivesRelations = relations(learningObjectives, ({ one, many }) => ({
  topic: one(courseTopics, {
    fields: [learningObjectives.courseTopicId],
    references: [courseTopics.id],
  }),
  progress: many(studentObjectiveProgress),
}));

export const studentObjectiveProgressRelations = relations(studentObjectiveProgress, ({ one }) => ({
  user: one(users, {
    fields: [studentObjectiveProgress.userId],
    references: [users.id],
  }),
  objective: one(learningObjectives, {
    fields: [studentObjectiveProgress.objectiveId],
    references: [learningObjectives.id],
  }),
  conversation: one(conversations, {
    fields: [studentObjectiveProgress.conversationId],
    references: [conversations.id],
  }),
}));

export const topicQuizResultsRelations = relations(topicQuizResults, ({ one }) => ({
  user: one(users, {
    fields: [topicQuizResults.userId],
    references: [users.id],
  }),
  topic: one(courseTopics, {
    fields: [topicQuizResults.courseTopicId],
    references: [courseTopics.id],
  }),
}));

export const studentTopicStatusRelations = relations(studentTopicStatus, ({ one }) => ({
  user: one(users, {
    fields: [studentTopicStatus.userId],
    references: [users.id],
  }),
  topic: one(courseTopics, {
    fields: [studentTopicStatus.courseTopicId],
    references: [courseTopics.id],
  }),
}));

// ============================================
// Prerequisite Gap Detection System
// ============================================

// Detected prerequisite gaps - when tutor identifies missing foundation knowledge
export const prerequisiteGaps = pgTable("prerequisite_gaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id).notNull(),
  courseTopicId: uuid("course_topic_id").references(() => courseTopics.id),  // Topic where gap was detected
  conversationId: uuid("conversation_id").references(() => conversations.id),
  concept: text("concept").notNull(),  // e.g., "percentages", "basic algebra", "fractions"
  evidence: text("evidence").notNull(),  // Brief description of what showed the gap
  severity: text("severity", { enum: ["blocking", "slowing"] }).notNull(),
  status: text("status", { enum: ["detected", "acknowledged", "resolved", "dismissed"] }).default("detected").notNull(),
  prerequisiteChapterId: uuid("prerequisite_chapter_id").references(() => courseChapters.id),  // If we added a prereq chapter
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),  // When user agreed to add prerequisite
  resolvedAt: timestamp("resolved_at"),  // When user completed the prerequisite module
}, (table) => [
  index("idx_gaps_user").on(table.userId),
  index("idx_gaps_course").on(table.courseId),
  index("idx_gaps_status").on(table.status),
]);

export const prerequisiteGapsRelations = relations(prerequisiteGaps, ({ one }) => ({
  user: one(users, {
    fields: [prerequisiteGaps.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [prerequisiteGaps.courseId],
    references: [courses.id],
  }),
  topic: one(courseTopics, {
    fields: [prerequisiteGaps.courseTopicId],
    references: [courseTopics.id],
  }),
  conversation: one(conversations, {
    fields: [prerequisiteGaps.conversationId],
    references: [conversations.id],
  }),
  prerequisiteChapter: one(courseChapters, {
    fields: [prerequisiteGaps.prerequisiteChapterId],
    references: [courseChapters.id],
  }),
}));

// Types for Knowledge Check System
export type LearningObjective = typeof learningObjectives.$inferSelect;
export type StudentObjectiveProgress = typeof studentObjectiveProgress.$inferSelect;
export type TopicQuizResult = typeof topicQuizResults.$inferSelect;
export type StudentTopicStatus = typeof studentTopicStatus.$inferSelect;
export type NewLearningObjective = typeof learningObjectives.$inferInsert;
export type NewStudentObjectiveProgress = typeof studentObjectiveProgress.$inferInsert;
export type NewTopicQuizResult = typeof topicQuizResults.$inferInsert;
export type NewStudentTopicStatus = typeof studentTopicStatus.$inferInsert;

// Types for Prerequisite Gap Detection
export type PrerequisiteGap = typeof prerequisiteGaps.$inferSelect;
export type NewPrerequisiteGap = typeof prerequisiteGaps.$inferInsert;
