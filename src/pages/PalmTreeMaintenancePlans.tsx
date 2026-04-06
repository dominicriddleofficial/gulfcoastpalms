import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Shield, Calendar, TreePine, Home, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { submitLead } from "@/lib/submit-lead";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const benefits = [
  { icon: Shield, title: "Hurricane Ready", desc: "Properly maintained palms withstand storms better. We trim before season starts automatically." },
  { icon: TreePine, title: "Healthier Palms", desc: "Regular trimming prevents disease, pest infestation, and premature decline." },
  { icon: Home, title: "Better Property Value", desc: "Well-maintained palms are a selling point — neglected ones are a liability." },
  { icon: Calendar, title: "No More Scheduling", desc: "We track your service schedule. You'll get a reminder, we'll handle the rest." },
];

const plans = [
  {
    name: "Annual Plan",
    desc: "One scheduled trimming per year + pre-hurricane inspection.",
    best: "Low-maintenance palms, smaller properties",
    features: ["1 professional trimming per year", "Pre-hurricane inspection", "Debris cleanup & haul-away"],
  },
  {
    name: "Semi-Annual Plan",
    desc: "Two trimmings per year (spring + fall) + hurricane prep.",
    best: "Growing palms, coastal properties",
    features: ["2 trimmings per year (spring + fall)", "Hurricane season preparation", "Palm health assessment", "Priority scheduling"],
    popular: true,
  },
  {
    name: "Quarterly Plan",
    desc: "Four trimmings per year + priority scheduling + health assessments.",
    best: "HOA properties, large palm collections, commercial",
    features: ["4 trimmings per year", "Priority scheduling", "Comprehensive health assessments", "Storm damage priority response"],
  },
];

const included = [
  "Professional trimming by certified crew",
  "Debris cleanup and haul-away",
  "Palm health assessment at each visit",
  "Digital record of service history",
  "Hurricane season check-in notification",
  "Priority scheduling over non-plan customers",
];

const faqs = [
  { q: "Can I cancel my maintenance plan anytime?", a: "Yes, maintenance plans can be cancelled at any time. We believe in earning your business every visit. No long-term contracts required." },
  { q: "Do maintenance plans include palm tree removal if needed?", a: "Removal is not included in standard plans, but plan members receive preferred pricing and priority scheduling for any additional services." },
  { q: "How do I know when my scheduled service is coming up?", a: "We'll send you a text or email reminder 48 hours before each scheduled visit. You don't need to remember anything — we handle the scheduling." },
  { q: "Do you offer maintenance plans for commercial properties and HOAs?", a: "Absolutely. Our Quarterly Plan is specifically designed for HOA communities, commercial properties, and large palm collections. Contact us for custom commercial pricing." },
  { q: "What areas do your maintenance plans cover?", a: "We serve the entire NW Florida coast from Perdido Key to 30A, including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, and Destin." },
];

export default function PalmTreeMaintenancePlans() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", palmCount: "", plan: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitLead({
      name: form.name,
      phone: form.phone,
      email: form.email,
      source: "maintenance_plan",
      service: `Maintenance Plan: ${form.plan || "undecided"}`,
      message: `Address: ${form.address}, Approx palms: ${form.palmCount}, Plan interest: ${form.plan}`,
    });
    setSubmitting(false);
    if (result.success) navigate("/thank-you");
  };

  return (
    <Layout>
      <SEOHead
        title="Palm Tree Maintenance Plans NW Florida | Gulf Coast Palms"
        description="Protect your palms year-round with a Gulf Coast Palms maintenance plan. Scheduled trimming, health checks, and hurricane prep — serving Navarre, Pensacola, Destin, and NW Florida."
        canonicalUrl="/palm-tree-maintenance-plans"
      />

      {/* FAQPage JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }) }} />

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Maintenance Plans
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Keep Your Palms Healthy Year-Round
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-3xl mx-auto mb-8">
            Set it and forget it — Gulf Coast Palms handles your scheduled palm maintenance so you never have to think about it.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#plans" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-palm-light transition-all shadow-lg">
              Get My Maintenance Plan <ArrowRight className="w-5 h-5" />
            </a>
            <a href="tel:8509101290" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/10 transition-all">
              <Phone className="w-5 h-5" /> (850) 910-1290
            </a>
          </motion.div>
        </div>
      </section>

      {/* Why */}
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Why a Maintenance Plan?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <motion.div key={b.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="bg-card border border-border rounded-xl p-6 text-center">
                <b.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{b.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="section-padding bg-secondary">
        <div className="container mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Plan Options
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className={`bg-card border rounded-xl p-6 flex flex-col ${plan.popular ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                {plan.popular && <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground font-body text-xs font-bold uppercase mb-3 self-start">Most Popular</span>}
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="font-body text-sm text-muted-foreground mb-4">{plan.desc}</p>
                {/* TODO: Fill in actual plan pricing */}
                <p className="font-display text-2xl font-bold text-primary mb-4">[PRICE]<span className="text-sm font-normal text-muted-foreground">/year</span></p>
                <p className="font-body text-xs text-muted-foreground mb-4">Best for: {plan.best}</p>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-body text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#signup" className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-primary/90 transition-colors">
                  Get Started
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Included */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            What's Included in Every Plan
          </motion.h2>
          <div className="space-y-3">
            {included.map((item, i) => (
              <motion.div key={item} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <Check className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-3xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-foreground mb-2">{faq.q}</h3>
                <p className="font-body text-sm text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form */}
      <section id="signup" className="section-padding bg-palm-dark">
        <div className="container mx-auto max-w-xl">
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-6 text-center">
            Start My Maintenance Plan
          </h2>
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 space-y-4">
            <div>
              <label htmlFor="mp-name" className="font-body text-sm font-medium text-foreground block mb-1">Name</label>
              <input id="mp-name" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-input bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mp-phone" className="font-body text-sm font-medium text-foreground block mb-1">Phone</label>
                <input id="mp-phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-input bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label htmlFor="mp-email" className="font-body text-sm font-medium text-foreground block mb-1">Email</label>
                <input id="mp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-input bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label htmlFor="mp-address" className="font-body text-sm font-medium text-foreground block mb-1">Property Address</label>
              <input id="mp-address" type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-input bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mp-count" className="font-body text-sm font-medium text-foreground block mb-1">Number of Palms (approx)</label>
                <input id="mp-count" type="text" value={form.palmCount} onChange={(e) => setForm({ ...form, palmCount: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-input bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label htmlFor="mp-plan" className="font-body text-sm font-medium text-foreground block mb-1">Interested Plan</label>
                <select id="mp-plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-input bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select...</option>
                  <option value="annual">Annual</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="unsure">Not sure — help me decide</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? "Submitting..." : "Start My Maintenance Plan"}
            </button>
          </form>
        </div>
      </section>
    </Layout>
  );
}
