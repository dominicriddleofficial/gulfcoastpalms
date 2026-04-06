/**
 * Google Reviews data — update this array when new reviews come in.
 * To update: just edit the entries below. No component code changes needed.
 */
export interface GoogleReview {
  name: string;
  rating: number;
  relativeDate: string;
  text: string;
}

export const GOOGLE_REVIEW_URL = "https://g.page/r/YOUR_GOOGLE_BUSINESS_PROFILE/review";
// TODO: Replace with actual Google Business Profile review link

export const aggregateRating = {
  score: 4.9,
  count: 87,
};

export const reviews: GoogleReview[] = [
  {
    name: "Sarah M.",
    rating: 5,
    relativeDate: "2 weeks ago",
    text: "Gulf Coast Palms completely transformed our front yard. The diamond cut on our Canary Island palms looks absolutely stunning — like a five-star resort. Fast, professional, and reasonably priced.",
  },
  {
    name: "Mike & Jessica T.",
    rating: 5,
    relativeDate: "3 weeks ago",
    text: "We had 12 palms that were badly overgrown and they knocked them all out in one day. The crew was respectful, cleaned up everything, and our palms have never looked better.",
  },
  {
    name: "Robert K.",
    rating: 5,
    relativeDate: "1 month ago",
    text: "I manage several rental properties and Gulf Coast Palms is my go-to for all palm maintenance. They're reliable, affordable, and always do top-quality work.",
  },
  {
    name: "Linda W.",
    rating: 5,
    relativeDate: "1 month ago",
    text: "Had two large palms removed that were dangerously close to our roof. They handled it quickly and safely — even ground the stumps. True professionals.",
  },
  {
    name: "David P.",
    rating: 5,
    relativeDate: "2 months ago",
    text: "Best palm service on the Emerald Coast. They trimmed all 20 of our HOA's palms and the property looks incredible. Great communication and fair pricing.",
  },
  {
    name: "Jennifer R.",
    rating: 4,
    relativeDate: "2 months ago",
    text: "Very professional and thorough. They installed 6 new Sabal palms at our Destin rental property and they look amazing. The 1-year warranty gives us peace of mind.",
  },
];
