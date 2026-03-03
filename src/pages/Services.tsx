import { motion } from "framer-motion";
import { Phone, ArrowRight, Check } from "lucide-react";
import Layout from "@/components/Layout";
import palmTrimming from "@/assets/palm-trimming.jpg";
import diamondCutting from "@/assets/diamond-cutting.jpg";
import trunkSkinning from "@/assets/trunk-skinning.jpg";
import palmInstall from "@/assets/palm-install.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const servicesData = [
  {
    title: "Palm Trimming",
    image: palmTrimming,
    description: "Keep your palm trees healthy, safe, and looking their best with professional trimming from Gulf Coast Palms. We remove dead fronds, seed pods, and debris to promote healthy growth and enhance curb appeal.",
    benefits: ["Prevents storm damage from loose fronds", "Promotes healthier palm growth", "Improves property curb appeal", "Safe removal of coconuts & seed pods"],
  },
  {
    title: "Diamond Cutting",
    image: diamondCutting,
    description: "Our signature diamond cut technique creates stunning geometric patterns on your palm trunk, giving your property a resort-quality, luxury aesthetic that turns heads.",
    benefits: ["Resort-quality trunk appearance", "Unique diamond-shaped pattern", "Long-lasting visual impact", "Perfect for high-end properties"],
  },
  {
    title: "Trunk Skinning",
    image: trunkSkinning,
    description: "Trunk skinning removes the old leaf bases (boots) from the palm trunk, revealing a smooth, clean surface. This gives your palms a polished, well-maintained look.",
    benefits: ["Smooth, clean trunk finish", "Eliminates pest habitats", "Enhances the palm's silhouette", "Low-maintenance result"],
  },
  {
    title: "Installs & Removals",
    image: palmInstall,
    description: "Whether you're adding palms to your landscape or need safe, professional removal, our crew handles every job with precision equipment and expert care.",
    benefits: ["Professional crane & equipment", "Safe, damage-free removal", "Expert transplanting", "Site cleanup included"],
  },
];

const Services = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3"
          >
            Our Services
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4"
          >
            Professional Palm Tree Services
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto"
          >
            Serving Navarre, Fort Walton Beach, Destin, Pensacola, Gulf Breeze, Milton, Niceville, Crestview, 30A & Perdido Key.
          </motion.p>
        </div>
      </section>

      {/* Services Detail */}
      {servicesData.map((service, idx) => (
        <section
          key={service.title}
          className={`section-padding ${idx % 2 === 0 ? "bg-background" : "bg-secondary"}`}
        >
          <div className="container mx-auto">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${idx % 2 !== 0 ? "lg:direction-rtl" : ""}`}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0}
                className={`${idx % 2 !== 0 ? "lg:order-2" : ""}`}
              >
                <img
                  src={service.image}
                  alt={`${service.title} - Gulf Coast Palms professional service in Northwest Florida`}
                  className="rounded-2xl shadow-xl w-full h-80 lg:h-[450px] object-cover"
                  loading="lazy"
                />
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`${idx % 2 !== 0 ? "lg:order-1" : ""}`}
              >
                <motion.h2
                  variants={fadeUp}
                  custom={0}
                  className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4"
                >
                  {service.title}
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  custom={1}
                  className="font-body text-muted-foreground leading-relaxed mb-6"
                >
                  {service.description}
                </motion.p>
                <motion.ul variants={fadeUp} custom={2} className="space-y-3 mb-8">
                  {service.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-3 font-body text-foreground">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </motion.ul>
                <motion.a
                  variants={fadeUp}
                  custom={3}
                  href="tel:8509101290"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-palm-light transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Get a Free Quote
                </motion.a>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Palms?
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Call or text us today for a free, no-obligation quote.
          </p>
          <a
            href="tel:8509101290"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
          >
            <Phone className="w-6 h-6" />
            (850) 910-1290
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
