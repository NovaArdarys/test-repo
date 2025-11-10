import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { permission } from "@/middleware/permission.middleware";

import {
  CreateEventReportSchema,
  UpdateEventReportSchema,
  GetEventReportListSchema,
  eventReportQuerySchema,
} from "@/validator/event.report.validator";

import { idParamSchema } from "@/validator/globa.validator";

import {
  listEventReportsHandler,
  getEventReportByIdHandler,
  createEventReportHandler,
  updateEventReportHandler,
  softDeleteEventReportHandler,
} from "@/controllers/public/event.report.controller";
import { getEventReportsHandler } from "@/controllers/public/web/log.event.report.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/log",
  validate({ query: eventReportQuerySchema }),
  getEventReportsHandler
);
app.get(
  "/log/:id",
  validate({ param: idParamSchema }),
  getEventReportByIdHandler
);

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
