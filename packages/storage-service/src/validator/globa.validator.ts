import z from "zod";

const idSchema = z.uuid("ID harus dalam format UUID.");

const sortItemSchema = z.object({
  column: z.string().min(1),
  direction: z.union([z.literal("asc"), z.literal("desc")]),
});

export const sortSchema = z
  .string()
  .optional()
  .transform((val): Array<z.infer<typeof sortItemSchema>> => {
    if (!val) return [];

    return val.split(",").map((item) => {
      const [column, dir] = item.split(":");

      return sortItemSchema.parse({
        column: column.trim(),
        direction: dir?.trim() === "desc" ? "desc" : "asc",
      });
    });
  });

export const paginationSchema = z.object({
  page: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1)).optional().default(1),
  limit: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1).max(100)).optional().default(10),
  sort: sortSchema.default([]),
});


export const idParamSchema = z.object({
  id: idSchema,
});

export const fileSchema = z.instanceof(File, {
  message: "Invalid file type",
}).refine((file) => file.size <= 15 * 1024 * 1024, "File size max 15MB")
  .refine(
    (file) => ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
    "Only JPEG, PNG, or PDF files are allowed");

export const uploadFileSchema = z
  .union([
    fileSchema,
    z.array(fileSchema).nonempty(),
  ])
  .optional();
