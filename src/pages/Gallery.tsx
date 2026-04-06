import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import job1 from "@/assets/gallery/job-1.jpeg";
import job2 from "@/assets/gallery/job-2.jpeg";
import job3 from "@/assets/gallery/job-3.jpeg";
import job4 from "@/assets/gallery/job-4.jpeg";
import job5 from "@/assets/gallery/job-5.jpeg";
import job6 from "@/assets/gallery/job-6.jpeg";
import job7 from "@/assets/gallery/job-7.jpeg";
import job8 from "@/assets/gallery/job-8.jpeg";
import job9 from "@/assets/gallery/job-9.jpeg";
import job10 from "@/assets/gallery/job-10.jpeg";
import job11 from "@/assets/gallery/job-11.jpeg";

/**
 * TODO: Replace with real before/after image pairs when available.
 */
const galleryItems = [
  { before: job1, after: job2, service: "Trimming", caption: "Overgrown Canary Island Date Palm — trimmed & diamond cut" },
  { before: job3, after: job4, service: "Removal", caption: "Dead palm safely removed from residential property" },
  { before: job5, after: job6, service: "HOA/Commercial", caption: "HOA community — 40+ palms trimmed in one day" },
  { before: job7, after: job8, service: "Trimming", caption: "Residential palm care in Gulf Breeze" },
  { before: job9, after: job10, service: "Hurricane Prep", caption: "Pre-hurricane trimming on waterfront estate" },
  { before: job11, after: job1, service: "Trimming", caption: "Luxury property palms in Destin, FL" },
];

const services = ["All", "Trimming", "Removal", "HOA/Commercial", "Hurricane Prep"];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const GalleryPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? galleryItems : galleryItems.filter((g) => g.service === filter);

  return (
    <Layout>
      <SEOHead
        title="Before & After Palm Tree Gallery | Gulf Coast Palms"
        description="See real before and after photos from Gulf Coast Palms. Palm trimming, removal, and HOA maintenance across the Florida Emerald Coast."
        canonicalUrl="/gallery"
      />

      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} custom={0} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Before & After Gallery
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="font-body text-palm-sand/80 max-w-2xl mx-auto mb-8">
              Tap or hover to toggle between before and after. Real results from Gulf Coast properties.
            </motion.p>
          </motion.div>

          {/* Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {services.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-5 py-2 rounded-full font-body text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, i) => (
              <GalleryCard key={i} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Like what you see? Get a free estimate
          </h2>
          <p className="font-body text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Text us a photo of your palms for an instant quote.
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

function GalleryCard({ item }: { item: typeof galleryItems[0] }) {
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
          src={item.before}
          alt={`Before: ${item.caption}`}
          className="w-full h-full object-cover absolute inset-0"
          animate={{ opacity: showAfter ? 0 : 1 }}
          transition={{ duration: 0.4 }}
          loading="lazy"
        />
        <motion.img
          src={item.after}
          alt={`After: ${item.caption}`}
          className="w-full h-full object-cover absolute inset-0"
          animate={{ opacity: showAfter ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          loading="lazy"
        />
      </div>
      <div className="absolute top-3 left-3">
        <span className={`px-3 py-1 rounded-full text-xs font-body font-bold uppercase tracking-wider ${showAfter ? "bg-primary text-primary-foreground" : "bg-foreground/80 text-background"}`}>
          {showAfter ? "After" : "Before"}
        </span>
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/80 to-transparent p-4">
        <span className="px-2 py-0.5 rounded bg-palm-gold/90 text-palm-dark text-[10px] font-body font-bold uppercase">{item.service}</span>
        <p className="font-body text-xs text-background/90 mt-1">{item.caption}</p>
      </div>
    </div>
  );
}

export default GalleryPage;
