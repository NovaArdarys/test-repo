import z from "zod";
import { paginationSchema } from "./globa.validator";

const kitchenBaseSchema = z.object({
  name: z.string().min(3, "Nama dapur minimal 3 karakter.").max(100),
  address: z.string().optional(),
  phoneNumber: z.string().max(20).optional(),
  lon: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number()
  ),
  lat: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number()
  ),

  provinceId: z.string(),
  regencyId: z.string(),
  districtId: z.string(),
  villageId: z.string(),
});

export const createKitchenSchema = kitchenBaseSchema.extend({
  name: kitchenBaseSchema.shape.name.nonempty(),
  schools: z.array(
    z.string()
  ).optional(),
  users: z.array(
    z.string()
  ).optional(),
});

export type CreateKitchenSchemaType = z.infer<typeof createKitchenSchema>;

export const assignUserToKitchenSchema = z.object({
  userId: z.string().nonempty(),
});

export type AssignUserToKitchenSchemaType = z.infer<typeof assignUserToKitchenSchema>;

export const listKitchensQuerySchema = paginationSchema.extend({
  name: z.string().optional(),
  isDeleted: z.preprocess((a) => a === 'true', z.boolean()).optional(),
  neLat: z.string().optional(),
  neLng: z.string().optional(),
  swLat: z.string().optional(),
  swLng: z.string().optional(),
});

export type ListKitchensQuerySchemaType = z.infer<typeof listKitchensQuerySchema>;

