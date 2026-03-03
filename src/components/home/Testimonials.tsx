import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    location: "Navarre, FL",
    text: "Gulf Coast Palms completely transformed our front yard. The diamond cut on our Canary Island palms looks absolutely stunning — like a five-star resort. Fast, professional, and reasonably priced. We'll never call anyone else!",
    rating: 5,
  },
  {
    name: "Mike & Jessica T.",
    location: "Destin, FL",
    text: "We had 12 palms that were badly overgrown and they knocked them all out in one day. The crew was respectful, cleaned up everything, and our palms have never looked better. Highly recommend to anyone on 30A or Destin!",
    rating: 5,
  },
  {
    name: "Robert K.",
    location: "Fort Walton Beach, FL",
    text: "I manage several rental properties and Gulf Coast Palms is my go-to for all palm maintenance. They're reliable, affordable, and always do top-quality work. My guests constantly compliment the landscaping now.",
    rating: 5,
  },
  {
    name: "Linda W.",
    location: "Gulf Breeze, FL",
    text: "Had two large palms removed that were dangerously close to our roof. They handled it quickly and safely — even ground the stumps. Couldn't be happier with the service. True professionals.",
    rating: 5,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const Testimonials = () => (
  <section className="section-padding bg-palm-dark relative overflow-hidden">
    {/* Decorative background */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent blur-3xl" />
    </div>

    <div className="container mx-auto relative z-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          What Our Customers Say
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
          Real Reviews, Real Results
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="font-body text-palm-sand/70 max-w-2xl mx-auto">
          Don't just take our word for it — hear from homeowners and property managers across the Gulf Coast who trust us with their palms.
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="relative p-8 rounded-2xl border border-palm-green/20 bg-gradient-to-br from-palm-dark to-[hsl(150_25%_12%)] backdrop-blur-sm"
          >
            <Quote className="absolute top-6 right-6 w-10 h-10 text-palm-gold/15" />

            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, idx) => (
                <Star key={idx} className="w-5 h-5 fill-palm-gold text-palm-gold" />
              ))}
            </div>

            <p className="font-body text-palm-sand/85 leading-relaxed mb-6 text-sm md:text-base">
              "{t.text}"
            </p>

            <div>
              <p className="font-display font-bold text-primary-foreground">{t.name}</p>
              <p className="font-body text-sm text-palm-sand/50">{t.location}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
