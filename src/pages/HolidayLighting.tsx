import { useState } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Star, Truck, Lightbulb, MapPin, Calendar, CheckCircle } from "lucide-react";
import { submitLead } from "@/lib/submit-lead";
import { holidayLightingSchema } from "@/lib/validation";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const whyCards = [
  { icon: Shield, title: "No Ladder Risks", desc: "Our insured crews handle every height safely — no homeowner injuries." },
  { icon: Star, title: "Perfect Every Time", desc: "Commercial-grade LED lights with clean, symmetrical lines." },
  { icon: Truck, title: "Takedown Included", desc: "We install, maintain, and remove everything — you do nothing." },
  { icon: Lightbulb, title: "Commercial-Grade Lights", desc: "Professional LED bulbs that last the whole season, rain or shine." },
];

const services = [
  { title: "Residential Home Lighting", desc: "Rooflines, trees, landscaping, and walkways — your home will be the envy of the neighborhood." },
  { title: "Vacation Rental & Airbnb", desc: "Make your rental stand out during peak holiday season with professional lighting that wow guests." },
  { title: "HOA & Commercial", desc: "Full community and commercial property lighting programs with bulk pricing." },
  { title: "Palm Tree Lighting", desc: "Signature Emerald Coast aesthetic — wrap your palms in warm glow for the holidays." },
];

const cities = ["Navarre", "Gulf Breeze", "Fort Walton Beach", "Pensacola", "Destin", "30A", "Niceville"];

export default function HolidayLighting() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", propertyType: "", roofline: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [formRenderTime] = useState(() => Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot anti-spam
    if (honeypot) { navigate("/thank-you"); return; }
    if (Date.now() - formRenderTime < 2000) { navigate("/thank-you"); return; }
    const parsed = holidayLightingSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Please check the form");
      return;
    }
    setSubmitting(true);
    const result = await submitLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      service: "Holiday Lighting",
      source: "holiday-lighting",
      message: `Property: ${parsed.data.propertyType} | Roofline: ${parsed.data.roofline} | Address: ${parsed.data.address} | ${parsed.data.notes}`,
      location: parsed.data.address || undefined,
      website: honeypot,
      formRenderTime,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success("Estimate request submitted!");
      navigate("/thank-you");
    } else {
      toast.error(result.error || "Failed to submit");
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Gulf Coast Palms",
    description: "Professional holiday lighting installation and removal for homes, vacation rentals, and HOA communities in NW Florida.",
    areaServed: cities.map(c => ({ "@type": "City", name: c + ", FL" })),
    service: { "@type": "Service", name: "Holiday Lighting Installation" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How much does professional holiday lighting cost?", acceptedAnswer: { "@type": "Answer", text: "Most residential homes range from $500–$2,500 depending on roofline length and complexity. We provide free on-site estimates." } },
      { "@type": "Question", name: "When should I book holiday lighting?", acceptedAnswer: { "@type": "Answer", text: "We recommend booking by mid-October. November and December fill up fast." } },
      { "@type": "Question", name: "Do you remove the lights after the season?", acceptedAnswer: { "@type": "Answer", text: "Yes! Takedown and optional storage are included in every package." } },
      { "@type": "Question", name: "What areas do you serve?", acceptedAnswer: { "@type": "Answer", text: "We serve Navarre, Gulf Breeze, Pensacola, Fort Walton Beach, Destin, 30A, and surrounding NW Florida communities." } },
    ],
  };

  return (
    <Layout>
      <SEOHead
        title="Holiday Lighting Installation NW Florida | Navarre, Gulf Breeze, Fort Walton | Gulf Coast Palms"
        description="Professional holiday lighting installation and removal for homes, vacation rentals, and HOA communities in Navarre, Gulf Breeze, Fort Walton Beach, and the Emerald Coast."
        canonicalUrl="https://gulfcoastpalmservices.com/holiday-lighting"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0a1a0a] via-[#0f2f0f] to-[#0a1a0a] py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Professional Holiday Lighting for NW Florida Homes & Properties
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Installation, takedown, and storage handled completely by us. You enjoy the holidays — we handle the lights.
          </p>
          <a href="#estimate-form">
            <Button size="lg" className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg px-8 py-6">
              Get a Free Lighting Estimate
            </Button>
          </a>
        </div>
      </section>

      {/* Why Professional */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">Why Professional Holiday Lighting?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyCards.map(card => (
              <div key={card.title} className="bg-card border border-border rounded-xl p-6 text-center">
                <card.icon className="w-10 h-10 mx-auto text-[#22c55e] mb-3" />
                <h3 className="font-bold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">Our Holiday Lighting Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {services.map(s => (
              <div key={s.title} className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold text-foreground mb-2 text-lg">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Service Areas</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {cities.map(city => (
              <span key={city} className="inline-flex items-center gap-1.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 rounded-full px-4 py-2 text-sm font-medium">
                <MapPin className="w-3.5 h-3.5" /> {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Timeline */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Book Early — We Fill Up Fast</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">October and November fill up quickly. Request your estimate now to secure your spot.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {[
              { month: "September", action: "Book Estimate" },
              { month: "October", action: "Installation" },
              { month: "January", action: "Takedown & Storage" },
            ].map((step, i) => (
              <div key={step.month} className="flex items-center gap-3">
                <div className="bg-[#22c55e]/15 rounded-full p-3">
                  <Calendar className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">{step.month}</p>
                  <p className="text-sm text-muted-foreground">{step.action}</p>
                </div>
                {i < 2 && <span className="hidden md:block text-muted-foreground text-2xl">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form */}
      <section id="estimate-form" className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-lg">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">Get Your Free Holiday Lighting Estimate</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot anti-spam field — hidden from real users, bots tend to fill it */}
            <div style={{ position: "absolute", left: "-10000px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }} aria-hidden="true">
              <label htmlFor="website-hp">Website (leave blank)</label>
              <input type="text" id="website-hp" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            <Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Phone *" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Property Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Select value={form.propertyType} onValueChange={v => setForm({ ...form, propertyType: v })}>
              <SelectTrigger><SelectValue placeholder="Property Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="vacation-rental">Vacation Rental / Airbnb</SelectItem>
                <SelectItem value="hoa">HOA Community</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.roofline} onValueChange={v => setForm({ ...form, roofline: v })}>
              <SelectTrigger><SelectValue placeholder="Approximate Roofline Length" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="under-100">Under 100 ft</SelectItem>
                <SelectItem value="100-200">100–200 ft</SelectItem>
                <SelectItem value="200-400">200–400 ft</SelectItem>
                <SelectItem value="400+">400+ ft</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Additional notes…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white" disabled={submitting}>
              {submitting ? "Submitting…" : "Request Free Estimate"}
            </Button>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How much does professional holiday lighting cost?", a: "Most residential homes range from $500–$2,500 depending on roofline length and complexity. We provide free on-site estimates." },
              { q: "When should I book holiday lighting?", a: "We recommend booking by mid-October. November and December fill up fast." },
              { q: "Do you remove the lights after the season?", a: "Yes! Takedown and optional storage are included in every package." },
              { q: "What areas do you serve?", a: "We serve Navarre, Gulf Breeze, Pensacola, Fort Walton Beach, Destin, 30A, and surrounding NW Florida communities." },
            ].map(faq => (
              <div key={faq.q} className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
