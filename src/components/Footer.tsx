import { Link } from "react-router-dom";
import { Phone, MessageSquare, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-palm-dark text-primary-foreground">
      <div className="container mx-auto section-padding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-display font-bold text-palm-light mb-4">
              Gulf Coast Palms
            </h3>
            <p className="font-body text-palm-sand/70 leading-relaxed">
              Professional palm tree services for Florida's Gulf Coast.
              Over 500 jobs completed with 5-star quality.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors">Home</Link>
              <Link to="/services" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors">Services</Link>
              <Link to="/about" className="font-body text-palm-sand/70 hover:text-palm-light transition-colors">About Us</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a href="tel:8509101290" className="inline-flex items-center gap-2 font-body text-palm-sand/70 hover:text-palm-light transition-colors">
                <Phone className="w-4 h-4" /> (850) 910-1290
              </a>
              <a href="sms:8509101290" className="inline-flex items-center gap-2 font-body text-palm-sand/70 hover:text-palm-light transition-colors">
                <MessageSquare className="w-4 h-4" /> Text Us
              </a>
              <p className="inline-flex items-start gap-2 font-body text-palm-sand/70">
                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                Serving Navarre, Fort Walton Beach, Destin, Pensacola & Gulf Breeze
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
