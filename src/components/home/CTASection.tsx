import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";
import { trackEvent } from "@/lib/analytics";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const CTASection = () => (
  <section className="section-padding bg-primary">
    <div className="container mx-auto text-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <motion.h2 variants={fadeUp} custom={0} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
          Get a Free Quote Today
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
          Call or text us for a free estimate on any palm tree service. Fast response guaranteed.
        </motion.p>
        <motion.a
          variants={fadeUp}
          custom={2}
          href={TEL_HREF}
          onClick={() => {
            trackEvent("phone_click", { source: "bottom_cta" });
            window.gtag?.("event", "phone_click", { source: "bottom_cta" });
          }}
          className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
        >
          <Phone className="w-6 h-6" />
          {GCP_BUSINESS.phoneDisplay}
        </motion.a>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
