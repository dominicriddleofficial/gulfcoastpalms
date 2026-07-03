import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HERO_IMAGE_URL, heroImageSrc, heroSrcSet } from "@/data/assets";
import HeroReviewBadge from "@/components/home/HeroReviewBadge";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";
import QuoteRequestButton from "@/components/cta/QuoteRequestButton";

const HeroSection = () => {
  return (
    <section className="relative min-h-[80vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-6 pb-10 md:pt-12 md:pb-16">
      <div className="absolute inset-0">
        <picture>
          <source type="image/avif" srcSet={heroSrcSet("avif")} sizes="100vw" />
          <source type="image/webp" srcSet={heroSrcSet("webp")} sizes="100vw" />
          <img
            src={heroImageSrc(1280, "jpg")}
            srcSet={heroSrcSet("jpg")}
            sizes="100vw"
            alt="Gulf Coast Palms — Professional Palm Tree Trimming and Removal in NW Florida"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => {
              // Fallback to raw object URL if the render endpoint isn't available
              const img = e.currentTarget;
              if (img.src !== HERO_IMAGE_URL) img.src = HERO_IMAGE_URL;
            }}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-palm-dark/70 via-palm-dark/50 to-palm-dark/80" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-4 md:mb-5 px-3 md:px-4 py-1.5 rounded-full bg-palm-gold/12 border border-palm-gold/40 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-palm-gold" aria-hidden />
          <span className="font-body text-palm-gold font-semibold uppercase tracking-[0.18em] text-[10.5px] md:text-[12px]">
            Serving Perdido Key to 30A
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-[38px] sm:text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground leading-[1.1] md:leading-tight mb-4"
        >
          Resort-Quality Palm Care{" "}
          <span className="text-gradient-primary">for Florida's Emerald Coast</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-body text-sm md:text-lg text-palm-sand/80 max-w-2xl mx-auto mb-4"
        >
          Licensed specialists trusted by 500+ Emerald Coast homeowners. Same-day estimates. No generalist crews.
        </motion.p>
        {/* Review badge — above CTA on mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mb-3 md:hidden"
        >
          <HeroReviewBadge compact />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
        >
          <QuoteRequestButton
            source="hero"
            className="w-full sm:w-auto md:px-8 md:py-4 md:text-lg shadow-brand hover:-translate-y-0.5 transition-transform"
          >
            Get a Free Quote Online
          </QuoteRequestButton>
          <Link
            to="/services"
            className="hidden md:inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border border-primary-foreground/25 bg-primary-foreground/5 backdrop-blur-sm text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/12 hover:border-primary-foreground/50 transition-all"
          >
            View Our Services
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        {/* Secondary call link (mobile + desktop) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-3"
        >
          <a
            href={TEL_HREF}
            className="inline-block font-body text-sm text-palm-sand/75 hover:text-primary-foreground underline-offset-4 hover:underline transition-colors"
          >
            or call <span className="font-semibold text-primary-foreground">{GCP_BUSINESS.phoneDisplay}</span>
          </a>
        </motion.div>

        {/* Review badge — below buttons on desktop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 hidden md:block"
        >
          <HeroReviewBadge />
        </motion.div>

        {/* Emergency banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 md:mt-6"
        >
          <Link
            to="/emergency-palm-service"
            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-full bg-destructive/15 border border-destructive/40 backdrop-blur-sm text-primary-foreground font-body text-xs md:text-sm font-semibold hover:bg-destructive/25 transition-colors"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" aria-hidden />
            Hurricane Season — Emergency Service
            <span className="hidden md:inline"> Available</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
