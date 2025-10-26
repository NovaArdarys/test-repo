import z from "zod";
import { paginationSchema } from "./globa.validator";

const driverBaseSchema = z.object({
  licenseNumber: z.string().max(50).optional(),

  isActive: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
      }
      return val;
    },
    z.preprocess((a) => a === 'true', z.boolean()).optional()
  ).optional(),

  userId: z.string(),
  kitchenId: z.string(),
});

export const createDriverSchema = driverBaseSchema.extend({
  userId: driverBaseSchema.shape.userId.nonoptional(),
  kitchenId: driverBaseSchema.shape.kitchenId.nonoptional(),
});

export type CreateDriverSchemaType = z.infer<typeof createDriverSchema>;

export const listDriversQuerySchema = paginationSchema.extend({
  is_active: driverBaseSchema.shape.isActive,
  kitchenId: z.string().optional(),
});