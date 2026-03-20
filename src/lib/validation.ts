import { z } from "zod/v4";

export const matchIdSchema = z
  .string()
  .regex(/^\d{8,12}$/, "Match ID must be 8-12 digits");

export function validateMatchId(input: string): {
  valid: boolean;
  error?: string;
} {
  const result = matchIdSchema.safeParse(input.trim());
  if (!result.success) {
    return { valid: false, error: result.error.issues[0].message };
  }
  return { valid: true };
}
