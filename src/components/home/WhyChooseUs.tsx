import { motion } from "framer-motion";
import { Award, Star, ShieldCheck, Scissors, Building2, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const points: { text: string; Icon: LucideIcon; amber?: boolean }[] = [
  { text: "Trusted by 500+ Emerald Coast Homeowners", Icon: Award, amber: true },
  { text: "5-Star Rated Across the Emerald Coast", Icon: Star, amber: true },
  { text: "Licensed & Insured Professionals", Icon: ShieldCheck },
  { text: "Diamond Cutting & Coastal Palm Specialists", Icon: Scissors },
  { text: "Large Properties with 100+ Palms", Icon: Building2 },
  { text: "Trusted by HOAs & Waterfront Estates", Icon: Home },
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-12">
        {points.map((point, i) => (
          <motion.div
            key={point.text}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="group flex items-center gap-4 p-5 rounded-2xl border border-palm-green/25 bg-gradient-to-br from-palm-dark to-[hsl(150_40%_6%)] hover:border-palm-green/50 hover:-translate-y-0.5 transition-all duration-300 shadow-elev-md hover:shadow-elev-lg"
          >
            <span
              className={`inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                point.amber
                  ? "bg-palm-gold/15 text-palm-gold ring-1 ring-palm-gold/30"
                  : "bg-palm-green/15 text-palm-light ring-1 ring-palm-green/30"
              }`}
              aria-hidden
            >
              <point.Icon className="w-5 h-5" strokeWidth={2.25} />
            </span>
            <p className="font-body text-primary-foreground font-medium leading-snug">{point.text}</p>
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
