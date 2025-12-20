import z from "zod";

export const GetStepReportListSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 1))
    .refine((v) => !isNaN(v) && v > 0, {
      message: "Page must be a positive number",
    }),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 10))
    .refine((v) => !isNaN(v) && v > 0, {
      message: "Limit must be a positive number",
    }),

  subDomain: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : undefined)),

  startDate: z
    .string()
    .optional()
    .refine(
      (v) => !v || !isNaN(Date.parse(v)),
      { message: "Invalid startDate format (use YYYY-MM-DD)" }
    ),

  endDate: z
    .string()
    .optional()
    .refine(
      (v) => !v || !isNaN(Date.parse(v)),
      { message: "Invalid endDate format (use YYYY-MM-DD)" }
    ),
});