import z from "zod";

const idSchema = z.uuid("ID harus dalam format UUID.");

export const paginationSchema = z.object({
  page: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1)).optional().default(1),
  limit: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(1).max(100)).optional().default(10),
});

export const idParamSchema = z.object({
  id: idSchema,
});

export const userIdParamSchema = z.object({
  userId: idSchema,
});