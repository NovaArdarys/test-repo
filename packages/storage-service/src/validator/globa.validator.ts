import z from "zod";

const idSchema = z.uuid("ID harus dalam format UUID.");

export const paginationSchema = z.object({
  page: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1)).optional().default(1),
  limit: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1).max(100)).optional().default(10),
});


export const idParamSchema = z.object({
  id: idSchema,
});

export const fileSchema = z.instanceof(File, {
  message: "Invalid file type",
}).refine((file) => file.size <= 5 * 1024 * 1024, "File size max 5MB")
  .refine(
    (file) => ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
    "Only JPEG, PNG, or PDF files are allowed");

export const uploadFileSchema = z
  .union([
    fileSchema,
    z.array(fileSchema).nonempty(),
  ])
  .optional();
