import { pgTable, text, timestamp, boolean, uuid, integer, serial, unique, index } from "drizzle-orm/pg-core";
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
  topicId: text("topic_id"),  // null = general/legacy conversation
  title: text("title").notNull().default(''),
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
  topicId: text("topic_id").notNull(),  // References topics.id
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

// Topic mastery - tracks when users declare they understand a topic
export const topicMastery = pgTable("topic_mastery", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  topicId: text("topic_id").notNull(),
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
