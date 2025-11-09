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
} from "@/controllers/public/mobile/mobile.daily.report.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/:entity/:view",
  validate({
    query: getDailyReportListSchema.omit({ entityType: true, entityId: true }),
    param: z.object({
      entity: z.enum(["kitchen", "driver", "beneficiary"]),
      view: z.enum([
        "home",
        "calendar",
      ]),
    }),
  }),
  listDailyReportsHandler
);

app.get(
  "/:entity/:id",
  validate({
    param: idParamSchema.extend({
      entity: z.enum(["kitchen", "driver", "beneficiary"]),
      view: z.enum([
        "home",
        "calendar",
      ]),
    })
  }),
  getDailyReportHandler
);


export default app;
