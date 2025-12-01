import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";
import z from "zod";

import {
  getDailyReportListSchema,
  updateStepReportSchema,
} from "@/validator/daily.report.validator";

import { idParamSchema } from "@/validator/globa.validator";

import {
  listDailyReportsHandler,
  getDailyReportHandler,
  updateStepReportHandler,
} from "@/controllers/public/mobile/mobile.daily.report.controller";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/:entity/:view",
  validate({
    query: getDailyReportListSchema.omit({ entityType: true, entityId: true }),
    param: z.object({
      entity: z.enum(["kitchen", "driver", "school", "beneficiary", "sppg"]),
      view: z.enum([
        "home",
        "calendar",
      ]),
    }),
  }),
  listDailyReportsHandler
);

app.get(
  "/:entity/:view/:id",
  validate({
    param: idParamSchema.extend({
      entity: z.enum(["kitchen", "driver", "school", "beneficiary"]),
      view: z.enum([
        "home",
        "calendar",
      ]),
    })
  }),
  getDailyReportHandler
);


app.put(
  "/steps/:id",
  validate({ param: idParamSchema, }),
  validate({ body: updateStepReportSchema, }),
  updateStepReportHandler
);



export default app;
