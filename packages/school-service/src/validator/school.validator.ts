import z from "zod";
import { paginationSchema } from "./globa.validator";

const schoolBaseSchema = z.object({
  name: z.string().min(3, "Nama sekolah minimal 3 karakter.").max(100),
  kitchenId: z.string().uuid("Kitchen ID harus dalam format UUID."),
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

export const createSchoolSchema = schoolBaseSchema.extend({
  name: schoolBaseSchema.shape.name.nonempty("Nama sekolah wajib diisi."),
  kitchenId: schoolBaseSchema.shape.kitchenId.nonempty("Kitchen ID wajib diisi."),
});

export type CreateSchoolSchemaType = z.infer<typeof createSchoolSchema>;

export const listSchoolsQuerySchema = paginationSchema.extend({
  name: z.string().optional(),
  kitchenId: z.string().optional(),
  isDeleted: z.preprocess((a) => a === 'true', z.boolean()).optional(),
  neLat: z.string().optional(),
  neLng: z.string().optional(),
  swLat: z.string().optional(),
  swLng: z.string().optional(),
});

export type ListSchoolsQuerySchemaType = z.infer<typeof listSchoolsQuerySchema>;

export const assignUserToSchoolSchema = z.object({
  userId: z.string().nonempty(),
});

export type AssignUserToSchoolSchemaType = z.infer<typeof assignUserToSchoolSchema>;

export const BulkUpdateItemSchema = z.string("ID sekolah harus berupa format UUID yang valid");

export type BulkUpdateItem = z.infer<typeof BulkUpdateItemSchema>;

export const BulkUpdateSchoolSchema = z.object({
  data: z.array(
    BulkUpdateItemSchema
  ).min(1, "Array bulk update tidak boleh kosong"),
  userId: z.string(),
  kitchenId: z.string()
});

export type BulkUpdateSchoolSchemaType = z.infer<typeof BulkUpdateSchoolSchema>;