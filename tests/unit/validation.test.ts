import { describe, it, expect } from "vitest";
import { matchIdSchema, validateMatchId } from "@/lib/validation";

describe("matchIdSchema", () => {
  it("accepts a 10-digit match ID", () => {
    const result = matchIdSchema.safeParse("8583844960");
    expect(result.success).toBe(true);
  });

  it("accepts an 8-digit match ID", () => {
    const result = matchIdSchema.safeParse("12345678");
    expect(result.success).toBe(true);
  });

  it("accepts a 12-digit match ID", () => {
    const result = matchIdSchema.safeParse("123456789012");
    expect(result.success).toBe(true);
  });

  it("rejects alphabetic input", () => {
    const result = matchIdSchema.safeParse("abc");
    expect(result.success).toBe(false);
  });

  it("rejects a 3-digit input (too short)", () => {
    const result = matchIdSchema.safeParse("123");
    expect(result.success).toBe(false);
  });

  it("rejects a 13-digit input (too long)", () => {
    const result = matchIdSchema.safeParse("1234567890123");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = matchIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("validateMatchId", () => {
  it("returns valid: true for a valid match ID", () => {
    const result = validateMatchId("8583844960");
    expect(result).toEqual({ valid: true });
  });

  it("returns valid: false with error for invalid input", () => {
    const result = validateMatchId("abc");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Match ID must be 8-12 digits");
  });

  it("trims whitespace before validation", () => {
    const result = validateMatchId("  8583844960  ");
    expect(result).toEqual({ valid: true });
  });

  it("returns error for empty string", () => {
    const result = validateMatchId("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
