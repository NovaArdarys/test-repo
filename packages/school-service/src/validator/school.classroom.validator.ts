import { z } from "zod";

export const CreateSchoolClassroomSchema = z.object({
  schoolId: z.string(),
  menuPlanId: z.string().optional(),
  date: z.string().optional(),
  name: z.string().min(1, "Class name is required").max(100),
  totalStudent: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1)).optional(),
  storageId: z.string().nullable().optional(),
  isLargeClass: z.preprocess((a) => a === 'true', z.boolean()),
});

export type CreateSchoolClassroomSchemaType = z.infer<typeof CreateSchoolClassroomSchema>;

export const BulkUpdateTotalStudentSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      totalStudent: z.number().min(0),
      updatedBy: z.string(),
    })
  ),
});

export type BulkUpdateTotalStudentSchemaType = z.infer<typeof BulkUpdateTotalStudentSchema>;

export const ListSchoolClassroomQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  schoolId: z.string().optional(),
  isLargeClass: z.enum(["true", "false"]).optional(),
});

export type ListSchoolClassroomQuerySchemaType = z.infer<typeof ListSchoolClassroomQuerySchema>;