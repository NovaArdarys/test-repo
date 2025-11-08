import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { permission } from "@/middleware/permission.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";

import {
  createDailyReportSchema,
  updateDailyReportSchema,
  getDailyReportListSchema,
  createStepReportSchema,
  updateStepReportSchema,
  getStepReportListSchema,
} from "@/validator/daily.report.validator";

import { idParamSchema } from "@/validator/globa.validator";

import {
  listDailyReportsHandler,
  getDailyReportHandler,
  createDailyReportHandler,
  updateDailyReportHandler,
  deleteDailyReportHandler,
  listStepReportsHandler,
  createStepReportHandler,
  updateStepReportHandler,
  deleteStepReportHandler,
} from "@/controllers/public/daily.report.controller";

const app = new Hono();

app.use(checkAccessToken);

// DAILY REPORT ROUTES
// ================================
app.get(
  "/",
  validate(getDailyReportListSchema, "query"),
  listDailyReportsHandler
);

app.get(
  "/:id",
  validate(idParamSchema, "param"),
  getDailyReportHandler
);

app.post(
  "/",
  validate(createDailyReportSchema),
  createDailyReportHandler
);

app.put(
  "/:id",
  validate(idParamSchema, "param"),
  validate(updateDailyReportSchema),
  updateDailyReportHandler
);

app.delete(
  "/:id",
  validate(idParamSchema, "param"),
  deleteDailyReportHandler
);

// STEP REPORT ROUTES
// ================================
app.get(
  "/:dailyReportId/steps",
  validate(getStepReportListSchema, "query"),
  listStepReportsHandler
);

app.post(
  "/:dailyReportId/steps",
  validate(createStepReportSchema),
  createStepReportHandler
);

app.put(
  "/steps/:id",
  validate(idParamSchema, "param"),
  validate(updateStepReportSchema),
  updateStepReportHandler
);

app.delete(
  "/steps/:id",
  validate(idParamSchema, "param"),
  deleteStepReportHandler
);

export default app;
