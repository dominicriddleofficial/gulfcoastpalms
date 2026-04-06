import { describe, it, expect } from "vitest";

/**
 * Phone number normalization utility.
 * Normalizes various US phone number formats to a clean 10-digit string.
 */
export function normalizePhone(input: string): string | null {
  // Strip all non-digit characters
  const digits = input.replace(/\D/g, "");

  // Handle US country code prefix
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  // Standard 10-digit US number
  if (digits.length === 10) {
    return digits;
  }

  // Invalid length
  return null;
}

describe("normalizePhone", () => {
  it("normalizes standard 10-digit number", () => {
    expect(normalizePhone("8509101290")).toBe("8509101290");
  });

  it("strips dashes", () => {
    expect(normalizePhone("850-910-1290")).toBe("8509101290");
  });

  it("strips parentheses and spaces", () => {
    expect(normalizePhone("(850) 910-1290")).toBe("8509101290");
  });

  it("strips dots", () => {
    expect(normalizePhone("850.910.1290")).toBe("8509101290");
  });

  it("handles +1 country code", () => {
    expect(normalizePhone("+1 850-910-1290")).toBe("8509101290");
  });

  it("handles 1-prefix without plus", () => {
    expect(normalizePhone("18509101290")).toBe("8509101290");
  });

  it("returns null for too short", () => {
    expect(normalizePhone("85091")).toBeNull();
  });

  it("returns null for too long", () => {
    expect(normalizePhone("185091012901234")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("handles mixed formatting", () => {
    expect(normalizePhone("  (850)  910 - 1290  ")).toBe("8509101290");
  });
});
