import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { permission } from "@/middleware/permission.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";
import z from "zod";

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
} from "@/controllers/public/daily.report.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/",
  validate({
    query: getDailyReportListSchema, param: z.object({
      device: z.string()
    })
  }),
  listDailyReportsHandler
);

app.get(
  "/:id",
  validate({
    param: z.object({
      idParamSchema,
      device: z.string()
    })
  }),
  getDailyReportHandler
);


export default app;
