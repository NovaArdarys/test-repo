import { z } from "zod";

export const emailJobSchema = z.discriminatedUnion("type", [

  // forgot password email
  z.object({
    type: z.literal("forgot-password"),
    to: z.string(),
    data: z.object({
      resetLink: z.string(),
    }),
  }),

  // reset confirmation email
  z.object({
    type: z.literal("reset-password"),
    to: z.string(),
    data: z.object({
      username: z.string().optional(),
    }),
  }),

  // reset confirmation
  z.object({
    type: z.literal("confirmation"),
    to: z.string(),
    data: z.object({
      confirmationLink: z.string(),
    }),
  }),

  // otp email
  z.object({
    type: z.literal("otp"),
    to: z.string(),
    data: z.object({
      otpCode: z.string().min(4).max(10),
    }),
  }),

]);

export type EmailJob = z.infer<typeof emailJobSchema>;
