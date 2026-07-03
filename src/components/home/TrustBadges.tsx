import { motion } from "framer-motion";
import { Leaf, ShieldCheck, MapPin, Zap, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const badges: { Icon: LucideIcon; label: string; sub: string; mobileHidden: boolean; amber?: boolean }[] = [
  { Icon: Leaf, label: "Palm Specialists", sub: "Not a generalist tree service", mobileHidden: false },
  { Icon: ShieldCheck, label: "Licensed & Insured", sub: "Full coverage on every job", mobileHidden: false },
  { Icon: MapPin, label: "Locally Owned", sub: "Navarre Beach, FL", mobileHidden: false },
  { Icon: Zap, label: "Fast Response", sub: "Same-day estimates", mobileHidden: false, amber: true },
  { Icon: Wind, label: "Hurricane Ready", sub: "Emergency service available", mobileHidden: true },
];

const TrustBadges = () => (
  <section className="bg-secondary border-y border-border py-5 md:py-9">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-5">
        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
            className={`flex items-center gap-2.5 md:gap-3 justify-center md:justify-start ${b.mobileHidden ? "hidden md:flex" : ""}`}
          >
            <span className={b.amber ? "icon-chip-amber !w-9 !h-9 md:!w-10 md:!h-10" : "icon-chip !w-9 !h-9 md:!w-10 md:!h-10"} aria-hidden>
              <b.Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.25} />
            </span>
            <div>
              <p className="font-body text-xs md:text-sm font-semibold text-foreground leading-tight">{b.label}</p>
              <p className="font-body text-[11px] md:text-xs text-muted-foreground leading-tight">{b.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBadges;
