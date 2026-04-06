import { motion } from "framer-motion";
import { Star, ExternalLink } from "lucide-react";
import { reviews, aggregateRating, GOOGLE_REVIEW_URL } from "@/data/reviews";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const GoogleReviews = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
          <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            What Our Customers Say
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Real Reviews, Real Results
          </motion.h2>

          {/* Aggregate */}
          <motion.div variants={fadeUp} custom={2} className="flex items-center justify-center gap-2 mb-2">
            <span className="font-display text-3xl font-bold text-foreground">{aggregateRating.score}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < Math.round(aggregateRating.score) ? "fill-palm-gold text-palm-gold" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="font-body text-sm text-muted-foreground">based on {aggregateRating.count} reviews</span>
          </motion.div>
        </motion.div>

        {/* Carousel — mobile scroll, desktop grid */}
        <div className="md:hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {reviews.map((r, i) => (
              <ReviewCard key={i} review={r} className="min-w-[85%]" />
            ))}
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
              <ReviewCard review={r} />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-primary/90 transition-colors"
          >
            See All Reviews on Google <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-body font-semibold hover:bg-secondary transition-colors"
          >
            Leave Us a Review ⭐
          </a>
        </div>
      </div>
    </section>
  );
};

function ReviewCard({ review, className }: { review: typeof reviews[0]; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 flex flex-col ${className ?? ""}`}>
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: review.rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-palm-gold text-palm-gold" />
        ))}
      </div>
      <p className="font-body text-sm text-foreground/85 leading-relaxed flex-1 mb-4">"{review.text}"</p>
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-sm text-foreground">{review.name}</span>
        <span className="font-body text-xs text-muted-foreground">{review.relativeDate}</span>
      </div>
    </div>
  );
}

export default GoogleReviews;
