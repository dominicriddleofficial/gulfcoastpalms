import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { treeServiceLinks } from "@/data/services";
import { publicMarketing } from "@/data/publicMarketing";

export default function TreeAreaLinks() {
  return <section className="section-padding bg-secondary">
    <div className="container mx-auto max-w-4xl">
      <h2 className="font-display text-3xl font-bold text-foreground mb-4">{publicMarketing.treeAreaHeading}</h2>
      <p className="font-body text-muted-foreground mb-6">{publicMarketing.treeAreaText}</p>
      <nav aria-label="General tree services" className="flex flex-wrap gap-x-8 gap-y-4">
        {treeServiceLinks.map((link) => <Link key={link.to} to={link.to} className="font-body font-semibold text-primary inline-flex gap-2 items-center">{link.label}<ArrowRight className="w-4 h-4" /></Link>)}
      </nav>
    </div>
  </section>;
}
