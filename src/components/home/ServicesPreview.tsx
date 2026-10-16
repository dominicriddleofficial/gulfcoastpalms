import { ArrowRight, TreeDeciduous, TreePalm } from "lucide-react";
import { Link } from "react-router-dom";
import { serviceGroups } from "@/data/services";
import { publicMarketing } from "@/data/publicMarketing";
import palmTrimming from "@/assets/palm-trimming.jpg";
import QuoteRequestButton from "@/components/cta/QuoteRequestButton";

const ServicesPreview = () => (
  <section className="section-padding bg-background" aria-labelledby="home-services-heading">
    <div className="container mx-auto">
      <h2 id="home-services-heading" className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-4">{publicMarketing.servicesHeading}</h2>
      <p className="font-body text-muted-foreground max-w-3xl mx-auto text-center mb-8">{publicMarketing.servicesText}</p>
      <div className="grid md:grid-cols-2 gap-8">
        {serviceGroups.slice(0, 2).map((group, i) => (
          <article key={group.label} className="border border-border rounded-lg overflow-hidden bg-card">
            {i === 0 ? (
              <div className="h-48 bg-secondary flex items-center justify-center gap-6 text-primary" aria-hidden="true">
                <TreeDeciduous className="w-20 h-20" strokeWidth={1.25} />
                <div className="h-20 border-l border-primary/30" />
                <span className="font-body text-sm text-foreground leading-relaxed">Oaks &amp; pines<br />Trimming &amp; removal<br />Storm cleanup</span>
              </div>
            ) : <img src={palmTrimming} alt="Palm tree trimming by Gulf Coast Palms" className="h-48 w-full object-cover" loading="lazy" width={800} height={600} />}
            <div className="p-6">
              <h3 className="font-display text-2xl font-bold text-foreground mb-3 flex items-center gap-3">{i === 0 ? <TreeDeciduous className="w-6 h-6 text-primary" /> : <TreePalm className="w-6 h-6 text-palm-gold" />}{group.label}</h3>
              <p className="font-body text-muted-foreground mb-4">{i === 0 ? "Experienced tree crews, including an experienced climber. Site assessment and a written scope for your property." : "Established palm expertise: trimming, diamond cutting, trunk skinning, installations and removals."}</p>
              <nav aria-label={`${group.label} services`} className="flex flex-col divide-y divide-border">
                {group.links.map((link) => <Link key={link.to} to={link.to} className="flex justify-between items-center gap-3 py-3 text-foreground font-body hover:text-primary">{link.label}<ArrowRight className="w-4 h-4 shrink-0" /></Link>)}
              </nav>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 text-center"><QuoteRequestButton source="home_services" /></div>
      <div className="flex flex-wrap justify-center gap-6 mt-8 font-body text-primary">
        <Link to="/services">All Services <ArrowRight className="inline w-4 h-4" /></Link>
        <Link to="/services/landscaping-services">Landscaping</Link>
        <Link to="/commercial">Commercial Properties</Link>
        <Link to="/palm-trees/buy">Buy Palm Trees</Link>
      </div>
    </div>
  </section>
);
export default ServicesPreview;
