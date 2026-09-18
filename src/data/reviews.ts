import { GCP_BUSINESS } from "@/lib/business-info";

/** Public profile for reading reviews; separate from the write-review flow. */
export const GOOGLE_BUSINESS_URL = "https://g.page/r/CVI5xmZYC-NAEBM";
export const GOOGLE_REVIEW_URL =
  import.meta.env.VITE_GOOGLE_REVIEW_URL || `${GOOGLE_BUSINESS_URL}/review`;

/** Manually checked against the public Google profile; not a live API feed. */
export const aggregateRating = {
  score: Number(GCP_BUSINESS.aggregateRating.ratingValue),
  count: Number(GCP_BUSINESS.aggregateRating.reviewCount),
  checkedAt: GCP_BUSINESS.aggregateRating.checkedAt,
};

export interface GoogleReview {
  name: string;
  rating: number;
  text: string;
  sourceUrl: string;
}

/** Short, exact excerpts verified on Google Maps on 2026-09-18.
 * Keep original wording and attribution. Do not invent relative dates.
 */
export const reviews: GoogleReview[] = [
  {
    name: "Susan Bonsignore",
    rating: 5,
    text: "Dom and his crew are AMAZING!",
    sourceUrl: GOOGLE_BUSINESS_URL,
  },
  {
    name: "Mallory Wilson",
    rating: 5,
    text: "We had an excellent experience with Gulf Coast Palms!",
    sourceUrl: GOOGLE_BUSINESS_URL,
  },
  {
    name: "Alina Nazaruk",
    rating: 5,
    text: "Communication was great",
    sourceUrl: GOOGLE_BUSINESS_URL,
  },
];
