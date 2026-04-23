import { motion } from "framer-motion";
import { Phone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HERO_IMAGE_URL } from "@/data/assets";
import HeroReviewBadge from "@/components/home/HeroReviewBadge";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE_URL}
          alt="Gulf Coast Palms — Professional Palm Tree Trimming and Removal in NW Florida"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-palm-dark/70 via-palm-dark/50 to-palm-dark/80" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-4"
        >
          Palm Tree Trimming & Professional Palm Services from Perdido Key to 30A
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground leading-tight mb-6"
        >
          Resort-Quality Palm Care{" "}
          <span className="text-gradient-primary">for Florida's Emerald Coast</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-body text-lg md:text-xl text-palm-sand/80 max-w-2xl mx-auto mb-10"
        >
          Everyone's trusted specialists in palm tree trimming, diamond cutting, and professional palm care — serving Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and surrounding coastal communities.
        </motion.p>
        {/* Review badge — above CTA on mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mb-4 md:hidden"
        >
          <HeroReviewBadge compact />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href={TEL_HREF}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-palm-light transition-all shadow-lg shadow-primary/30 whitespace-nowrap"
          >
            <Phone className="w-5 h-5 shrink-0" />
            <span className="flex flex-col sm:flex-row sm:gap-2 items-center leading-tight">
              <span>Call for a Free Quote</span>
              <span>{GCP_BUSINESS.phoneDisplay}</span>
            </span>
          </a>
          <Link
            to="/services"
            className="hidden md:inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/10 transition-all"
          >
            View Our Services
            <ArrowRight className="w-5 h-5" />
          </Link>
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
          className="mt-3 md:mt-4"
        >
          <Link
            to="/emergency-palm-service"
            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-full bg-destructive/20 border border-destructive/40 text-primary-foreground font-body text-xs md:text-sm font-semibold hover:bg-destructive/30 transition-colors"
          >
            🌀 Hurricane Season — Emergency Service
            <span className="hidden md:inline"> Available</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
