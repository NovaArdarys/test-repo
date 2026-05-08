import { db } from "@/db";
import {
  qnaQuestions,
  qnaAnswers,
  qnaVotes,
  users,
  userDetails,
} from "@/db/schemas";
import { eq, and, or, not, desc, sql, ilike, inArray, inArray as pgInArray } from "drizzle-orm";

export async function createQuestion(data: any): Promise<any> {
  const [newQuestion] = await db
    .insert(qnaQuestions)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return newQuestion;
}

export async function createAnswer(data: any): Promise<any> {
  const [newAnswer] = await db
    .insert(qnaAnswers)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // increment answer count on question
  await db
    .update(qnaQuestions)
    .set({
      answersCount: sql`${qnaQuestions.answersCount} + 1`,
      isAnswered: true
    })
    .where(eq(qnaQuestions.id, data.questionId));

  return newAnswer;
}

export async function getQuestionsList(options?: {
  page?: number;
  limit?: number;
  search?: string;
  tab?: "latest" | "popular" | "pinned" | "unanswered";
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const offset = (page - 1) * limit;

  const filters = [];
  if (options?.search) {
    const s = `%${options.search}%`;
    filters.push(
      or(
        ilike(qnaQuestions.title, s),
        ilike(qnaQuestions.content, s),
        sql`${qnaQuestions.tags}::text ilike ${s}`
      )
    );
  }
  if (options?.tab === "pinned") {
    filters.push(eq(qnaQuestions.isPinned, true));
  } else if (options?.tab === "unanswered") {
    filters.push(eq(qnaQuestions.isAnswered, false));
  }

  const queryCondition = filters.length > 0 ? and(...filters) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(qnaQuestions)
    .where(queryCondition);

  const paginatedQuestions = await db
    .select({
      question: qnaQuestions,
      user: users,
      userDetail: userDetails,
    })
    .from(qnaQuestions)
    .leftJoin(users, eq(users.id, qnaQuestions.authorId))
    .leftJoin(userDetails, eq(userDetails.userId, users.id))
    .where(queryCondition)
    .orderBy(
      options?.tab === "popular" ? desc(qnaQuestions.votes) :
      desc(qnaQuestions.createdAt)
    )
    .limit(limit)
    .offset(offset);

  const result = paginatedQuestions.map((row) => ({
    id: row.question.id,
    title: row.question.title,
    excerpt: row.question.excerpt,
    content: row.question.content,
    author: {
      name: `${row.userDetail?.firstName || "Unknown"} ${row.userDetail?.lastName || ""}`.trim(),
      role: "User",
    },
    category: row.question.category,
    tags: row.question.tags,
    stats: {
      views: 0,
      answers: row.question.answersCount,
      votes: row.question.votes,
    },
    createdAt: row.question.createdAt?.toISOString(),
    isAnswered: row.question.isAnswered,
    isPinned: row.question.isPinned,
    attachments: row.question.attachments,
  }));

  return {
    data: result,
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}

export async function getQuestionById(id: string) {
  const [row] = await db
    .select({
      question: qnaQuestions,
      user: users,
      userDetail: userDetails,
    })
    .from(qnaQuestions)
    .leftJoin(users, eq(users.id, qnaQuestions.authorId))
    .leftJoin(userDetails, eq(userDetails.userId, users.id))
    .where(eq(qnaQuestions.id, id));

  if (!row) return null;

  return {
    id: row.question.id,
    title: row.question.title,
    excerpt: row.question.excerpt,
    content: row.question.content,
    author: {
      id: row.user?.id,
      name: `${row.userDetail?.firstName || "Unknown"} ${row.userDetail?.lastName || ""}`.trim(),
      role: "User",
    },
    category: row.question.category,
    tags: row.question.tags,
    stats: {
      views: 0,
      answers: row.question.answersCount,
      votes: row.question.votes,
    },
    createdAt: row.question.createdAt?.toISOString(),
    isAnswered: row.question.isAnswered,
    isPinned: row.question.isPinned,
    attachments: row.question.attachments,
  };
}

export async function getAnswersForQuestion(questionId: string, sortBy: string = "popular") {
  const answers = await db
    .select({
      answer: qnaAnswers,
      user: users,
      userDetail: userDetails,
    })
    .from(qnaAnswers)
    .leftJoin(users, eq(users.id, qnaAnswers.authorId))
    .leftJoin(userDetails, eq(userDetails.userId, users.id))
    .where(eq(qnaAnswers.questionId, questionId))
    .orderBy(
      sortBy === "popular"
        ? sql`${qnaAnswers.isAccepted} DESC, ${qnaAnswers.votes} DESC, ${qnaAnswers.createdAt} DESC`
        : desc(qnaAnswers.createdAt)
    );

  return answers.map((row) => ({
    id: row.answer.id,
    content: row.answer.content,
    votes: row.answer.votes,
    isAccepted: row.answer.isAccepted,
    createdAt: row.answer.createdAt?.toISOString(),
    attachments: row.answer.attachments,
    author: {
      id: row.user?.id,
      name: `${row.userDetail?.firstName || "Unknown"} ${row.userDetail?.lastName || ""}`.trim(),
      role: "User",
    },
  }));
}

export async function voteQuestionOrAnswer(
  userId: string,
  voteType: "up" | "down",
  entityType: "question" | "answer",
  entityId: string
) {
  const existingVote = await db
    .select()
    .from(qnaVotes)
    .where(
      and(
        eq(qnaVotes.userId, userId),
        entityType === "question" ? eq(qnaVotes.questionId, entityId) : eq(qnaVotes.answerId, entityId)
      )
    )
    .limit(1);

  if (existingVote.length > 0) {
    // Replace vote logic ideally or toggle. For now just update or do nothing.
    return null;
  }

  await db.insert(qnaVotes).values({
    userId,
    questionId: entityType === "question" ? entityId : null,
    answerId: entityType === "answer" ? entityId : null,
    voteType,
    createdAt: new Date(),
  });

  const increment = voteType === "up" ? 1 : -1;

  if (entityType === "question") {
    await db
      .update(qnaQuestions)
      .set({ votes: sql`${qnaQuestions.votes} + ${increment}` })
      .where(eq(qnaQuestions.id, entityId));
  } else {
    await db
      .update(qnaAnswers)
      .set({ votes: sql`${qnaAnswers.votes} + ${increment}` })
      .where(eq(qnaAnswers.id, entityId));
  }

  return true;
}

export async function pinQuestion(id: string, isPinned: boolean) {
  const [updated] = await db
    .update(qnaQuestions)
    .set({ isPinned, updatedAt: new Date() })
    .where(eq(qnaQuestions.id, id))
    .returning();
  return updated;
}

export async function acceptAnswer(answerId: string) {
  // Un-accept other answers for the same question
  const [targetAnswer] = await db.select().from(qnaAnswers).where(eq(qnaAnswers.id, answerId));
  if (!targetAnswer) return null;

  await db
    .update(qnaAnswers)
    .set({ isAccepted: false })
    .where(eq(qnaAnswers.questionId, targetAnswer.questionId));

  const [updated] = await db
    .update(qnaAnswers)
    .set({ isAccepted: true, updatedAt: new Date() })
    .where(eq(qnaAnswers.id, answerId))
    .returning();

  // Mark question as answered if it isn't already
  await db
    .update(qnaQuestions)
    .set({ isAnswered: true })
    .where(eq(qnaQuestions.id, targetAnswer.questionId));

  return updated;
}

export async function deleteQuestion(id: string) {
  return await db.delete(qnaQuestions).where(eq(qnaQuestions.id, id)).returning();
}

export async function deleteAnswer(id: string) {
  const [answer] = await db.select().from(qnaAnswers).where(eq(qnaAnswers.id, id));
  if (!answer) return null;

  const deleted = await db.delete(qnaAnswers).where(eq(qnaAnswers.id, id)).returning();

  // Decrement answer count
  await db
    .update(qnaQuestions)
    .set({
      answersCount: sql`${qnaQuestions.answersCount} - 1`,
    })
    .where(eq(qnaQuestions.id, answer.questionId));

  // Update isAnswered if no answers left
  const answers = await db
    .select({ count: sql<number>`count(*)` })
    .from(qnaAnswers)
    .where(eq(qnaAnswers.questionId, answer.questionId));

  if (Number(answers[0].count) === 0) {
    await db
      .update(qnaQuestions)
      .set({ isAnswered: false })
      .where(eq(qnaQuestions.id, answer.questionId));
  }

  return deleted;
}

export async function getTagsCount() {
  const result = await db.execute(sql`
    SELECT tag, count(*)::int as count
    FROM qna_questions, jsonb_array_elements_text(tags) as tag
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 10
  `);
  return result.rows as unknown as { tag: string; count: number }[];
}

export async function getRelatedQuestions(id: string, limit: number = 3) {
  const [current] = await db.select().from(qnaQuestions).where(eq(qnaQuestions.id, id));
  if (!current) return [];

  const currentTags = Array.isArray(current.tags) ? current.tags : [];

  const related = await db
    .select({
      id: qnaQuestions.id,
      title: qnaQuestions.title,
      answersCount: qnaQuestions.answersCount,
      createdAt: qnaQuestions.createdAt,
    })
    .from(qnaQuestions)
    .where(
      and(
        not(eq(qnaQuestions.id, id)),
        or(
          eq(qnaQuestions.category, current.category),
          currentTags.length > 0
            ? sql`${qnaQuestions.tags} ?| ARRAY[${sql.join(currentTags.map(t => sql`${t}`), sql`,`)}]::text[]`
            : sql`false`
        )
      )
    )
    .orderBy(desc(qnaQuestions.createdAt))
    .limit(limit);

  return related;
}

