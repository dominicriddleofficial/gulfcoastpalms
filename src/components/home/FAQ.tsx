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
  {
    q: "Do you haul away all the debris?",
    a: "Yes. Full cleanup and haul-off are included on every job unless you specifically ask us to leave fronds or logs on-site. When we leave, the driveway is blown off and the property looks better than when we arrived.",
  },
  {
    q: "Do I need to be home when you work?",
    a: "No, you do not need to be home. Most palm and tree work happens outside and we can complete the job as long as we have access to the palms. We'll send before/after photos and a text when the crew is finished.",
  },
  {
    q: "How fast can you come out?",
    a: "Most standard palm and tree jobs are scheduled within a few days of the quote. Emergency work (storm damage, hangers over a house, blocked driveways) is prioritized — call (850) 910-1290 and we'll do everything we can to get a crew there the same day or next morning.",
  },
  {
    q: "When should I schedule hurricane prep for my palms?",
    a: "The ideal window is May through early June, before named storms typically form. Waiting until a storm is already in the Gulf means every tree service in Florida is booked. Managed maintenance customers get automatic pre-season trimming.",
  },
  {
    q: "Do you offer stump grinding?",
    a: "For palm stumps and small tree stumps we handle it in-house on the same visit as the removal. For very large hardwood stumps we sometimes coordinate with a stump-grinding partner. Call or text (850) 910-1290 with a photo and we'll tell you honestly what we can do.",
  },
  {
    q: "How does the text-a-photo quote work?",
    a: "Snap a clear photo showing the whole palm or tree from the base up, text it to (850) 910-1290 with your address and what you need, and we'll usually reply with a price the same day. Photos beat guesswork — no site visit required for most jobs.",
  },
  {
    q: "Do you work with HOAs and property managers?",
    a: "Yes. We serve HOAs, condo associations, property management companies, and commercial properties across NW Florida with volume pricing, photo documentation on every job, direct invoicing, and priority hurricane response. See our commercial page for details.",
  },
  {
    q: "Do you take before and after photos?",
    a: "Yes, on every job. Photos are attached to the invoice so you, your board, or your property owner can see exactly what was completed — even if you were not on-site during the work.",
  },
  {
    q: "Do you also trim regular trees, not just palms?",
    a: "Yes. We regularly handle oaks, pines, magnolias, crape myrtles, and other common Florida trees — trimming, deadwood removal, and full removals. Pricing for tree work is quoted per job based on size, condition, access, and hazards; every quote is free.",
  },
  {
    q: "Can I get on a recurring maintenance schedule?",
    a: "Absolutely. Recurring plans typically run once or twice a year for residential palms, or quarterly for HOAs and commercial properties. You get priority scheduling, locked-in pricing, and automatic pre-hurricane prep.",
  },
  {
    q: "How do payments work?",
    a: "We accept card, ACH, and check. Most residential jobs are paid on completion; approved commercial and HOA accounts can be set up on monthly invoicing with Net-30 terms.",
  },
  {
    q: "What happens if a storm knocks a palm onto my house or driveway?",
    a: "Call or text (850) 910-1290 immediately with a photo. Storm-response jobs move to the front of the schedule. We work with insurance-claim customers routinely and can provide photo documentation for adjusters.",
  },
  {
    q: "If you trim a palm, will the fronds grow back?",
    a: "Yes. Palms grow new fronds from the center crown all year long, so a properly trimmed palm keeps pushing out fresh green fronds. We never cut into the crown or remove healthy green fronds — that would slow growth and can even kill the tree.",
  },
  {
    q: "How do I know if my palm tree is dying?",
    a: "Warning signs are a drooping or collapsing center spear, brown or yellow fronds spreading from the crown downward, a soft or oozing trunk, or a sudden lean. Send us a photo at (850) 910-1290 and we'll tell you honestly if it can be saved or if removal is the safer call.",
  },
  {
    q: "Do you work weekends?",
    a: "Yes. Most work happens Monday through Saturday, and we take emergency and storm-response calls seven days a week. If you need a Sunday visit, call or text (850) 910-1290 and we'll do our best to fit you in.",
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
