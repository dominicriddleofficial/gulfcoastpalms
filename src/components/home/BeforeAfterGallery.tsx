import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import beforeGarage from "@/assets/before-garage.jpeg";
import job2 from "@/assets/gallery/job-2.jpeg";
import job3 from "@/assets/gallery/job-3.jpeg";
import job4 from "@/assets/gallery/job-4.jpeg";
import job5 from "@/assets/gallery/job-5.jpeg";
import job6 from "@/assets/gallery/job-6.jpeg";

/**
 * Before & After gallery — placeholder structure.
 * TODO: Replace with real before/after image pairs when available.
 * Each pair should have a `before` and `after` image URL.
 */
const galleryPairs = [
  {
    before: job1,
    after: job2,
    service: "Trimming",
    caption: "Overgrown Canary Island Date Palm — trimmed & diamond cut",
  },
  {
    before: job3,
    after: job4,
    service: "Removal",
    caption: "Dead palm safely removed from residential property",
  },
  {
    before: job5,
    after: job6,
    service: "HOA/Commercial",
    caption: "HOA community — 40+ palms trimmed in one day",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const BeforeAfterGallery = () => (
  <section className="section-padding bg-background">
    <div className="container mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
        <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          Before & After
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          See the Difference
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground max-w-2xl mx-auto">
          Tap or hover to see the transformation. Real results from Gulf Coast properties.
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {galleryPairs.map((pair, i) => (
          <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
            <BeforeAfterCard pair={pair} />
          </motion.div>
        ))}
      </div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mt-10">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-primary/90 transition-colors"
        >
          Like what you see? Get a free estimate <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  </section>
);

function BeforeAfterCard({ pair }: { pair: typeof galleryPairs[0] }) {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group"
      onClick={() => setShowAfter(!showAfter)}
      onMouseEnter={() => setShowAfter(true)}
      onMouseLeave={() => setShowAfter(false)}
    >
      <div className="aspect-[4/3] relative">
        <motion.img
          src={pair.before}
          alt={`Before: ${pair.caption}`}
          className="w-full h-full object-cover absolute inset-0"
          animate={{ opacity: showAfter ? 0 : 1 }}
          transition={{ duration: 0.4 }}
          loading="lazy"
        />
        <motion.img
          src={pair.after}
          alt={`After: ${pair.caption}`}
          className="w-full h-full object-cover absolute inset-0"
          animate={{ opacity: showAfter ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          loading="lazy"
        />
      </div>

      {/* Label */}
      <div className="absolute top-3 left-3">
        <span className={`px-3 py-1 rounded-full text-xs font-body font-bold uppercase tracking-wider ${showAfter ? "bg-primary text-primary-foreground" : "bg-foreground/80 text-background"}`}>
          {showAfter ? "After" : "Before"}
        </span>
      </div>

      {/* Caption */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/80 to-transparent p-4">
        <span className="px-2 py-0.5 rounded bg-palm-gold/90 text-palm-dark text-[10px] font-body font-bold uppercase">{pair.service}</span>
        <p className="font-body text-xs text-background/90 mt-1">{pair.caption}</p>
      </div>
    </div>
  );
}

export default BeforeAfterGallery;
