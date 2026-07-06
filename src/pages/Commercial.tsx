import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, MessageSquare, Check, Building2, Camera, FileText, CalendarClock, ShieldAlert, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { GCP_BUSINESS, TEL_HREF, SMS_HREF } from "@/lib/business-info";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const whoItsFor = [
  { icon: Building2, title: "Property Management Companies", desc: "Single-family portfolios, rentals, and multi-site accounts across NW Florida." },
  { icon: Building2, title: "HOAs & Condo Associations", desc: "Common-area palms, entrances, streetscapes, and community amenities." },
  { icon: Building2, title: "Commercial Properties", desc: "Retail centers, office parks, resorts, hotels, restaurants, and medical campuses." },
];

const whyPMs = [
  { title: "Volume Pricing for Portfolios", desc: "One quote covers multiple addresses. The more properties you send us, the better the per-tree rate." },
  { title: "Photo Documentation on Every Job", desc: "Before/after photos delivered with each invoice so your owner or board sees exactly what was completed." },
  { title: "Direct Invoicing", desc: "Consolidated monthly billing, W-9 and COI on file, Net-30 terms available for approved accounts." },
  { title: "Flexible Scheduling", desc: "Work performed during hours that fit your tenants — early morning, midday, or weekends when required." },
  { title: "Priority Hurricane Response", desc: "Managed accounts move to the front of the line for pre-storm prep and post-storm cleanup." },
];

const servicesAtScale = [
  { title: "Palm Trimming", desc: "Routine and pre-hurricane trimming for portfolios with dozens or hundreds of palms." },
  { title: "Tree Removal", desc: "Safe removal of storm-damaged, diseased, or overgrown trees near buildings, walkways, and parking." },
  { title: "Storm Cleanup at Scale", desc: "Fast mobilization for downed palms, hangers, and debris across multiple properties after a named storm." },
  { title: "Diamond Cutting & Skinning", desc: "Resort-quality trunk detailing for signature palms at entrances and amenity areas." },
  { title: "Recurring Maintenance Plans", desc: "Scheduled visits so palms and trees stay compliant and camera-ready year-round." },
];

const Commercial = () => {
  const prefillMessage = encodeURIComponent(
    "Hi Gulf Coast Palms — I manage properties on the Emerald Coast and would like portfolio pricing for palm and tree services. Please send scheduling and account setup details."
  );
  const quoteHref = `/quote?source=commercial&service=Commercial%20%2F%20HOA%20Portfolio&message=${prefillMessage}`;

  return (
    <Layout>
      <SEOHead
        title="Commercial & Property Management Palm & Tree Services | Gulf Coast Palms"
        description="Portfolio palm and tree services for property managers, HOAs, and commercial properties across NW Florida. Volume pricing, photo documentation, direct invoicing, priority hurricane response."
        canonicalUrl="/commercial"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Commercial & Property Management Palm and Tree Services",
            serviceType: "Commercial palm and tree care",
            description:
              "Portfolio palm and tree services for property management companies, HOAs, and commercial properties across the Florida Emerald Coast.",
            provider: {
              "@type": "LocalBusiness",
              name: "Gulf Coast Palms",
              telephone: "+18509101290",
              areaServed: [
                "Pensacola, FL", "Gulf Breeze, FL", "Navarre, FL",
                "Milton, FL", "Pace, FL", "Fort Walton Beach, FL",
                "Destin, FL", "Niceville, FL", "Crestview, FL",
                "Mary Esther, FL", "Santa Rosa Beach, FL",
              ],
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-palm-dark section-padding">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Commercial & Property Management
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Palm & Tree Care for Property Portfolios
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-body text-lg text-palm-sand/80 max-w-3xl mx-auto mb-8">
            One crew for every address in your portfolio. Gulf Coast Palms partners with property managers, HOAs, and commercial owners across Northwest Florida — with volume pricing, photo documentation, and priority hurricane response.
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={quoteHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-base hover:scale-[1.02] transition-transform shadow-xl"
            >
              Request Portfolio Pricing <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={TEL_HREF}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-base"
            >
              <Phone className="w-5 h-5" /> {GCP_BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 text-center">
            Who We Work With
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            If you manage more than one property, you get a dedicated point of contact and simplified billing.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {whoItsFor.map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 2}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm"
              >
                <item.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why PMs choose us */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Why Property Managers Choose Gulf Coast Palms
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {whyPMs.map((item, i) => {
              const icons = [FileText, Camera, FileText, CalendarClock, ShieldAlert];
              const Icon = icons[i] ?? Check;
              return (
                <motion.div
                  key={item.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="bg-card rounded-2xl p-6 border border-border shadow-sm flex gap-4"
                >
                  <Icon className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services at scale */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Services We Deliver at Scale
          </motion.h2>
          <div className="space-y-4">
            {servicesAtScale.map((s, i) => (
              <motion.div
                key={s.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="bg-card rounded-xl p-6 border border-border shadow-sm"
              >
                <h3 className="font-display text-lg font-bold text-foreground mb-1">{s.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Request pricing CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Request Portfolio Pricing
          </h2>
          <p className="font-body text-lg text-primary-foreground/85 mb-8">
            Send us the property list and we'll come back with a per-visit rate and a proposed schedule — usually within one business day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={quoteHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-foreground text-primary font-body font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform"
            >
              Start My Portfolio Quote <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={SMS_HREF}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-lg"
            >
              <MessageSquare className="w-5 h-5" /> Text Us
            </a>
          </div>
          <p className="font-body text-sm text-primary-foreground/70 mt-6">
            Prefer to talk? Call <a href={TEL_HREF} className="underline font-semibold">{GCP_BUSINESS.phoneDisplay}</a>.
          </p>
        </div>
      </section>

      {/* Related */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="font-display text-2xl font-bold text-foreground mb-6">Related Services</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { to: "/hoa-commercial-palm-maintenance", label: "HOA Palm Maintenance" },
              { to: "/services/palm-tree-trimming", label: "Palm Tree Trimming" },
              { to: "/services/tree-trimming-removal", label: "Tree Trimming & Removal" },
              { to: "/hurricane-palm-preparation", label: "Hurricane Preparation" },
              { to: "/palm-tree-maintenance-plans", label: "Maintenance Plans" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border font-body font-medium text-foreground hover:border-primary hover:text-primary transition-colors shadow-sm">
                {l.label} <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Commercial;