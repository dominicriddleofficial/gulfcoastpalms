import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const areas = ["Pensacola", "Gulf Breeze", "Navarre", "Fort Walton Beach", "Destin"];

const ServiceAreasSection = () => (
  <section className="section-padding bg-background">
    <div className="container mx-auto text-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          Service Areas
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          Service Areas
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground max-w-2xl mx-auto mb-8">
          We proudly provide palm tree trimming and professional palm services throughout:
        </motion.p>
        <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-6">
          {areas.map((area) => (
            <span key={area} className="px-5 py-2.5 rounded-full bg-secondary text-secondary-foreground font-body font-medium text-sm whitespace-nowrap">
              {area}, FL
            </span>
          ))}
        </motion.div>
        <motion.p variants={fadeUp} custom={4} className="font-body text-muted-foreground">
          And surrounding Emerald Coast communities.
        </motion.p>
      </motion.div>
    </div>
  </section>
);

export default ServiceAreasSection;
