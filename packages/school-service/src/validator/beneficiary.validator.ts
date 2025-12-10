import z from "zod";
import { paginationSchema } from "./global.validator";

const BeneficiaryBaseSchema = z.object({
  name: z.string().min(3, "Nama sekolah minimal 3 karakter.").max(100),
  kitchenId: z.string(),
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
  joinedDate: z.string(),
  category: z.string(),
  smallPortion: z.number().min(0).default(0),
  smallDeliveryTime: z.string().min(1, "Jam porsi kecil harus diisi"),
  largePortion: z.number().min(0).default(0),
  largeDeliveryTime: z.string().min(1, "Jam porsi besar harus diisi"),
  status: z.string(),
});

export const CreateBeneficiarySchema = BeneficiaryBaseSchema.extend({
  name: BeneficiaryBaseSchema.shape.name.nonempty("Nama sekolah wajib diisi."),
  kitchenId: BeneficiaryBaseSchema.shape.kitchenId.optional(),
  users: z.array(
    z.string()
  ).optional(),
  storageId: z.string().optional(),
  imageURL: z.string().optional(),
});

export type CreateBeneficiarySchemaType = z.infer<typeof CreateBeneficiarySchema>;

export const ListBeneficiaryQuerySchema = paginationSchema.extend({
  name: z.string().optional(),
  kitchenId: z.string().optional(),
  isDeleted: z.preprocess((a) => a === 'true', z.boolean()).optional(),
  neLat: z.string().optional(),
  neLng: z.string().optional(),
  swLat: z.string().optional(),
  swLng: z.string().optional(),
});

export type ListBeneficiaryQuerySchemaType = z.infer<typeof ListBeneficiaryQuerySchema>;

export const AssignUserToBeneficiarySchema = z.object({
  userId: z.string().nonempty(),
});

export type AssignUserToBeneficiarySchemaType = z.infer<typeof AssignUserToBeneficiarySchema>;

export const BulkUpdateItemSchema = z.string("ID sekolah harus berupa format UUID yang valid");

export type BulkUpdateItem = z.infer<typeof BulkUpdateItemSchema>;

export const BulkUpdateBeneficiarySchema = z.object({
  data: z.array(
    BulkUpdateItemSchema
  ).min(1, "Array bulk update tidak boleh kosong"),
  userId: z.string(),
  kitchenId: z.string()
});

export type BulkUpdateBeneficiarySchemaType = z.infer<typeof BulkUpdateBeneficiarySchema>;