import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { permission } from "@/middleware/permission.middleware";

import {
  CreateEventReportSchema,
  UpdateEventReportSchema,
  GetEventReportListSchema,
} from "@/validator/event.report.validator";

import { idParamSchema } from "@/validator/globa.validator";

import {
  listEventReportsHandler,
  getEventReportByIdHandler,
  createEventReportHandler,
  updateEventReportHandler,
  softDeleteEventReportHandler,
} from "@/controllers/public/event.report.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/",
  validate({ query: GetEventReportListSchema }),
  listEventReportsHandler
);

app.get(
  "/:id",
  validate({ param: idParamSchema }),
  getEventReportByIdHandler
);

app.post(
  "/",
  validate({ body: CreateEventReportSchema }),
  createEventReportHandler
);

app.put(
  "/:id",
  validate({ param: idParamSchema, body: UpdateEventReportSchema }),
  updateEventReportHandler
);

app.delete(
  "/:id",
  validate({ param: idParamSchema }),
  softDeleteEventReportHandler
);

export default app;
