import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import palmTrimming from "@/assets/palm-trimming.jpg";
import diamondCutting from "@/assets/diamond-cutting.jpg";
import trunkSkinning from "@/assets/trunk-skinning.jpg";
import palmInstall from "@/assets/palm-install.jpg";

const services = [
  {
    title: "Palm Trimming",
    image: palmTrimming,
    desc: "Expert trimming to keep your palms healthy and beautiful year-round.",
    seo: "Regular palm tree trimming is essential for maintaining the health, safety, and curb appeal of your property. Overgrown fronds can become hazardous during storms and attract pests. Our certified team removes dead and dying fronds, seed pods, and flower stalks with precision — leaving your palms looking pristine without over-trimming, which can stress the tree. We service residential homes, commercial properties, HOA communities, and rental properties throughout the Gulf Coast.",
  },
  {
    title: "Diamond Cutting",
    image: diamondCutting,
    desc: "Precision diamond cut patterns that showcase your palm's natural beauty.",
    seo: "Diamond cutting is a specialized trimming technique that creates a distinctive cross-hatch pattern on palm trunks by carefully sculpting the leaf base stubs. This resort-style finish transforms ordinary palms into stunning landscape focal points. Popular at beachfront properties, hotels, and upscale residences across Navarre, Destin, and Gulf Breeze — our diamond cuts are clean, consistent, and designed to last.",
  },
  {
    title: "Trunk Skinning",
    image: trunkSkinning,
    desc: "Clean, smooth trunk skinning for a polished, resort-quality look.",
    seo: "Trunk skinning removes the old leaf bases (known as boots) from the palm trunk, revealing the smooth inner bark beneath. This gives palms a sleek, manicured appearance that's commonly seen at luxury resorts and coastal properties. Beyond aesthetics, skinning also discourages rodents and insects from nesting in the trunk crevices. Our team uses proper techniques to avoid damaging the trunk tissue.",
  },
  {
    title: "Installs & Removals",
    image: palmInstall,
    desc: "Professional palm tree installation and safe removal services.",
    seo: "Whether you're adding tropical character to your landscape or need a dead or dangerous palm removed, we handle the job safely and efficiently. We source high-quality palms suited for the Gulf Coast climate and ensure proper planting depth and soil preparation for long-term health. For removals, we use professional equipment to take down palms of any height — including stump grinding — with minimal impact to your surrounding landscape.",
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
          From routine trimming to precision diamond cutting and full palm installations, we deliver expert palm care tailored to Florida's coastal climate. Every job is handled with precision, safety, and attention to detail — because your landscape deserves more than average work.
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
            className="group rounded-2xl overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={service.image}
                alt={`${service.title} service by Gulf Coast Palms in Navarre and Destin Florida`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="p-6 md:p-8">
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                {service.title}
              </h3>
              <p className="font-body text-muted-foreground text-sm leading-relaxed mb-3 font-medium">
                {service.desc}
              </p>
              <p className="font-body text-muted-foreground/80 text-sm leading-relaxed">
                {service.seo}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-12">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-palm-light transition-colors"
        >
          View All Services <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Internal links for SEO */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/services/palm-tree-trimming" className="font-body text-sm text-primary hover:underline">Palm Tree Trimming</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/services/palm-tree-installation" className="font-body text-sm text-primary hover:underline">Palm Tree Installation</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/services/diamond-cutting" className="font-body text-sm text-primary hover:underline">Diamond Cutting</Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/palm-trees/buy" className="font-body text-sm text-primary hover:underline">Buy Palm Trees</Link>
      </div>
    </div>
  </section>
);

export default ServicesPreview;
