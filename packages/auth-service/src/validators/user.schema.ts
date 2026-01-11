import { z } from "zod";

export const EmailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

export const UsernameSchema = z
  .string()
  .min(1, "Username is required");

export const UserDetailSchema = z.object({
  fullName: z.string().max(1000).optional(),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
});

export type UserDetailSchemaType = z.infer<typeof UserDetailSchema>;
