import { z } from "zod";

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
