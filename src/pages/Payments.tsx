import { motion } from "framer-motion";
import { CreditCard, Phone, Shield, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const Payments = () => {
  return (
    <Layout>
      <SEOHead
        title="Pay Your Invoice | Gulf Coast Palms"
        description="Easily pay your Gulf Coast Palms invoice online. Secure payments powered by Stripe. Have your invoice number ready."
        canonicalUrl="/payments"
      />
      <section className="relative py-20 md:py-28 bg-palm-dark overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} custom={0} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Payments & Invoicing
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
              Simple, transparent payment options for all Gulf Coast Palms services.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Deposit Payments</h2>
              <p className="font-body text-muted-foreground mb-4">
                For larger projects like palm installations, we may require a deposit to secure your booking and order materials. Deposits are typically 50% of the total project cost.
              </p>
              <ul className="space-y-2 font-body text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Secure online payment links</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Receipt sent automatically</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Balance due upon completion</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Invoice Payments</h2>
              <p className="font-body text-muted-foreground mb-4">
                After service completion, we'll send you a detailed invoice with a secure payment link. Pay online at your convenience — no need for cash or checks.
              </p>
              <ul className="space-y-2 font-body text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Itemized service breakdown</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Credit card & bank transfer accepted</li>
                <li className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Net 30 terms for commercial accounts</li>
              </ul>
            </div>
          </div>

          <div className="bg-secondary rounded-2xl p-8 text-center">
            <h3 className="font-display text-2xl font-bold text-foreground mb-3">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {[
                { step: "1", title: "Get a Quote", desc: "Call, text, or chat with us for a free estimate." },
                { step: "2", title: "Receive Payment Link", desc: "We'll send a secure link via text or email." },
                { step: "3", title: "Pay Online", desc: "Pay securely with credit card or bank transfer." },
              ].map((item) => (
                <div key={item.step}>
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-display font-bold flex items-center justify-center mx-auto mb-3">
                    {item.step}
                  </div>
                  <h4 className="font-display font-bold text-foreground mb-1">{item.title}</h4>
                  <p className="font-body text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Have a Payment Question?</h2>
          <p className="font-body text-primary-foreground/80 mb-8 max-w-xl mx-auto">Contact us for billing inquiries or to request an invoice.</p>
          <a href="tel:8509101290" className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
            <Phone className="w-6 h-6" /> (850) 910-1290
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Payments;
