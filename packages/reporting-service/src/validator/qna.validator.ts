import { z } from "zod";

export const qnaQuerySchema = z.object({
  tab: z.enum(["latest", "popular", "pinned", "unanswered"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

export const CreateQuestionSchema = z.object({
  title: z.string().min(10, "Judul pertanyaan minimal 10 karakter"),
  content: z.string().min(20, "Detail pertanyaan minimal 20 karakter"),
  excerpt: z.string(),
  category: z.string().min(1, "Kategori diperlukan"),
  tags: z.array(z.string()).optional().default([]),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.string().optional(),
    type: z.string().optional()
  })).optional().default([]),
});

export const UpdateQuestionSchema = CreateQuestionSchema.partial();

export const CreateAnswerSchema = z.object({
  questionId: z.string().uuid(),
  content: z.string().min(10, "Jawaban minimal 10 karakter"),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.string().optional(),
    type: z.string().optional()
  })).optional().default([]),
});

export const VoteSchema = z.object({
  voteType: z.enum(["up", "down"]),
});

export type QnaQuerySchemaType = z.infer<typeof qnaQuerySchema>;
export type CreateQuestionSchemaType = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionSchemaType = z.infer<typeof UpdateQuestionSchema>;
export type CreateAnswerSchemaType = z.infer<typeof CreateAnswerSchema>;
export type VoteSchemaType = z.infer<typeof VoteSchema>;
