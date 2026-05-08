import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./user.schema";

export const qnaQuestions = pgTable("qna_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  votes: integer("votes").default(0).notNull(),
  answersCount: integer("answers_count").default(0).notNull(),
  isAnswered: boolean("is_answered").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  attachments: jsonb("attachments").$type<{ name: string; url: string; size?: string; type?: string }[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const qnaAnswers = pgTable("qna_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => qnaQuestions.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  votes: integer("votes").default(0).notNull(),
  isAccepted: boolean("is_accepted").default(false).notNull(),
  attachments: jsonb("attachments").$type<{ name: string; url: string; size?: string; type?: string }[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const qnaVotes = pgTable("qna_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .references(() => qnaQuestions.id, { onDelete: "cascade" }),
  answerId: uuid("answer_id")
    .references(() => qnaAnswers.id, { onDelete: "cascade" }),
  voteType: text("vote_type").$type<"up" | "down">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
