import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Phone, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const Referral = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    referrerName: "", referrerPhone: "", referrerEmail: "",
    referredName: "", referredPhone: "", referredEmail: "", referredService: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("referrals").insert({
      referrer_name: form.referrerName,
      referrer_phone: form.referrerPhone || null,
      referrer_email: form.referrerEmail || null,
      referred_name: form.referredName,
      referred_phone: form.referredPhone || null,
      referred_email: form.referredEmail || null,
      referred_service: form.referredService || null,
    });

    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    navigate("/thank-you");
  };

  return (
    <Layout>
      <SEOHead
        title="Refer a Friend & Earn | Gulf Coast Palms Referral Program"
        description="Love your results? Refer a neighbor or friend to Gulf Coast Palms and earn rewards. Join our referral program serving NW Florida."
        canonicalUrl="/referral"
      />
      <section className="relative py-20 md:py-28 bg-palm-dark overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" animate="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-palm-gold/40 bg-palm-gold/10 font-body text-palm-gold text-xs font-bold uppercase tracking-[0.15em] mb-4">
              <Gift className="w-4 h-4" /> Referral Program
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Refer a Friend, Get $100 Off
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
              Know someone who needs palm tree services? Refer them to Gulf Coast Palms and you both get $100 off your next service.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Submit a Referral", desc: "Fill out the form below with your info and your friend's info." },
              { step: "2", title: "We Reach Out", desc: "Our team contacts your friend and provides a free quote." },
              { step: "3", title: "You Both Save", desc: "When they book a service, you both get $100 off!" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Form */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-8">Submit Your Referral</h2>
          <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-lg">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Your Name *</Label>
                  <Input value={form.referrerName} onChange={set("referrerName")} required className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Your Phone</Label>
                  <Input type="tel" value={form.referrerPhone} onChange={set("referrerPhone")} className="font-body" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-body">Your Email</Label>
                  <Input type="email" value={form.referrerEmail} onChange={set("referrerEmail")} className="font-body" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Friend's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Friend's Name *</Label>
                  <Input value={form.referredName} onChange={set("referredName")} required className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Friend's Phone</Label>
                  <Input type="tel" value={form.referredPhone} onChange={set("referredPhone")} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Friend's Email</Label>
                  <Input type="email" value={form.referredEmail} onChange={set("referredEmail")} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Service Interested In</Label>
                  <select value={form.referredService} onChange={set("referredService")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm">
                    <option value="">Select a service</option>
                    <option value="Palm Trimming">Palm Trimming</option>
                    <option value="Palm Installation">Palm Installation</option>
                    <option value="Palm Removal">Palm Removal</option>
                    <option value="Diamond Cutting">Diamond Cutting</option>
                    <option value="Trunk Skinning">Trunk Skinning</option>
                    <option value="Tree Trimming & Removal">Tree Trimming & Removal</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full font-body text-lg py-6" disabled={loading}>
              {loading ? "Submitting..." : "Submit Referral"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Questions About the Referral Program?</h2>
          <p className="font-body text-primary-foreground/80 mb-8">Call or text us anytime.</p>
          <a href="tel:8509101290" className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
            <Phone className="w-6 h-6" /> (850) 910-1290
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Referral;
