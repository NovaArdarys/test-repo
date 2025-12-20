import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";

import {
  GetEventReportListSchema,
} from "@/validator/event.report.validator";

import { idParamSchema } from "@/validator/globa.validator";

import {
  getEventReportByIdHandler,
} from "@/controllers/public/mobile/mobile.event.report.controller";
import { listStepReportsHandler } from "@/controllers/public/mobile/mobile.step.report.controller";
import { GetStepReportListSchema } from "../../../validator/step.report.validator";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/",
  validate({ query: GetStepReportListSchema }),
  listStepReportsHandler
);

app.get(
  "/:id",
  validate({ param: idParamSchema }),
  getEventReportByIdHandler
);

export default app;
