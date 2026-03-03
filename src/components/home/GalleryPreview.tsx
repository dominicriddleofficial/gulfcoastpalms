import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import job1 from "@/assets/gallery/job-1.jpeg";
import job2 from "@/assets/gallery/job-2.jpeg";
import job3 from "@/assets/gallery/job-3.jpeg";
import job4 from "@/assets/gallery/job-4.jpeg";
import job5 from "@/assets/gallery/job-5.jpeg";
import job6 from "@/assets/gallery/job-6.jpeg";
import job11 from "@/assets/gallery/job-11.jpeg";

const previewImages = [
  { src: job11, alt: "Luxury condo with trimmed palms lit up at night in Destin FL" },
  { src: job2, alt: "Aerial view of waterfront property with manicured palms" },
  { src: job1, alt: "Palm trees at coastal home in Navarre Florida" },
  { src: job6, alt: "Beachfront condo palm care at sunset" },
  { src: job3, alt: "Commercial property palm maintenance in Destin" },
  { src: job4, alt: "Residential palm care in Gulf Breeze" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const GalleryPreview = () => (
  <section className="section-padding bg-palm-dark">
    <div className="container mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="text-center mb-12"
      >
        <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          Our Work
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
          Jobs Completed
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="font-body text-palm-sand/80 max-w-2xl mx-auto">
          From waterfront estates to commercial properties — see the results that keep our clients coming back.
        </motion.p>
      </motion.div>

      {/* Featured portrait pair */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
        {previewImages.slice(0, 2).map((img, i) => (
          <motion.div
            key={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            custom={i}
            className="group relative overflow-hidden rounded-xl"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover aspect-[3/4] group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-palm-dark/0 group-hover:bg-palm-dark/30 transition-colors duration-300" />
          </motion.div>
        ))}
      </div>

      {/* Remaining grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {previewImages.slice(2).map((img, i) => (
          <motion.div
            key={i + 2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            custom={i + 2}
            className="group relative overflow-hidden rounded-xl"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-palm-dark/0 group-hover:bg-palm-dark/30 transition-colors duration-300" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={0}
        className="text-center mt-10"
      >
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-palm-light transition-colors"
        >
          View All Completed Jobs <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  </section>
);

export default GalleryPreview;
