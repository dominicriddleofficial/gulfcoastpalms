import { motion } from "framer-motion";
import { Phone, MessageSquare, Check, X, Star, MapPin, Truck, Wrench, ShieldCheck, Clock, Calendar, Construction } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { JsonLd, FAQPageJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import HeroReviewBadge from "@/components/home/HeroReviewBadge";
import { palmTypes } from "@/data/palmTypes";
import { GCP_BUSINESS } from "@/lib/business-info";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

// Per-species enrichment used only on this commercial page.
const SPECIES_META: Record<
  string,
  {
    bestFor: string;
    installTime: { label: string; icon: "fast" | "scheduled" | "equipment" };
    nameOverride?: string;
    scientificNameOverride?: string;
    hideLearnMore?: boolean;
  }
> = {
  "canary-island-date-palm": {
    nameOverride: "Sylvester Date Palm",
    scientificNameOverride: "Phoenix sylvestris",
    bestFor: "Luxury estates, resort-quality landscaping",
    installTime: { label: "Equipment required — quoted separately", icon: "equipment" },
    hideLearnMore: true,
  },
  "sabal-palm": {
    bestFor: "Hurricane-resistant, native Florida look",
    installTime: { label: "Same-day install", icon: "fast" },
  },
  "pindo-palm": {
    bestFor: "Smaller yards, cold-hardy, residential",
    installTime: { label: "Same-day install", icon: "fast" },
  },
  "washingtonia-palm": {
    bestFor: "Dramatic height, commercial properties, driveways",
    installTime: { label: "Scheduled install", icon: "scheduled" },
  },
  "mule-palm": {
    bestFor: "Cold-hardy hybrid, neighborhoods with occasional freezes",
    installTime: { label: "Same-day install", icon: "fast" },
  },
};

const FAQS = [
  {
    q: "How much does it cost to have a palm tree planted in Pensacola?",
    a: "Gulf Coast Palms charges $350–$1,500 installed depending on species and size. Sabal Palms (Florida's state tree) typically install for $350–$500. Sylvester Date Palms run $1,200–$1,500. These prices include sourcing, delivery, planting, bracing, and aftercare guidance — not just the tree itself.",
  },
  {
    q: "Do you deliver and install palm trees on the Emerald Coast?",
    a: "Yes — we source, deliver, and professionally install palm trees throughout Pensacola, Navarre, Gulf Breeze, Fort Walton Beach, Destin, 30A, and surrounding communities. One call handles everything. Most small to medium palm installations are completed in a single visit.",
  },
  {
    q: "What palm trees grow best in NW Florida's climate?",
    a: "Sabal Palms (Florida's native state tree) are the most hurricane-resistant and lowest maintenance. Sylvester Date Palms are the luxury choice for high-end properties. Pindo and Mule Palms are the best options if you want cold hardiness. We help every customer match the right species to their property's sun exposure, soil, and budget.",
  },
  {
    q: "How long does palm tree installation take?",
    a: "Small palms (Sabal, Pindo, 8–12ft range) typically take 45–90 minutes per tree including planting, bracing, and cleanup. Large Sylvester Date Palms may require a skid steer and a half-day. We provide a time estimate when we quote your project.",
  },
  {
    q: "Do I need a permit to plant a palm tree in Pensacola or Navarre?",
    a: "Most residential palm installations in NW Florida don't require permits. Commercial properties and some HOA communities may have landscaping approval requirements. We can advise on this during your free on-site estimate.",
  },
  {
    q: "What is included in your palm installation price?",
    a: "Our installed price covers: sourcing the palm from our trusted suppliers, transportation to your property, professional planting at proper depth and orientation, bracing for 60 days on trees over 10ft, backfill with appropriate soil amendment, debris removal, and aftercare guidance. No hidden fees.",
  },
  {
    q: "Can you install multiple palm trees at once?",
    a: "Yes — multi-palm installs are our specialty and our most cost-effective service. HOA communities, new construction developments, and vacation rental properties with 5–20+ palms get priority scheduling and package pricing. Text us a photo of your property for a same-day bulk quote.",
  },
  {
    q: "What's the difference between a Sabal Palm and a Sylvester Date Palm?",
    a: "Sabal Palms are Florida's native state tree — extremely hurricane-resistant, lower maintenance, and ideal for natural Florida landscapes. They cost $350–$500 installed. Sylvester Date Palms (Phoenix sylvestris) are imported statement palms prized for their diamond-cut trunks and full silvery-green canopies, popular at beachfront estates. They're higher maintenance and cost $1,200–$1,500 installed. We can show you examples of both in NW Florida during your free estimate.",
  },
];

const SERVICE_AREAS: { name: string; href: string }[] = [
  { name: "Pensacola", href: "/palm-tree-trimming-pensacola-fl" },
  { name: "Gulf Breeze", href: "/palm-tree-trimming-gulf-breeze-fl" },
  { name: "Navarre", href: "/palm-tree-trimming-navarre-fl" },
  { name: "Fort Walton Beach", href: "/palm-tree-trimming-fort-walton-beach-fl" },
  { name: "Destin", href: "/palm-tree-trimming-destin-fl" },
  { name: "30A", href: "/palm-tree-trimming-30a-fl" },
  { name: "Miramar Beach", href: "/palm-tree-trimming-destin-fl" },
  { name: "Santa Rosa Beach", href: "/palm-tree-trimming-santa-rosa-beach-fl" },
  { name: "Milton", href: "/palm-tree-trimming-milton-fl" },
  { name: "Pace", href: "/palm-tree-trimming-pace-fl" },
  { name: "Niceville", href: "/palm-tree-trimming-niceville-fl" },
  { name: "Crestview", href: "/palm-tree-trimming-fort-walton-beach-fl" },
];

const InstallTimeBadge = ({ kind, label }: { kind: "fast" | "scheduled" | "equipment"; label: string }) => {
  const Icon = kind === "fast" ? Clock : kind === "scheduled" ? Calendar : Construction;
  const tone =
    kind === "fast"
      ? "bg-primary/10 text-primary border-primary/30"
      : kind === "scheduled"
      ? "bg-palm-gold/10 text-palm-gold border-palm-gold/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold ${tone}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
};

const BuyPalmTrees = () => {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Palm Trees Available for Installation",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "Product",
          name: "Sabal Palm — Installed",
          description: "Florida's native state palm. Hurricane-resistant. Installed at 8-16ft.",
          offers: { "@type": "AggregateOffer", lowPrice: "350", highPrice: "500", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "Product",
          name: "Sylvester Date Palm — Installed",
          description: "Luxury statement palm with diamond-cut trunk and silvery-green fronds. Installed at 8-15ft.",
          offers: { "@type": "AggregateOffer", lowPrice: "1200", highPrice: "1500", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        },
      },
      {
        "@type": "ListItem",
        position: 3,
        item: {
          "@type": "Product",
          name: "Pindo Palm — Installed",
          description: "Compact cold-hardy palm with blue-green fronds. Installed at 3-6ft.",
          offers: { "@type": "AggregateOffer", lowPrice: "550", highPrice: "1200", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        },
      },
      {
        "@type": "ListItem",
        position: 4,
        item: {
          "@type": "Product",
          name: "Washingtonia Palm — Installed",
          description: "Fast-growing fan palm. Installed at 8-16ft.",
          offers: { "@type": "AggregateOffer", lowPrice: "700", highPrice: "900", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        },
      },
      {
        "@type": "ListItem",
        position: 5,
        item: {
          "@type": "Product",
          name: "Mule Palm — Installed",
          description: "Cold-hardy hybrid. Queen palm beauty with pindo durability. Installed at 3-6ft.",
          offers: { "@type": "AggregateOffer", lowPrice: "900", highPrice: "1100", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        },
      },
    ],
  };

  return (
    <Layout>
      <SEOHead
        title="Palm Trees Delivered & Installed — Emerald Coast FL | Gulf Coast Palms"
        description="Buy palm trees sourced, delivered & professionally installed across Pensacola, Navarre, Destin & the Emerald Coast. Sabal Palms from $350 installed. Sylvester Date Palms from $1,200. Free estimates. Call (850) 910-1290."
        canonicalUrl="/palm-trees/buy"
      />
      <JsonLd data={itemListSchema} />
      <FAQPageJsonLd questions={FAQS} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${GCP_BUSINESS.url}/` },
          { name: "Palm Trees", url: `${GCP_BUSINESS.url}/palm-trees/types` },
          { name: "Buy & Install", url: `${GCP_BUSINESS.url}/palm-trees/buy` },
        ]}
      />

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden bg-palm-dark section-padding">
        <div className="absolute inset-0 bg-gradient-to-b from-palm-dark via-palm-dark/95 to-palm-dark" />
        <div className="container relative z-10 mx-auto max-w-4xl text-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-palm-gold/40 bg-palm-gold/10 px-4 py-1.5 font-body text-xs font-bold uppercase tracking-[0.2em] text-palm-gold"
          >
            <MapPin className="h-3.5 w-3.5" /> Serving the Emerald Coast
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl"
          >
            Palm Trees —{" "}
            <span className="text-gradient-primary">Sourced, Delivered &amp; Installed</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl font-body text-lg text-palm-sand/80"
          >
            One call. We handle everything — sourcing, delivery, professional planting, and bracing. No nursery runs. No separate install crew. Done in a single visit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            <HeroReviewBadge compact />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-body text-xs font-semibold text-primary-foreground">
              500+ Palms Installed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-body text-xs font-semibold text-primary-foreground">
              <ShieldCheck className="h-3 w-3" /> Licensed &amp; Insured
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-body text-xs font-semibold text-primary-foreground">
              Free On-Site Estimate
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3"
          >
            <a
              href="tel:8509101290"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-body text-base font-bold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02]"
            >
              <Phone className="h-5 w-5" /> Get a Free Installation Quote →
            </a>
            <a
              href="sms:8509101290"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-foreground/40 px-6 py-3.5 font-body text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              <MessageSquare className="h-5 w-5" /> Text a Photo of Your Property
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============== WHY BUY THROUGH US ============== */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 font-body text-sm font-bold uppercase tracking-[0.2em] text-primary">The One-Stop Difference</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Why Buy Your Palm Through Us</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-muted-foreground">
              Compare the typical multi-vendor process to the single-call Gulf Coast Palms experience.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Nursery */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-elev-sm hover:shadow-elev-md hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-300">
              <p className="mb-1 font-body text-xs font-bold uppercase tracking-wider text-muted-foreground">Option A</p>
              <h3 className="mb-4 font-display text-xl font-bold text-foreground">Buy from a Nursery</h3>
              <ul className="space-y-2.5 font-body text-sm">
                {[
                  { ok: false, t: "Buy the tree ($285–$550)" },
                  { ok: false, t: "Pay separately for delivery ($100–$200)" },
                  { ok: false, t: "Find and schedule an installer" },
                  { ok: false, t: "Coordinate multiple vendors" },
                  { ok: false, t: "Risk of damage during DIY planting" },
                  { ok: true, t: "Slightly lower if you do the work yourself" },
                ].map((row, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {row.ok ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="text-foreground/80">{row.t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gulf Coast Palms — featured */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-elev-lg shadow-amber hover:-translate-y-1 transition-all duration-300 ring-1 ring-palm-gold/25">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                Recommended
              </span>
              <p className="mb-1 font-body text-xs font-bold uppercase tracking-wider text-primary">Option B</p>
              <h3 className="mb-4 font-display text-xl font-bold text-foreground">Gulf Coast Palms</h3>
              <ul className="space-y-2.5 font-body text-sm">
                {[
                  "We source the right tree for your property",
                  "Delivery included in installation quote",
                  "Professional planting by palm specialists",
                  "Bracing included for 60 days",
                  "Aftercare instructions + follow-up",
                  "One call, one invoice, done in a single visit",
                  "Competitive total installed price",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DIY */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-elev-sm hover:shadow-elev-md hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-300">
              <p className="mb-1 font-body text-xs font-bold uppercase tracking-wider text-muted-foreground">Option C</p>
              <h3 className="mb-4 font-display text-xl font-bold text-foreground">DIY Install</h3>
              <ul className="space-y-2.5 font-body text-sm">
                {[
                  { ok: false, t: "Heavy lifting + risk of injury" },
                  { ok: false, t: "Wrong planting depth = dead palm" },
                  { ok: false, t: "No bracing = leaning or falling palm" },
                  { ok: false, t: "Rental equipment fees ($150–$400/day)" },
                  { ok: false, t: "No warranty or aftercare support" },
                  { ok: true, t: "Lowest cash outlay if everything goes right" },
                ].map((row, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {row.ok ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="text-foreground/80">{row.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* feature row */}
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { Icon: Truck, t: "Delivery included" },
              { Icon: Wrench, t: "Pro planting & bracing" },
              { Icon: ShieldCheck, t: "Licensed & insured" },
              { Icon: Star, t: "5.0 stars · 46 reviews" },
            ].map(({ Icon, t }, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-body text-sm font-semibold text-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== SPECIES CARDS ============== */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Palms We Source &amp; Install</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-muted-foreground">
              Every price below is the total installed cost — sourcing, delivery, planting, bracing, and aftercare.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {palmTypes.map((palm, i) => {
              const meta = SPECIES_META[palm.slug];
              return (
                <motion.div
                  key={palm.slug}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elev-md hover:shadow-elev-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="p-4">
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-secondary">
                      <img
                        src={palm.image}
                        alt={palm.imageAlt}
                        className="h-full w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                        loading="lazy"
                        decoding="async"
                        width={600}
                        height={800}
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6">
                    <h3 className="mb-1 font-display text-xl font-bold text-foreground">{meta?.nameOverride ?? palm.name}</h3>
                    <p className="mb-3 font-body text-xs italic text-muted-foreground">{meta?.scientificNameOverride ?? palm.scientificName}</p>

                    {meta && (
                      <p className="mb-3 font-body text-xs">
                        <span className="font-bold uppercase tracking-wider text-primary">Best for:</span>{" "}
                        <span className="text-foreground/80">{meta.bestFor}</span>
                      </p>
                    )}

                    <p className="mb-4 flex-1 font-body text-sm text-muted-foreground">{palm.shortDescription}</p>

                    {/* Availability + Install time */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-body text-[11px] font-semibold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Currently Available
                      </span>
                      {meta && <InstallTimeBadge kind={meta.installTime.icon} label={meta.installTime.label} />}
                    </div>

                    <div className="mb-5 rounded-lg bg-secondary p-3">
                      <p className="font-body text-xs text-muted-foreground">Typical Installed Price</p>
                      <p className="font-display text-base font-bold text-foreground">{palm.priceRange.split(" (")[0]}</p>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href="tel:8509101290"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-body text-sm font-semibold text-primary-foreground transition-colors hover:bg-palm-light"
                      >
                        <Phone className="h-4 w-4" /> Call
                      </a>
                      <a
                        href="sms:8509101290"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-primary px-4 py-3 font-body text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <MessageSquare className="h-4 w-4" /> Text
                      </a>
                    </div>

                    {!meta?.hideLearnMore && (
                      <Link to={`/palm-trees/${palm.slug}`} className="mt-3 text-center font-body text-xs text-primary hover:underline">
                        Learn more about {palm.name} →
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== SOCIAL PROOF ============== */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
            <div className="mb-3 flex items-center gap-1 text-palm-gold">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="font-display text-xl font-medium leading-relaxed text-foreground md:text-2xl">
              "We had Gulf Coast Palms install 4 Sabal Palms around our pool. They sourced everything, showed up on time, and the yard looked transformed in 3 hours. Worth every dollar."
            </p>
            <p className="mt-4 font-body text-sm text-muted-foreground">— Mike T., Gulf Breeze homeowner</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center font-body text-sm text-muted-foreground">
            <span><span className="font-bold text-foreground">500+</span> palms installed</span>
            <span className="hidden md:inline">•</span>
            <span>Serving Pensacola to 30A</span>
            <span className="hidden md:inline">•</span>
            <span><span className="font-bold text-foreground">5.0 stars</span> · 46 reviews</span>
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="mb-10 font-display text-3xl font-bold text-primary-foreground">How Buying &amp; Installation Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Choose Your Palms", desc: "Browse our selection or call for personalized recommendations based on your property." },
              { step: "2", title: "Free On-Site Quote", desc: "We visit your property, assess the site, and provide a detailed installation quote." },
              { step: "3", title: "Professional Install", desc: "We handle delivery, planting, bracing, and provide aftercare guidance for long-term success." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <span className="font-display text-xl font-bold text-palm-light">{s.step}</span>
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-primary-foreground">{s.title}</h3>
                <p className="font-body text-sm text-palm-sand/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Palm Tree Installation FAQs</h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-muted-foreground">
              Real answers to the questions Emerald Coast homeowners ask before buying a palm.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-card p-5 open:shadow-md transition-shadow"
              >
                <summary className="cursor-pointer list-none font-display text-base font-bold text-foreground md:text-lg [&::-webkit-details-marker]:hidden flex items-start justify-between gap-3">
                  <span>{faq.q}</span>
                  <span className="mt-1 shrink-0 text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground md:text-base">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============== SERVICE AREAS ============== */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            We Deliver &amp; Install Across the Emerald Coast
          </h2>
          <p className="mx-auto mb-8 max-w-2xl font-body text-muted-foreground">
            From Pensacola to 30A — one team, one call, one invoice. Tap your city for local details.
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

      {/* ============== CTA ============== */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Ready to Transform Your Landscape?
          </h2>
          <p className="mx-auto mb-8 max-w-xl font-body text-lg text-primary-foreground/80">
            Call or text for a free palm installation quote. Sourcing, delivery, planting — all in a single visit.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="tel:8509101290"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-primary-foreground px-8 py-4 font-body text-lg font-bold text-primary shadow-xl transition-transform hover:scale-105"
            >
              <Phone className="h-5 w-5" /> (850) 910-1290
            </a>
            <a
              href="sms:8509101290"
              className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-primary-foreground px-8 py-4 font-body text-lg font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              <MessageSquare className="h-5 w-5" /> Text Us
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BuyPalmTrees;