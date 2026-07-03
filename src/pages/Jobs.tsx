import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
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

const galleryImages = [
  { src: job11, alt: "Luxury condo with trimmed palms lit up at night in Destin FL", caption: "Luxury Condo — Destin" },
  { src: job6, alt: "Beachfront condo palm care at sunset", caption: "Condo Complex — Destin" },
  { src: job1, alt: "Coastal home with manicured palm trees in Navarre FL", caption: "Residential Palm Care — Navarre" },
  { src: job2, alt: "Aerial view of waterfront estate with palm trees", caption: "Waterfront Estate — Gulf Breeze" },
  { src: job3, alt: "Commercial property palm maintenance in Destin FL", caption: "Commercial Property — Destin" },
  { src: job8, alt: "Diamond cut palms at luxury home", caption: "Diamond Cut — Gulf Breeze" },
  { src: job7, alt: "Palm trees at residential property with blue sky", caption: "Residential — Navarre Beach" },
  { src: job5, alt: "Palm tree trimming at commercial parking structure", caption: "Commercial Palms — Fort Walton Beach" },
  { src: job4, alt: "Residential palm trimming in Gulf Breeze FL", caption: "Palm Trimming — Pensacola" },
  { src: job9, alt: "Freshly trimmed palm trees in residential yard", caption: "Palm Trimming — Crestview" },
  { src: job10, alt: "Row of trimmed palms at commercial property", caption: "Commercial Maintenance — Destin" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const Jobs = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const next = useCallback(() => {
    setSelectedImage((i) => (i === null ? null : (i + 1) % galleryImages.length));
  }, []);
  const prev = useCallback(() => {
    setSelectedImage((i) => (i === null ? null : (i - 1 + galleryImages.length) % galleryImages.length));
  }, []);

  useEffect(() => {
    if (selectedImage === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedImage, next, prev]);

  return (
    <Layout>
      <SEOHead
        title="Jobs & Careers | Gulf Coast Palms Navarre FL"
        description="Join the Gulf Coast Palms crew. We're hiring palm tree trimmers, team leaders, and operations staff in NW Florida. View open positions and apply today."
        canonicalUrl="/jobs"
      />
      {/* Hero */}
      <section className="pt-32 pb-16 bg-palm-dark">
        <div className="container mx-auto px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-4"
          >
            Our Portfolio
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6"
          >
            Jobs Completed
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto"
          >
            Browse our recent work across the Emerald Coast. Every property gets the same
            professional care and attention to detail.
          </motion.p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {galleryImages.map((img, i) => (
              <motion.button
                key={i}
                type="button"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                custom={i}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl cursor-zoom-in bg-secondary shadow-elev-md hover:shadow-elev-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-shadow"
                onClick={() => setSelectedImage(i)}
                aria-label={`Open ${img.caption}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-[900ms] ease-out"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-palm-dark/85 via-palm-dark/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between gap-3">
                  <p className="font-body text-primary-foreground font-semibold text-sm md:text-base text-left drop-shadow">
                    {img.caption}
                  </p>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-palm-gold text-palm-dark shrink-0" aria-hidden>
                    <Maximize2 className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null) return;
              const dx = e.changedTouches[0].clientX - touchStartX;
              if (Math.abs(dx) > 50) (dx < 0 ? next() : prev());
              setTouchStartX(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={galleryImages[selectedImage].caption}
          >
            <button
              className="absolute top-5 right-5 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              aria-label="Close lightbox"
            >
              <X className="w-5 h-5" strokeWidth={2.25} />
            </button>
            <button
              className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={2.25} />
            </button>
            <button
              className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" strokeWidth={2.25} />
            </button>
            <motion.img
              key={selectedImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={galleryImages[selectedImage].src}
              alt={galleryImages[selectedImage].alt}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <p className="font-body text-white/90 text-sm">{galleryImages[selectedImage].caption}</p>
              <span className="text-white/50 text-xs font-body">{selectedImage + 1} / {galleryImages.length}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Jobs;
