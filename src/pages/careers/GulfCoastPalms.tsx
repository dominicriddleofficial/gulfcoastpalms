import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Truck, Wrench, Headphones, CheckCircle, ArrowRight, Shield, Clock, TrendingUp, Star,
} from "lucide-react";

const ROLES = [
  {
    title: "Team Leader",
    icon: Truck,
    path: "/careers/gulf-coast-palms/team-leader",
    desc: "Lead crews in the field — drive the truck and trailer, talk to customers, and keep every job running efficiently.",
  },
  {
    title: "Groundsman",
    icon: Wrench,
    path: "/careers/gulf-coast-palms/groundsman",
    desc: "Support the crew from the ground — drag brush, load the trailer, and help keep every job site clean. Starting around $20–$25/hr.",
  },
  {
    title: "Sales & Operations Coordinator",
    icon: Headphones,
    path: "/careers/gulf-coast-palms/sales-operations",
    desc: "Run the front end of the business — manage leads, book quotes, follow up with customers, and keep everything organized.",
  },
];

const GulfCoastPalmsCareers = () => {
  return (
    <Layout>
      <SEOHead
        title="Careers at Gulf Coast Palms | NW Florida"
        description="Build a career in the outdoors with Gulf Coast Palms. View open positions for groundsmen, team leaders, and sales operations in Navarre and NW Florida."
        canonicalUrl="/careers/gulf-coast-palms"
      />
      {/* Hero */}
      <section className="relative bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
        </div>
        <div className="container mx-auto section-padding relative z-10 text-center max-w-4xl">
          <p className="font-body text-sm uppercase tracking-[0.2em] text-primary mb-4 font-semibold">Now Hiring</p>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-white">
            Join the Gulf Coast Palms Team
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 mb-4 max-w-2xl mx-auto">
            Work with a fast-growing local palm tree trimming company that values speed, quality, safety, and professionalism.
          </p>
          <p className="font-body text-base text-white/60 mb-10 max-w-2xl mx-auto">
            We are looking for dependable, hard-working people who can help us run efficient, high-quality palm tree trimming jobs. This is a real opportunity for someone who wants to work, grow, and become a key part of a serious company.
          </p>
        </div>
      </section>

      {/* Open Positions */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
            Open Positions
          </h2>
          <div className="grid gap-6">
            {ROLES.map(({ title, icon: Icon, path, desc }) => (
              <Link key={title} to={path} className="group">
                <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5 transition-all hover:border-primary/50 hover:shadow-lg">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-foreground flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl font-bold text-foreground mb-1">{title}</h3>
                    <p className="font-body text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="section-padding bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: TrendingUp, title: "Competitive Pay", desc: "Hourly pay based on position and experience. Performance-based upside for operations roles." },
              { icon: Star, title: "Room to Grow", desc: "Strong opportunity to grow into a bigger leadership role over time — in the field or on the operations side." },
              { icon: Shield, title: "Performance Matters", desc: "Efficiency, reliability, and work ethic are what get you ahead here — not just showing up." },
              { icon: Clock, title: "Real Opportunity", desc: "This isn't a dead-end gig. If you want to build something real, this is the place." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-6 flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{title}</h3>
                  <p className="font-body text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="section-padding bg-foreground text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Our Standards</h2>
          <p className="font-body text-lg text-white/70">
            We move fast, work hard, protect customer property, and take pride in doing clean, professional work. If you're dependable, coachable, and want to grow with a serious company — this could be a strong fit.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default GulfCoastPalmsCareers;
