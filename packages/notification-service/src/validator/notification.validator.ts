// src/validator/web/notification.validator.ts
import { z } from "zod";
import { paginationSchema } from "@/validator/global.validator";

export const listNotificationQuerySchema = paginationSchema.extend({
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const recentNotificationQuerySchema = z.object({
  hoursAgo: z
    .preprocess(
      (v) => (v === undefined ? 24 : Number(v)),
      z.number().min(1).max(168)
    )
    .optional()
    .default(24),
});

export const notificationTypeParamSchema = z.object({
  type: z.string().min(1),
});

export const notificationEntityParamSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export const typeParamSchema = z.object({
  type: z.string().min(1),
});

export const entityParamSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});
