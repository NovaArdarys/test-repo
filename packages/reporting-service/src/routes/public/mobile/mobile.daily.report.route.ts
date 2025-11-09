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
  "/:entity/vi",
  validate({
    query: getDailyReportListSchema.omit({ entityType: true }).extend({
      view: z.enum([
        "home",
        "calendar",
        "delivery",
        "report",
        "profile",
      ]),
    }),
    param: z.object({
      entity: z.enum(["kitchen", "driver", "beneficiary"]),
    }),
  }),
  listDailyReportsHandler
);

app.get(
  "/:entity/:id",
  validate({
    param: z.object({
      idParamSchema,
      entity: z.enum(["kitchen", "driver", "beneficiary"]),
    })
  }),
  getDailyReportHandler
);


export default app;
