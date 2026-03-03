import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Layout from "@/components/Layout";
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

const galleryImages = [
  { src: job1, alt: "Coastal home with manicured palm trees in Navarre FL", caption: "Residential Palm Care — Navarre" },
  { src: job2, alt: "Aerial view of waterfront estate with palm trees", caption: "Waterfront Estate — Gulf Breeze" },
  { src: job3, alt: "Commercial property palm maintenance in Destin FL", caption: "Commercial Property — Destin" },
  { src: job4, alt: "Residential palm trimming in Gulf Breeze FL", caption: "Palm Trimming — Pensacola" },
  { src: job5, alt: "Palm tree trimming at commercial parking structure", caption: "Commercial Palms — Fort Walton Beach" },
  { src: job6, alt: "Beachfront condo palm care at sunset", caption: "Condo Complex — Destin" },
  { src: job7, alt: "Palm trees at residential property with blue sky", caption: "Residential — Navarre Beach" },
  { src: job8, alt: "Diamond cut palms at luxury home", caption: "Diamond Cut — Gulf Breeze" },
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

  return (
    <Layout>
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
        <div className="container mx-auto">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group relative break-inside-avoid overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => setSelectedImage(i)}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-palm-dark/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                  <p className="font-body text-primary-foreground font-semibold text-sm">
                    {img.caption}
                  </p>
                </div>
              </motion.div>
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
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/80 hover:text-white"
              onClick={() => setSelectedImage(null)}
              aria-label="Close lightbox"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              key={selectedImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={galleryImages[selectedImage].src}
              alt={galleryImages[selectedImage].alt}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-body text-white/80 text-sm">
              {galleryImages[selectedImage].caption}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Jobs;
