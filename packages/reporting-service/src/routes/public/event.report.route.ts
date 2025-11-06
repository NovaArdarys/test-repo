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
  validate(GetEventReportListSchema, "query"),
  listEventReportsHandler
);

app.get(
  "/:id",
  validate(idParamSchema, "param"),
  getEventReportByIdHandler
);

app.post(
  "/",
  validate(CreateEventReportSchema),
  createEventReportHandler
);

app.put(
  "/:id",
  validate(idParamSchema, "param"),
  validate(UpdateEventReportSchema),
  updateEventReportHandler
);

app.delete(
  "/:id",
  validate(idParamSchema, "param"),
  softDeleteEventReportHandler
);

export default app;
