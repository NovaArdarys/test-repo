import { z } from "zod";

export const EmailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

export const UsernameSchema = z
  .string()
  .min(1, "Username is required")
  .min(3, "Username must be at least 3 characters");

export const UserDetailSchema = z.object({
  fullName: z.string().min(1, "Full name is required").optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
});
