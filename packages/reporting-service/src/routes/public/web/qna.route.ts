import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";

import {
  CreateQuestionSchema,
  CreateAnswerSchema,
  VoteSchema,
  qnaQuerySchema,
} from "@/validator/qna.validator";

import { idParamSchema } from "@/validator/globa.validator";

import {
  createQuestionHandler,
  getQuestionsHandler,
  getQuestionDetailHandler,
  createAnswerHandler,
  voteHandler,
  pinQuestionHandler,
  acceptAnswerHandler,
  deleteQuestionHandler,
  deleteAnswerHandler,
  getTagsHandler,
  getRelatedQuestionsHandler,
} from "@/controllers/public/web/qna.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get("/tags", getTagsHandler);
app.get("/", validate({ query: qnaQuerySchema }), getQuestionsHandler);

app.get("/:id{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", validate({ param: idParamSchema }), getQuestionDetailHandler);
app.get("/:id{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}/related", validate({ param: idParamSchema }), getRelatedQuestionsHandler);


app.post("/", validate({ body: CreateQuestionSchema }), createQuestionHandler);
app.post("/:id/answers", validate({ param: idParamSchema, body: CreateAnswerSchema }), createAnswerHandler);
app.post("/:id/vote", validate({ param: idParamSchema, body: VoteSchema }), voteHandler);
app.post("/answers/:id/vote", validate({ param: idParamSchema, body: VoteSchema }), voteHandler);
app.post("/:id/pin", validate({ param: idParamSchema }), pinQuestionHandler);
app.post("/answers/:id/accept", validate({ param: idParamSchema }), acceptAnswerHandler);

app.delete("/:id", validate({ param: idParamSchema }), deleteQuestionHandler);
app.delete("/answers/:id", validate({ param: idParamSchema }), deleteAnswerHandler);


export default app;
