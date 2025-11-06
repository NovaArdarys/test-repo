import { z } from "zod";

export const CreateEventReportSchema = z.object({
  name: z.string().min(1),
  reportType: z.string().min(1),
  date: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export type CreateEventReportSchemaType = z.infer<typeof CreateEventReportSchema>;

export const UpdateEventReportSchema = z.object({
  name: z.string().optional(),
  reportType: z.string().optional(),
  date: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateEventReportSchemaType = z.infer<typeof UpdateEventReportSchema>;

export const ListEventReportQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  date: z.string().optional(),
  reportType: z.string().optional(),
});

export type ListEventReportQuerySchemaType = z.infer<typeof ListEventReportQuerySchema>;


export const GetEventReportListSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 1))
    .refine((v) => !isNaN(v) && v > 0, { message: "Page must be a positive number" }),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 10))
    .refine((v) => !isNaN(v) && v > 0, { message: "Limit must be a positive number" }),

  reportType: z.string().optional(),

  date: z
    .string()
    .optional()
    .refine(
      (v) => !v || !isNaN(Date.parse(v)),
      { message: "Invalid date format (use YYYY-MM-DD)" }
    ),
});

export type GetEventReportListSchemaType = z.infer<typeof GetEventReportListSchema>;