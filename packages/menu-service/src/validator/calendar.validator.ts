import z from "zod";
import { paginationSchema } from "./globa.validator";
import { entityTypeEnum } from "./menu.plan.validator";

export const listCalendarQuerySchema = paginationSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  entityType: entityTypeEnum,
});

export type ListCalendarQuerySchemaType = z.infer<typeof listCalendarQuerySchema>;