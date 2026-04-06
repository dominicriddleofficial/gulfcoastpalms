import { describe, it, expect } from "vitest";

describe("Review Badge Data", () => {
  it("uses aggregateRating from data file, not hardcoded values", async () => {
    const { aggregateRating } = await import("@/data/reviews");
    expect(aggregateRating.score).toBe(5.0);
    expect(aggregateRating.count).toBe(37);
  });

  it("GOOGLE_REVIEW_URL is not a placeholder path", async () => {
    const { GOOGLE_REVIEW_URL } = await import("@/data/reviews");
    expect(GOOGLE_REVIEW_URL).not.toContain("REPLACE_WITH_PLACE_ID");
    expect(GOOGLE_REVIEW_URL).not.toContain("YOUR_GOOGLE_BUSINESS_PROFILE");
    expect(GOOGLE_REVIEW_URL).toMatch(/^https?:\/\//);
  });
});
