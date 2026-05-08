import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { idParamSchema } from "@/validator/globa.validator";
import { triggerReportJobSchema } from "@/validator/job.report.validator";
import {
  triggerReportJobHandler,
  getReportJobStatusHandler,
} from "@/controllers/public/web/job.report.controller";

const app = new Hono();

app.use(checkAccessToken);

app.post(
  "/trigger",
  validate(triggerReportJobSchema, "body"),
  triggerReportJobHandler
);

app.get(
  "/:jobId/status",
  getReportJobStatusHandler
);

export default app;