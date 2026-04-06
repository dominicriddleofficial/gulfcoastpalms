import { Link } from "react-router-dom";
import { Phone, MessageSquare, MapPin } from "lucide-react";
import { locations } from "@/data/locations";
import { serviceNavLinks } from "@/data/services";
import { GOOGLE_REVIEW_URL } from "@/data/reviews";
import { trackEvent } from "@/lib/analytics";

const Footer = () => {
  return (
    <footer className="bg-palm-dark text-primary-foreground">
      <div className="container mx-auto section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div>
            <h3 className="text-2xl font-display font-bold text-palm-light mb-4">
              Gulf Coast Palms
            </h3>
            <p className="font-body text-palm-sand/70 leading-relaxed">
              Professional palm tree services for Florida's Gulf Coast.
              Over 500 jobs completed in the summer of 2025 alone — with 5-star quality.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Services</h4>
            <nav className="flex flex-col gap-2">
              {serviceNavLinks.map((link) => (
                <Link key={link.to} to={link.to} className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">
                  {link.label}
                </Link>
              ))}
              <Link to="/palm-tree-maintenance-plans" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">
                Maintenance Plans
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Home</Link>
              <Link to="/jobs" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Jobs Completed</Link>
              <Link to="/about" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">About Us</Link>
              <Link to="/palm-trees/types" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Palm Tree Types</Link>
              <Link to="/palm-trees/buy" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Buy Palm Trees</Link>
              <Link to="/palm-tree-cost" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Palm Tree Cost</Link>
              <Link to="/referral" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Referral Program</Link>
              <Link to="/payments" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Payments</Link>
              <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">
                Leave Us a Review ⭐
              </a>
              <Link to="/terms-of-service" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Terms of Service</Link>
              <Link to="/privacy-policy" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">Privacy Policy</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Service Areas</h4>
            <nav className="flex flex-col gap-2">
              {locations.map((loc) => (
                <Link key={loc.slug} to={`/${loc.slug}`} className="font-body text-palm-sand/70 hover:text-palm-light transition-colors text-sm">
                  {loc.city}, {loc.state}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a
                href="tel:8509101290"
                onClick={() => trackEvent("call_now_click", { source: "footer", click_location: "footer" })}
                className="inline-flex items-center gap-2 font-body text-palm-sand/70 hover:text-palm-light transition-colors"
              >
                <Phone className="w-4 h-4" /> (850) 910-1290
              </a>
              <a href="sms:8509101290" className="inline-flex items-center gap-2 font-body text-palm-sand/70 hover:text-palm-light transition-colors">
                <MessageSquare className="w-4 h-4" /> Text Us a Photo
              </a>
              <p className="inline-flex items-start gap-2 font-body text-palm-sand/70">
                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                Serving the entire Emerald Coast
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-palm-green/20 text-center">
          <p className="font-body text-sm text-palm-sand/50">
            © {new Date().getFullYear()} Gulf Coast Palms. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
