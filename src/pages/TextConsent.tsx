import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Phone } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const TextConsent = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("text_consents").insert({
      name,
      phone,
      ip_address: null, // Would need a server-side call to get real IP
      user_agent: navigator.userAgent,
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
      <section className="relative py-20 md:py-28 bg-palm-dark overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-palm-gold/40 bg-palm-gold/10 font-body text-palm-gold text-xs font-bold uppercase tracking-[0.15em] mb-4">
              <ShieldCheck className="w-4 h-4" /> TCPA Compliant
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Text Message Consent
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
              Opt in to receive text messages from Gulf Coast Palms regarding your service requests, quotes, and updates.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-lg">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">Consent to Receive Text Messages</h2>
            <p className="font-body text-sm text-muted-foreground mb-6">
              By submitting this form, you consent to receive text messages from Gulf Coast Palms at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. Reply HELP for assistance.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body">Full Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className="font-body" placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Phone Number *</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="font-body" placeholder="(850) 555-1234" />
              </div>

              <div className="bg-secondary rounded-lg p-4">
                <p className="font-body text-xs text-muted-foreground">
                  By clicking "I Consent," you agree to receive automated text messages from Gulf Coast Palms at the number provided. Consent is not a condition of purchase. You can opt out at any time by replying STOP. Standard message and data rates may apply. View our{" "}
                  <span className="text-primary">Privacy Policy</span> for more information.
                </p>
              </div>

              <Button type="submit" className="w-full font-body" disabled={loading}>
                {loading ? "Submitting..." : "I Consent to Receive Text Messages"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">Prefer to Call?</h2>
          <p className="font-body text-primary-foreground/80 mb-8">Reach us directly anytime.</p>
          <a href="tel:8509101290" className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
            <Phone className="w-6 h-6" /> (850) 910-1290
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default TextConsent;
