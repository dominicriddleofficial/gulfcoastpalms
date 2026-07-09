import { useState } from "react";
import { motion } from "framer-motion";
import { emergencyFormSchema } from "@/lib/validation";
import { Phone, AlertTriangle, Clock, FileText, Shield, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const EmergencyPalmService = () => {
  const [form, setForm] = useState({ name: "", phone: "", address: "", damage: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    const parsed = emergencyFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrorMsg(parsed.error.errors[0]?.message || "Please check the form and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const { submitLead } = await import("@/lib/submit-lead");
      const result = await submitLead({
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: `EMERGENCY — ${parsed.data.address} — ${parsed.data.damage || ""}`,
        service: "Emergency Palm Service",
        source: "emergency-page",
        location: parsed.data.address,
      });
      if (result.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(result.error || "Could not submit. Please call (850) 910-1290.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not submit. Please call (850) 910-1290.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Emergency Palm Tree Service NW Florida | Gulf Coast Palms"
        description="Storm damage? Leaning palms? Gulf Coast Palms provides fast emergency palm tree removal, assessment, and insurance documentation across Navarre, Pensacola, Destin, and the Emerald Coast."
        canonicalUrl="/emergency-palm-service"
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Emergency Palm Tree Service",
            description: "Fast emergency palm tree removal, storm damage assessment, and insurance documentation across NW Florida.",
            provider: {
              "@type": "LocalBusiness",
              name: "Gulf Coast Palms",
              telephone: "(850) 910-1290",
            },
            areaServed: ["Navarre", "Fort Walton Beach", "Destin", "Pensacola", "Gulf Breeze", "30A", "Perdido Key"],
          }),
        }}
      />

      {/* Hero */}
      <section className="relative bg-palm-dark py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-palm-gold/5" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/15 border border-destructive/30 mb-6">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="font-body text-sm font-bold text-destructive">Emergency Palm Service</span>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Storm Damage?{" "}
              <span className="text-palm-gold">We Respond Fast</span>
              <br />Across NW Florida
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto mb-8">
              Leaning palms, downed fronds, root instability — we assess, document, and resolve palm emergencies quickly and safely.
            </motion.p>
            <motion.a
              variants={fadeUp}
              custom={3}
              href="tel:8509101290"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-destructive text-primary-foreground font-body font-bold text-xl hover:bg-destructive/90 transition-all shadow-lg animate-pulse"
            >
              <Phone className="w-6 h-6" />
              Call Now — (850) 910-1290
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* What qualifies */}
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Qualifies as a Palm Emergency?
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { icon: AlertTriangle, title: "Leaning Palms After Wind", desc: "A palm leaning after a storm may have compromised roots — this is a falling hazard that needs immediate assessment." },
              { icon: Shield, title: "Frond Hazards Near Rooflines", desc: "Heavy dead fronds above your roof, driveway, or walkways are a safety risk during and after storms." },
              { icon: AlertTriangle, title: "Root Instability", desc: "Visible root upheaval, soil cracking around the base, or a palm that sways more than normal." },
              { icon: FileText, title: "Post-Hurricane Assessment", desc: "Full property palm assessment after a hurricane — identify damaged trees, prioritize removals, and document for insurance." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex gap-4 p-6 rounded-xl border border-border bg-card">
                <item.icon className="w-6 h-6 text-destructive shrink-0 mt-1" />
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="font-body text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Insurance Documentation */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
              Insurance Claim Documentation
            </motion.h2>
            <motion.div variants={fadeUp} custom={1} className="bg-card border border-border rounded-xl p-8 space-y-4">
              <p className="font-body text-foreground leading-relaxed">
                Filing an insurance claim for storm-damaged palms? <strong>Gulf Coast Palms can help.</strong> We provide detailed photo documentation, written damage assessments, and professional reports to support your homeowner's insurance claim.
              </p>
              <p className="font-body text-muted-foreground leading-relaxed">
                Our team photographs all damage, documents the condition and species of each affected palm, and provides a written assessment with cost estimates. This documentation has helped dozens of Gulf Coast homeowners successfully file claims and get reimbursed for emergency tree work.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="font-body text-sm font-semibold text-foreground">This is a direct competitive advantage — most tree services don't offer documentation support.</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Emergency form */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold text-foreground mb-2 text-center">
              Report a Palm Emergency
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground text-center mb-8">
              Fill out the form and we'll call you back as soon as possible.
            </motion.p>
          </motion.div>

          {submitted ? (
            <div className="text-center bg-primary/10 border border-primary/30 rounded-xl p-8">
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-foreground mb-2">We've received your request</h3>
              <p className="font-body text-muted-foreground">Our team will call you as soon as possible. For immediate help, call <a href="tel:8509101290" className="text-primary font-semibold">(850) 910-1290</a>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                required
                placeholder="Your Name"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card font-body text-foreground"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                type="tel"
                placeholder="Phone Number"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card font-body text-foreground"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                required
                placeholder="Property Address"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card font-body text-foreground"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <textarea
                required
                placeholder="Describe the damage or situation..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card font-body text-foreground resize-none"
                value={form.damage}
                onChange={(e) => setForm({ ...form, damage: e.target.value })}
              />
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-destructive text-primary-foreground font-body font-bold text-lg hover:bg-destructive/90 transition-colors"
              >
                Submit Emergency Request
              </button>
            </form>
          )}
        </div>
      </section>

      {/* What happens next */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              What Happens Next
            </motion.h2>
          </motion.div>
          <div className="space-y-6">
            {[
              { step: "1", title: "Submit Your Request", desc: "Call, text, or fill out the form above." },
              { step: "2", title: "We Call You Back", desc: "A team member contacts you within hours — often within 30 minutes during business hours." },
              { step: "3", title: "Same-Day Assessment", desc: "We come to your property, evaluate the situation, and photograph all damage." },
              { step: "4", title: "Written Quote", desc: "You receive a clear quote with scope, timeline, and pricing — plus insurance documentation if needed." },
              { step: "5", title: "Emergency Service", desc: "We execute the work quickly and safely, with full cleanup included." },
            ].map((s, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-palm-gold flex items-center justify-center font-display font-bold text-palm-dark shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-primary-foreground">{s.title}</h3>
                  <p className="font-body text-sm text-palm-sand/70">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default EmergencyPalmService;
