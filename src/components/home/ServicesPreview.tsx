import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import palmTrimming from "@/assets/palm-trimming.jpg";
import diamondCutting from "@/assets/diamond-cutting.jpg";
import trunkSkinning from "@/assets/trunk-skinning.jpg";
import palmInstall from "@/assets/palm-install.jpg";

const services = [
  {
    title: "Palm Tree Trimming",
    image: palmTrimming,
    link: "/services/palm-tree-trimming",
    desc: "Expert trimming to keep your palms healthy and beautiful year-round.",
    seo: "Regular palm tree trimming is essential for maintaining the health, safety, and curb appeal of your property. Our certified team removes dead and dying fronds, seed pods, and flower stalks with precision — leaving your palms looking pristine without over-trimming.",
  },
  {
    title: "Palm Diamond Cutting",
    image: diamondCutting,
    link: "/services/palm-diamond-cutting",
    desc: "Precision diamond cut patterns that showcase your palm's natural beauty.",
    seo: "Diamond cutting is a specialized technique that creates a distinctive cross-hatch pattern on palm trunks. This resort-style finish transforms ordinary palms into stunning landscape focal points. Popular at beachfront properties and upscale residences across the Emerald Coast.",
  },
  {
    title: "Palm Tree Trunk Skinning",
    image: trunkSkinning,
    link: "/services/palm-tree-trunk-skinning",
    desc: "Clean, smooth trunk skinning for a polished, resort-quality look.",
    seo: "Trunk skinning removes the old leaf bases from the palm trunk, revealing the smooth inner bark beneath. This gives palms a sleek, manicured appearance that's commonly seen at luxury resorts and coastal properties.",
  },
  {
    title: "Palm Tree Installation & Removal",
    image: palmInstall,
    link: "/services/palm-tree-installation",
    desc: "Professional palm tree installation and safe removal services.",
    seo: "Whether you're adding tropical character to your landscape or need a dead or dangerous palm removed, we handle the job safely and efficiently. We source high-quality palms suited for the Gulf Coast climate and ensure proper planting for long-term health.",
  },
  {
    title: "Tree Trimming & Removal",
    image: palmTrimming,
    link: "/services/tree-trimming-removal",
    desc: "Expert trimming and safe removal for oaks, pines, crape myrtles, and more.",
    seo: "Professional tree trimming and removal for all common tree species across the Emerald Coast. Crown thinning, hazard branch removal, storm damage cleanup, and complete debris haul-away for residential and commercial properties.",
  },
  {
    title: "Landscaping Services",
    image: palmInstall,
    link: "/services/landscaping-services",
    desc: "Hedge trimming, mulch, pine straw, sod installation, and bed cleanups.",
    seo: "Full-service landscaping support including professional hedge trimming, mulch and pine straw installation, sod, and seasonal bed cleanups. Keep your entire property looking its best alongside expert palm care.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const ServicesPreview = () => (
  <section className="section-padding bg-background">
    <div className="container mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="text-center mb-16"
      >
        <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          What We Do
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
          Professional Palm Tree Services
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
          From routine trimming to precision pruning and full palm installations, we deliver expert palm care tailored to Florida's coastal climate. Every job is handled with precision, safety, and attention to detail.
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {services.map((service, i) => (
          <motion.div
            key={service.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            custom={i}
          >
            <Link to={service.link} className="group block rounded-2xl overflow-hidden bg-card border border-border/60 shadow-elev-md hover:shadow-elev-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
              <div className="relative h-56 overflow-hidden">
                <img
                  src={service.image}
                  alt={`${service.title} service by Gulf Coast Palms on the Emerald Coast Florida`}
                  className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-[900ms] ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-palm-dark/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="p-6 md:p-8">
                <h3 className="font-display text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed mb-3 font-medium">
                  {service.desc}
                </p>
                <p className="font-body text-muted-foreground/80 text-sm leading-relaxed">
                  {service.seo}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-12">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-palm-light shadow-brand hover:-translate-y-0.5 transition-all"
        >
          View All Services <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/services/palm-tree-trimming" className="font-body text-sm text-primary hover:underline">Palm Tree Trimming</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/services/palm-tree-installation" className="font-body text-sm text-primary hover:underline">Palm Tree Installation</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/services/palm-diamond-cutting" className="font-body text-sm text-primary hover:underline">Palm Diamond Cutting</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/palm-trees/buy" className="font-body text-sm text-primary hover:underline">Buy Palm Trees</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/palm-tree-cost" className="font-body text-sm text-primary hover:underline">Palm Tree Cost</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/services/tree-trimming-removal" className="font-body text-sm text-primary hover:underline">Tree Trimming & Removal</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/services/landscaping-services" className="font-body text-sm text-primary hover:underline">Landscaping Services</Link>
      </div>
    </div>
  </section>
);

export default ServicesPreview;
