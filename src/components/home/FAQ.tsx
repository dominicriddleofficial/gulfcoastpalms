import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How often should I have my palm trees trimmed?",
    a: "Most palm species in the Gulf Coast region benefit from trimming once or twice a year. We recommend scheduling a trim in late spring and again in early fall. Over-trimming can actually harm your palms, so we follow industry best practices to remove only dead or dying fronds, seed pods, and flower stalks — never healthy green fronds.",
  },
  {
    q: "What is diamond cutting and is it bad for my palms?",
    a: "Diamond cutting is a decorative trimming technique where we sculpt the old leaf bases (boots) on the trunk into a clean, cross-hatch pattern. When done correctly by experienced professionals like our team, it's purely cosmetic and does not harm the tree. It gives palms a resort-quality, polished appearance that's very popular in Destin, Navarre, and Gulf Breeze.",
  },
  {
    q: "Do you offer free estimates?",
    a: "Absolutely! We provide free, no-obligation estimates for all of our services. Just give us a call or text at (850) 910-1290 and we'll get you a quote — usually the same day. For most jobs, we can provide an accurate estimate from photos you text us.",
  },
  {
    q: "What areas do you serve?",
    a: "We serve the entire Florida Gulf Coast panhandle region including Navarre, Fort Walton Beach, Destin, Pensacola, Gulf Breeze, Milton, Niceville, Crestview, 30A, and Perdido Key. If you're nearby and not sure if we cover your area, give us a call — chances are we do!",
  },
  {
    q: "Are you licensed and insured?",
    a: "Yes, Gulf Coast Palms is fully licensed and insured. We carry general liability insurance and workers' compensation coverage, giving you complete peace of mind on every job. We're happy to provide proof of insurance upon request.",
  },
  {
    q: "How much does palm tree trimming cost?",
    a: "Pricing depends on the number of palms, their height, species, and the level of service needed (basic trim, diamond cut, trunk skinning, etc.). Most single-palm trims start at an affordable rate, and we offer discounts for multiple trees. Contact us for a free quote tailored to your property.",
  },
  {
    q: "Can you remove a palm tree that's close to my house?",
    a: "Yes! We specialize in safe palm tree removal, even in tight spaces near structures, power lines, and fences. Our team uses professional equipment and techniques to bring palms down in controlled sections. We also offer stump grinding to leave your yard clean and ready for whatever comes next.",
  },
  {
    q: "What's the best time of year to install new palm trees?",
    a: "In the Gulf Coast region, spring and early summer are ideal for palm installations since the warm temperatures and regular rainfall help new palms establish strong root systems. However, palms can be planted year-round in Florida with proper care. We source palms suited for our coastal climate and ensure proper planting for long-term health.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const FAQ = () => (
  <section className="section-padding bg-background">
    <div className="container mx-auto max-w-4xl">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
          Common Questions
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          Frequently Asked Questions
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know about our palm tree services across the Gulf Coast.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={3}
      >
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border rounded-xl px-6 bg-card shadow-sm data-[state=open]:shadow-md transition-shadow"
            >
              <AccordionTrigger className="font-display text-left text-base md:text-lg font-semibold text-foreground hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="font-body text-muted-foreground leading-relaxed pb-5 text-sm md:text-base">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      {/* FAQ JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </div>
  </section>
);

export default FAQ;
