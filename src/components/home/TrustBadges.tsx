import { motion } from "framer-motion";

const badges = [
  { icon: "🌴", label: "Palm Specialists", sub: "Not a generalist tree service" },
  { icon: "✅", label: "Licensed & Insured", sub: "Full coverage on every job" },
  { icon: "📍", label: "Locally Owned", sub: "Navarre Beach, FL" },
  { icon: "⚡", label: "Fast Response", sub: "Same-day estimates" },
  { icon: "🌀", label: "Hurricane Ready", sub: "Emergency service available" },
];

const TrustBadges = () => (
  <section className="bg-secondary border-y border-border py-6 md:py-8">
    <div className="container mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
            className="flex items-center gap-3 justify-center md:justify-start"
          >
            <span className="text-2xl shrink-0">{b.icon}</span>
            <div>
              <p className="font-body text-sm font-semibold text-foreground leading-tight">{b.label}</p>
              <p className="font-body text-xs text-muted-foreground leading-tight">{b.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBadges;
