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
} from "@/controllers/public/mobile/mobile.event.report.controller";
import { createEventReportDeliveryBeneficiaryHandler, createEventReportDeliveryDriverHandler } from "@/controllers/public/mobile/mobile.confirmation.delivery.controller";
import { CreateDeliveryEventReportSchema } from "@/validator/confirm.delivery.validation";

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

app.post(
  "/delivery-confirmation/:id/beneficiary",
  validate({ param: idParamSchema }),
  validate({ body: CreateDeliveryEventReportSchema }),
  createEventReportDeliveryBeneficiaryHandler
);

app.post(
  "/delivery-confirmation/:id/driver",
  validate({ param: idParamSchema }),
  validate({ body: CreateDeliveryEventReportSchema }),
  createEventReportDeliveryDriverHandler
);

app.put(
  "/:id",
  validate({ param: idParamSchema }),
  validate({ body: UpdateEventReportSchema }),
  updateEventReportHandler
);

app.delete(
  "/:id",
  validate({ param: idParamSchema }),
  softDeleteEventReportHandler
);

export default app;
