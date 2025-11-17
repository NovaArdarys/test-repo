import z from "zod";
import { paginationSchema } from "./globa.validator";
import { roleDomainEnum } from "@/db/schemas/enums/enums"; // pastikan import ke enum yang kamu punya

export const entityTypeEnum = z.enum(["kitchen", "driver", "school", "beneficiary"]);
export const stepKeyEnum = z.enum([
  "preparationTool",
  "preparation",
  "cooking",
  "packaging",
  "pickup",
  "delivery",
  "confirmation",
  "receive",
  "inspection",
  "distribution",
]);

const dailyReportBaseSchema = z.object({
  date: z.string("Tanggal harus format YYYY-MM-DD."),
  entityType: entityTypeEnum,
  entityId: z.string("Entity ID harus dalam format string."),
  menuPlanId: z.string("MenU Plan ID harus dalam format string."),
  status: z.string().default("draft").optional(),
});

export const createDailyReportSchema = dailyReportBaseSchema.extend({
  date: z.string("Tanggal wajib diisi."),
  entityId: z.string("Entity ID wajib diisi."),
});

export const updateDailyReportSchema = dailyReportBaseSchema.extend({});

export const getDailyReportListSchema = paginationSchema.extend({
  entityType: entityTypeEnum.optional(),
  entityId: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export type CreateDailyReportSchemaType = z.infer<typeof createDailyReportSchema>;
export type UpdateDailyReportSchemaType = z.infer<typeof updateDailyReportSchema>;
export type GetDailyReportListSchemaType = z.infer<typeof getDailyReportListSchema>;

const stepReportBaseSchema = z.object({
  dailyReportId: z.string("DailyReport ID harus format string."),
  stepId: z.string("Step ID harus format string."),
  notes: z.string().optional(),
  isCompleted: z.preprocess((a) => a === 'true', z.boolean()).default(false),
  storageId: z.string().optional()
});

export const createStepReportSchema = stepReportBaseSchema.extend({
  dailyReportId: z.string("DailyReport wajib diisi."),
  stepId: z.string("Step wajib diisi."),
});

export const updateStepReportSchema = stepReportBaseSchema.partial();

export const getStepReportListSchema = paginationSchema.extend({
  dailyReportId: z.string().optional(),
  isCompleted: z.preprocess((a) => a === 'true', z.boolean()).optional(),
});

export type CreateStepReportSchemaType = z.infer<typeof createStepReportSchema>;
export type UpdateStepReportSchemaType = z.infer<typeof updateStepReportSchema>;
export type GetStepReportListSchemaType = z.infer<typeof getStepReportListSchema>;


export const stepReportQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate harus format YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate harus format YYYY-MM-DD")
    .optional(),
  search: z.string().optional(),
  entity: z.enum(roleDomainEnum.enumValues).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .refine((val) => val > 0, "page harus lebih besar dari 0"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 20))
    .refine((val) => val > 0, "limit harus lebih besar dari 0"),
});

export type StepReportQueryType = z.infer<typeof stepReportQuerySchema>;
