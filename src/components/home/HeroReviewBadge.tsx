import { Star } from "lucide-react";
import { aggregateRating } from "@/data/reviews";

const HeroReviewBadge = () => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm">
    <Star className="w-4 h-4 text-palm-gold fill-palm-gold" />
    <span className="font-body text-sm font-semibold text-primary-foreground">
      {aggregateRating.score}
    </span>
    <span className="font-body text-xs text-palm-sand/70">
      — {aggregateRating.count}+ Google Reviews
    </span>
  </div>
);

export default HeroReviewBadge;
