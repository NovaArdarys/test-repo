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
} from "@/controllers/public/web/event.report.controller";
import { getEventReportsHandler } from "@/controllers/public/web/log.event.report.controller";
import { 
  createWebEventReportDeliveryBeneficiaryHandler, 
  createWebEventReportDeliveryDriverHandler 
} from "@/controllers/public/web/web.confirmation.delivery.controller";
import { CreateDeliveryEventReportSchema } from "@/validator/confirm.delivery.validation";

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

app.post(
  "/delivery-confirmation/:id/beneficiary",
  validate({ param: idParamSchema }),
  validate({ body: CreateDeliveryEventReportSchema }),
  createWebEventReportDeliveryBeneficiaryHandler
);

app.post(
  "/delivery-confirmation/:id/driver",
  validate({ param: idParamSchema }),
  validate({ body: CreateDeliveryEventReportSchema }),
  createWebEventReportDeliveryDriverHandler
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
