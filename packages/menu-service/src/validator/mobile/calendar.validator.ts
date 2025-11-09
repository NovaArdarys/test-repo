import z from "zod";
import { paginationSchema } from "../globa.validator";

export const listCalendarQuerySchema = paginationSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ListCalendarQuerySchemaType = z.infer<typeof listCalendarQuerySchema>;