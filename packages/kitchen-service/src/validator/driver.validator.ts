import z from "zod";
import { paginationSchema } from "./global.validator";

// BASE

const DriverBaseSchema = z.object({
  licenseNumber: z.string().max(50).optional(),

  isActive: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          const lower = val.toLowerCase();
          if (lower === "true" || lower === "1") return true;
          if (lower === "false" || lower === "0") return false;
        }
        return val;
      },
      z.preprocess((a) => a === "true", z.boolean()).optional()
    )
    .optional(),

  userId: z.string(),
  kitchenId: z.string(),
});

// CRUD

export const CreateDriverSchema = DriverBaseSchema.extend({
  userId: DriverBaseSchema.shape.userId.nonoptional(),
  kitchenId: DriverBaseSchema.shape.kitchenId.nonoptional(),
});

export const UpdateDriverSchema = DriverBaseSchema.partial();

// QUERY

export const ListDriversQuerySchema = paginationSchema.extend({
  is_active: DriverBaseSchema.shape.isActive,
  kitchenId: z.string().optional(),
});

// TYPES

export type CreateDriverSchemaType = z.infer<
  typeof CreateDriverSchema
>;

export type UpdateDriverSchemaType = z.infer<
  typeof UpdateDriverSchema
>;

export type ListDriversQuerySchemaType = z.infer<
  typeof ListDriversQuerySchema
>;
