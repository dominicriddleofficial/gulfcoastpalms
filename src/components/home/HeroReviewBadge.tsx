import { Star } from "lucide-react";
import { aggregateRating, GOOGLE_REVIEW_URL } from "@/data/reviews";

interface HeroReviewBadgeProps {
  compact?: boolean;
}

const HeroReviewBadge = ({ compact }: HeroReviewBadgeProps) => (
  <a
    href={GOOGLE_REVIEW_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${aggregateRating.score} stars from ${aggregateRating.count} Google reviews — read on Google`}
    className={`inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm hover:bg-primary-foreground/15 transition-colors ${compact ? "px-3 py-1" : "gap-2 px-4 py-2"}`}
  >
    <Star className={`text-palm-gold fill-palm-gold ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
    <span className={`font-body font-semibold text-primary-foreground ${compact ? "text-xs" : "text-sm"}`}>
      {aggregateRating.score.toFixed(1)}
    </span>
    <span className={`font-body text-palm-sand/70 ${compact ? "text-[11px]" : "text-xs"}`}>
      · {aggregateRating.count} Google Reviews
    </span>
  </a>
);

export default HeroReviewBadge;
