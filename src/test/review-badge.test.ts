import { describe, it, expect } from "vitest";
import { GCP_BUSINESS } from "@/lib/business-info";
import { aggregateRating, GOOGLE_REVIEW_URL, GOOGLE_BUSINESS_URL, reviews } from "@/data/reviews";

describe("Review evidence", () => {
  it("keeps visible and build-time rating facts consistent and dated", () => {
    expect(aggregateRating.count).toBe(Number(GCP_BUSINESS.aggregateRating.reviewCount));
    expect(aggregateRating.score).toBe(Number(GCP_BUSINESS.aggregateRating.ratingValue));
    expect(aggregateRating.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("uses separate reading and writing destinations", () => {
    expect(GOOGLE_BUSINESS_URL).not.toMatch(/\/review$/);
    expect(GOOGLE_REVIEW_URL).not.toBe(GOOGLE_BUSINESS_URL);
    for (const review of reviews) {
      expect(review.sourceUrl).toMatch(/^https:\/\//);
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
    }
  });
});
