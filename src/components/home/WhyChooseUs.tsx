import { motion } from "framer-motion";
import { Star } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const points = [
  "Trusted by 500+ Emerald Coast Homeowners",
  "5-Star Rated Across the Emerald Coast",
  "Licensed & Insured Professionals",
  "Diamond Cutting & Coastal Palm Specialists",
  "Large Properties with 100+ Palms",
  "Trusted by HOAs & Waterfront Estates",
];

const WhyChooseUs = () => (
  <section className="section-padding bg-palm-dark">
    <div className="container mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <motion.span variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-palm-gold/40 bg-palm-gold/10 font-body text-palm-gold text-xs font-bold uppercase tracking-[0.15em] mb-4">
          ★ Locally Owned & Operated ★
        </motion.span>
        <motion.p variants={fadeUp} custom={1} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          Why Choose Us
        </motion.p>
        <motion.h2 variants={fadeUp} custom={2} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground">
          Why Homeowners & Property Managers Choose Gulf Coast Palms
        </motion.h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {points.map((point, i) => (
          <motion.div
            key={point}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="flex items-start gap-3 p-5 rounded-xl border border-palm-green/20 bg-palm-dark"
          >
            <Star className="w-5 h-5 text-palm-gold shrink-0 mt-0.5" />
            <p className="font-body text-primary-foreground font-medium">{point}</p>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={0}
        className="font-body text-palm-sand/80 max-w-3xl mx-auto text-center leading-relaxed"
      >
        Our certified team corrects damage from improper trimming and ensures cleaner cuts, stronger crowns, and healthier trees built to withstand Florida storms.
      </motion.p>
    </div>
  </section>
);

export default WhyChooseUs;
