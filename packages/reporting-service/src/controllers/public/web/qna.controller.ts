import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import {
  createQuestion,
  getQuestionsList,
  getQuestionById,
  createAnswer,
  getAnswersForQuestion,
  voteQuestionOrAnswer,
  pinQuestion,
  acceptAnswer,
  deleteQuestion,
  deleteAnswer,
  getTagsCount,
  getRelatedQuestions,
} from "@/services/repositories/web/qna.service";
import {
  CreateQuestionSchemaType,
  CreateAnswerSchemaType,
  QnaQuerySchemaType,
  VoteSchemaType,
} from "@/validator/qna.validator";
import { qnaEvent } from "@/messaging/publishers/qna.publisher";
import { z } from "zod";

const getAuditFields = (c: Context) => ({
  userId: c.get("userId"),
  kitchenId: c.get("kitchenId")?.[0] || "",
});

export const getQuestionsHandler = catchAsync(async (c: Context) => {
  const query = c.req.query() as unknown as QnaQuerySchemaType;

  const result = await getQuestionsList({
    page: query.page ? parseInt(query.page) : 1,
    limit: query.limit ? parseInt(query.limit) : 10,
    search: query.search,
    tab: query.tab,
  });

  return c.json(result, 200);
});

export const getQuestionDetailHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const query = c.req.query();
  const sort = query.sort || "popular";

  const question = await getQuestionById(id);

  if (!question) {
    return c.json({ message: "Question not found" }, 404);
  }

  const answers = await getAnswersForQuestion(id, sort);

  return c.json({ data: { ...question, answers } }, 200);
});

export const createQuestionHandler = catchAsync(async (c: Context) => {
  const body = c.get("validatedData")?.body as unknown as CreateQuestionSchemaType;
  const { userId, kitchenId } = getAuditFields(c);

  const newQuestion = await createQuestion({
    ...body,
    authorId: userId,
  });

  if (newQuestion) {
    await qnaEvent.questionCreated({
      userActorId: userId,
      userReceivedId: userId,
      entityId: newQuestion.id,
      title: "Pertanyaan Baru Diajukan",
      message: `Pertanyaan "${body.title}" berhasil diunggah.`,
      kitchenId: kitchenId,
    });
  }

  return c.json({ data: newQuestion, message: "Question created successfully" }, 201);
});

export const createAnswerHandler = catchAsync(async (c: Context) => {
  const body = c.get("validatedData")?.body as unknown as CreateAnswerSchemaType;
  const { userId, kitchenId } = getAuditFields(c);

  const newAnswer = await createAnswer({
    ...body,
    authorId: userId,
  });

  if (newAnswer) {
    const qn = await getQuestionById(body.questionId);
    if (qn) {
      await qnaEvent.questionAnswered({
        userActorId: userId,
        userReceivedId: qn.author.id || "",
        entityId: body.questionId,
        title: "Seseorang menjawab pertanyaan Anda",
        message: `Sebuah jawaban baru diberikan pada pertanyaan Anda: ${qn.title}`,
        kitchenId: kitchenId,
      });
    }
  }

  return c.json({ data: newAnswer, message: "Answer submitted successfully" }, 201);
});

export const voteHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = c.get("validatedData")?.body as unknown as VoteSchemaType;
  const { userId } = getAuditFields(c);

  const entityType = c.req.url.includes("/answers/") ? "answer" : "question";

  await voteQuestionOrAnswer(userId, body.voteType, entityType, id);

  return c.json({ message: "Vote stored" }, 200);
});

export const pinQuestionHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const body = c.req.json ? await c.req.json() : {};
  const isPinned = body.isPinned ?? true;

  const data = await pinQuestion(id, isPinned);
  return c.json({ data, message: isPinned ? "Question pinned" : "Question unpinned" }, 200);
});

export const acceptAnswerHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const data = await acceptAnswer(id);
  
  return c.json({ data, message: "Answer accepted" }, 200);
});

export const deleteQuestionHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  await deleteQuestion(id);
  return c.json({ message: "Question deleted successfully" }, 200);
});

export const deleteAnswerHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  await deleteAnswer(id);
  return c.json({ message: "Answer deleted successfully" }, 200);
});

export const getTagsHandler = catchAsync(async (c: Context) => {
  const tags = await getTagsCount();
  return c.json({ data: tags }, 200);
});

export const getRelatedQuestionsHandler = catchAsync(async (c: Context) => {
  const { id } = c.req.param();
  const related = await getRelatedQuestions(id);
  return c.json({ data: related }, 200);
});



