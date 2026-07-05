import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  MapPin,
  ShieldCheck,
  Star,
  Scissors,
  TreeDeciduous,
  CloudLightning,
  Flower2,
  Building2,
  ClipboardCheck,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import HeroReviewBadge from "@/components/home/HeroReviewBadge";
import { JsonLd, FAQPageJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { GCP_BUSINESS } from "@/lib/business-info";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const SERVICE_CARDS = [
  {
    icon: Scissors,
    title: "Tree Trimming & Shaping",
    sub: "Crown thinning, hazard branch removal, shape maintenance",
    body: "We trim oaks, pines, crape myrtles, magnolias, and other hardwoods across NW Florida. Crown thinning reduces wind resistance for hurricane season. Hazard branch removal protects homes, vehicles, and power lines. We follow ANSI A300 pruning standards on all jobs.",
  },
  {
    icon: TreeDeciduous,
    title: "Tree Removal",
    sub: "Full removal with stump cutting and debris haul-away",
    body: "Dead, diseased, storm-damaged, or simply unwanted trees removed safely. We handle trees of any size including large oaks and pines. Complete debris removal and haul-away included. Stump grinding available as an add-on.",
  },
  {
    icon: CloudLightning,
    title: "Storm Damage Cleanup",
    sub: "Emergency response after hurricanes and severe storms",
    body: "After a named storm or severe weather event, we provide priority emergency response across the Emerald Coast. Fallen trees removed from homes, driveways, and vehicles. Hazardous leaning trees stabilized or removed. Insurance-direct billing available when authorized.",
  },
  {
    icon: Flower2,
    title: "Crape Myrtle Trimming",
    sub: "Proper pruning — not crape murder",
    body: "Crape myrtles are one of the most mis-trimmed trees in Florida. We prune crape myrtles correctly — removing dead wood and crossing branches, not topping them. Proper pruning produces more blooms, better structure, and healthier trees long-term.",
  },
  {
    icon: Building2,
    title: "HOA & Commercial Tree Maintenance",
    sub: "Scheduled service for communities and commercial properties",
    body: "We service HOA communities, commercial properties, vacation rental developments, and multi-property portfolios across NW Florida. Single-invoice billing, consistent scheduling, and priority response for contract clients.",
  },
  {
    icon: ClipboardCheck,
    title: "Tree Health Assessment",
    sub: "Identify risks before they become emergencies",
    body: "Pre-hurricane season tree assessments identify hazardous branches, root rot, structural weaknesses, and disease. Written report provided. Recommended work quoted same-day. Reduce your storm risk liability before June 1.",
  },
];

const SERVICE_AREAS: { name: string; href: string }[] = [
  { name: "Pensacola", href: "/palm-tree-trimming-pensacola-fl" },
  { name: "Gulf Breeze", href: "/palm-tree-trimming-gulf-breeze-fl" },
  { name: "Navarre", href: "/palm-tree-trimming-navarre-fl" },
  { name: "Fort Walton Beach", href: "/palm-tree-trimming-fort-walton-beach-fl" },
  { name: "Destin", href: "/palm-tree-trimming-destin-fl" },
  { name: "30A", href: "/palm-tree-trimming-30a-fl" },
  { name: "Milton", href: "/palm-tree-trimming-milton-fl" },
  { name: "Pace", href: "/palm-tree-trimming-pace-fl" },
  { name: "Niceville", href: "/palm-tree-trimming-niceville-fl" },
  { name: "Crestview", href: "/palm-tree-trimming-fort-walton-beach-fl" },
  { name: "Santa Rosa Beach", href: "/palm-tree-trimming-santa-rosa-beach-fl" },
  { name: "Miramar Beach", href: "/palm-tree-trimming-destin-fl" },
  { name: "Perdido Key", href: "/palm-tree-trimming-perdido-key-fl" },
  { name: "Pensacola Beach", href: "/palm-tree-trimming-pensacola-fl" },
  { name: "Navarre Beach", href: "/palm-tree-trimming-navarre-fl" },
];

const TREE_QUOTE_FACTORS = [
  "Size & species of the tree",
  "Overall condition & health",
  "Access to the tree from the street or yard",
  "Proximity to structures, fences & power lines",
  "Hazards, lean direction & debris volume",
];

const FAQS = [
  {
    q: "How much does tree trimming cost in Pensacola, FL?",
    a: "Tree trimming in Pensacola typically costs $150–$600 depending on tree size and species. Small trees under 20ft run $150–$300. Medium trees (20–40ft) typically cost $300–$600. Large oak or pine removal starts at $800 and can run $2,500+ for difficult access situations. Gulf Coast Palms provides free on-site quotes with no obligation.",
  },
  {
    q: "Do you need a permit to remove a tree in Pensacola or Navarre?",
    a: "Permit requirements vary by municipality. Pensacola city limits requires permits for removal of protected trees over 8 inches DBH (diameter at breast height). Unincorporated Escambia County has fewer restrictions. Santa Rosa County and Okaloosa County rules differ again. We advise on permit requirements during your free estimate — and can pull permits on your behalf for an additional fee.",
  },
  {
    q: "How often should trees be trimmed in Florida?",
    a: "Most hardwood trees in NW Florida benefit from trimming every 2–3 years for structural maintenance. Pre-hurricane season trimming (February through May) is especially valuable — removing weak or crossing branches before June 1 reduces storm damage risk significantly. Crape myrtles benefit from light annual pruning in late winter.",
  },
  {
    q: "Can you remove a tree that fell on my house?",
    a: "Yes — emergency tree removal from structures is one of our most common calls after storms. We provide 24-hour emergency response during and after named storms. We work directly with homeowners, property managers, and insurance adjusters. Document everything with photos before calling us, as insurers typically require documentation of the original damage.",
  },
  {
    q: "What's the difference between tree trimming and tree topping?",
    a: "Tree topping — cutting a tree's main trunk or primary branches back to stubs — is harmful and not something we do. It leaves large wounds, promotes weak regrowth, and shortens tree lifespan. Proper pruning removes only dead, damaged, or hazardous branches while maintaining the tree's natural structure. Many 'cheap' tree services top trees because it's faster. We follow ANSI A300 standards, which prohibit topping.",
  },
  {
    q: "Do you remove tree stumps?",
    a: "Stump grinding is available as an add-on to any tree removal. We grind stumps to 6–8 inches below grade, which prevents sprouting and allows the area to be landscaped. We haul away the grindings or leave them as mulch — your choice. Stump-only jobs (if you've already had the tree removed) are also available.",
  },
  {
    q: "Do you service commercial properties and HOAs?",
    a: "Yes — commercial and HOA tree work makes up a significant part of our business. We provide contract pricing for scheduled maintenance across NW Florida. Single invoice billing, flexible scheduling around business hours or resident access windows, and dedicated account management for HOA boards and property managers. Call or text for a commercial account quote.",
  },
  {
    q: "Are you licensed and insured for tree removal in Florida?",
    a: "Yes — Gulf Coast Palms is fully licensed and insured for tree trimming and removal in Florida. We carry general liability and workers' compensation. We can provide certificate of insurance to any homeowner, HOA, or commercial property manager upon request. Always ask your tree service for proof of insurance before work begins — an uninsured crew working on your property means you bear the liability.",
  },
];

const TreeTrimmingRemoval = () => {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Tree Trimming and Removal",
    description:
      "Professional tree trimming, crown thinning, hazard branch removal, and complete tree removal for oaks, pines, crape myrtles, and other hardwoods across NW Florida.",
    provider: {
      "@type": "LocalBusiness",
      name: GCP_BUSINESS.name,
      telephone: "+18509101290",
      url: GCP_BUSINESS.url,
    },
    areaServed: ["Pensacola FL", "Navarre FL", "Gulf Breeze FL", "Fort Walton Beach FL", "Destin FL"],
    serviceType: ["Tree Trimming", "Tree Removal", "Crown Thinning", "Storm Damage Cleanup", "Crape Myrtle Pruning"],
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "150",
      highPrice: "2500",
      priceCurrency: "USD",
    },
  };

  return (
    <Layout>
      <SEOHead
        title="Tree Trimming & Removal Pensacola | Oak, Pine & Crape Myrtle | Gulf Coast Palms"
        description="Professional tree trimming and removal in Pensacola, Navarre, Gulf Breeze & the Emerald Coast. Oaks, pines, crape myrtles & more. Licensed & insured. Free estimates. Call (850) 910-1290."
        canonicalUrl="/services/tree-trimming-removal"
      />
      <JsonLd data={serviceSchema} />
      <FAQPageJsonLd questions={FAQS} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${GCP_BUSINESS.url}/` },
          { name: "Services", url: `${GCP_BUSINESS.url}/services` },
          { name: "Tree Trimming & Removal", url: `${GCP_BUSINESS.url}/services/tree-trimming-removal` },
        ]}
      />

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden bg-palm-dark section-padding">
        <div className="container relative z-10 mx-auto max-w-4xl text-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-palm-gold/40 bg-palm-gold/10 px-4 py-1.5 font-body text-xs font-bold uppercase tracking-[0.2em] text-palm-gold"
          >
            <MapPin className="h-3.5 w-3.5" /> Pensacola to Destin
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl"
          >
            Tree Trimming &amp; Removal —{" "}
            <span className="text-gradient-primary">NW Florida</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl font-body text-lg text-palm-sand/80"
          >
            Expert trimming and safe removal for oaks, pines, crape myrtles, and more. Licensed, insured, and serving the entire Emerald Coast.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            <HeroReviewBadge compact />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-body text-xs font-semibold text-primary-foreground">
              <ShieldCheck className="h-3 w-3" /> Licensed &amp; Insured
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-body text-xs font-semibold text-primary-foreground">
              Free Estimates
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-body text-xs font-semibold text-primary-foreground">
              Same-Day Emergency Response
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3"
          >
            <a
              href="sms:8509101290"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-body text-base font-bold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02]"
            >
              <MessageSquare className="h-5 w-5" /> Get a Free Tree Trimming Quote →
            </a>
            <a
              href="tel:+18509101290"
              className="inline-flex w-full items-center justify-center gap-2 font-body text-sm font-semibold text-palm-sand/80 transition-colors hover:text-primary-foreground"
            >
              <Phone className="h-4 w-4" /> or call (850) 910-1290
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============== SERVICES OVERVIEW ============== */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 font-body text-sm font-bold uppercase tracking-[0.2em] text-primary">What We Do</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Full-Service Tree Care</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-muted-foreground">
              Six specialized services covering everything from routine trimming to post-storm emergencies.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SERVICE_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 font-display text-xl font-bold text-foreground">{card.title}</h3>
                  <p className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-primary">{card.sub}</p>
                  <p className="font-body text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== WHY HIRE SPECIALISTS ============== */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Why Hire Specialists Instead of a General Handyman?
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: "Licensed & Insured — not a guy with a truck",
                body: "We carry full liability and workers' comp. If something goes wrong on your property, you're covered.",
              },
              {
                title: "We follow ANSI A300 pruning standards",
                body: "The national standard for professional tree care. Many competitors don't know this exists.",
              },
              {
                title: "We also specialize in palms",
                body: "If your property has both palms and hardwoods, one crew handles everything. One call, one invoice.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-base font-bold text-foreground">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PRICING (every tree is different) ============== */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-3 font-body text-sm font-bold uppercase tracking-[0.2em] text-primary">Honest Pricing</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Every Tree Is Different</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-muted-foreground">
              Tree trimming and removal are quoted per job — never one-size-fits-all. Every quote is free and there's no obligation.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <p className="font-body text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              What we look at
            </p>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {TREE_QUOTE_FACTORS.map((f) => (
                <li key={f} className="flex items-start gap-2.5 font-body text-sm text-foreground/85">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="sms:8509101290"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-body text-base font-bold text-primary-foreground shadow-md transition-transform hover:scale-[1.02]"
              >
                <MessageSquare className="h-5 w-5" /> Text Us a Photo
              </a>
              <a
                href="tel:+18509101290"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-4 font-body text-base font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Phone className="h-5 w-5" /> Get a Free Quote
              </a>
            </div>
            <p className="mt-4 text-center font-body text-xs text-muted-foreground">
              Texting a photo of the tree is the fastest way to a quick estimate.
            </p>
          </div>
        </div>
      </section>

      {/* ============== SERVICE AREAS ============== */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            We Trim and Remove Trees Across NW Florida
          </h2>
          <p className="mx-auto mb-8 max-w-2xl font-body text-muted-foreground">
            From Perdido Key to 30A — tap your city for local service details.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SERVICE_AREAS.map((city) => (
              <Link
                key={city.name}
                to={city.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 font-body text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Tree Service FAQs</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-muted-foreground">
              Honest answers to the questions every NW Florida homeowner asks before calling a tree service.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-card p-5 transition-shadow open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-display text-base font-bold text-foreground md:text-lg [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <span className="mt-1 shrink-0 text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground md:text-base">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TESTIMONIAL ============== */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
            <div className="mb-3 flex items-center gap-1 text-palm-gold">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="font-display text-xl font-medium leading-relaxed text-foreground md:text-2xl">
              "Gulf Coast Palms took down a huge oak that was leaning over our roof. They were professional, fast, and cleaned up every single branch. I've used other tree services before and this was by far the best experience."
            </p>
            <p className="mt-4 font-body text-sm text-muted-foreground">— Jennifer R., Navarre homeowner</p>
          </div>
        </div>
      </section>

      {/* ============== PALM CROSS-LINKS ============== */}
      <section className="bg-palm-dark py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="rounded-2xl border border-palm-green/20 bg-palm-dark p-6 text-center md:p-8">
            <h2 className="mb-2 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Need Palm Care Too? We're Specialists.
            </h2>
            <p className="mb-6 font-body text-sm text-palm-sand/70">
              Same crew, same call, same invoice — we handle hardwoods and palms.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/services/palm-tree-trimming"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary"
              >
                → Palm Tree Trimming
              </Link>
              <Link
                to="/services/palm-diamond-cutting"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary"
              >
                → Diamond Cutting
              </Link>
              <Link
                to="/palm-trees/buy"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary"
              >
                → Buy &amp; Install Palm Trees
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============== BOTTOM CTA ============== */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Free Tree Trimming Estimate — Any Size Job
          </h2>
          <p className="mx-auto mb-8 max-w-xl font-body text-lg text-primary-foreground/80">
            We serve Pensacola to Destin. Licensed &amp; insured. Same-day emergency response available.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="sms:8509101290"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-primary-foreground px-8 py-4 font-body text-lg font-bold text-primary shadow-xl transition-transform hover:scale-105"
            >
              <MessageSquare className="h-5 w-5" /> Get a Free Quote Online →
            </a>
            <a
              href="tel:+18509101290"
              className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-primary-foreground px-8 py-4 font-body text-lg font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              <Phone className="h-5 w-5" /> (850) 910-1290
            </a>
          </div>
          <a
            href="sms:8509101290"
            className="mt-4 inline-block font-body text-sm text-primary-foreground/80 underline-offset-4 hover:underline"
          >
            or text us a photo of the tree
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default TreeTrimmingRemoval;