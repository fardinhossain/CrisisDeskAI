import { z } from "zod";

/**
 * Zod validation schema for POST /api/auth/login body.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .email("Invalid email address format.")
    .trim(),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password cannot be empty."),
});
