import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Phone, MessageSquare, Menu, X, ChevronDown } from "lucide-react";
import { locations } from "@/data/locations";
import { serviceNavLinks } from "@/data/services";
import { PHONE_NUMBER_TEL, PHONE_NUMBER_DISPLAY, SMS_NUMBER } from "@/data/contact";

const palmTreeLinks = [
  { label: "Palm Tree Types", to: "/palm-trees/types" },
  { label: "Palm Care Guides", to: "/palm-trees/guides" },
];

const learnLinks = [
  { label: "Palm Tree Types", to: "/palm-trees/types" },
  { label: "Care Guides", to: "/palm-trees/guides" },
  { label: "Palm Tree Cost Guide", to: "/palm-tree-cost" },
  { label: "Hurricane Prep Guide", to: "/hurricane-palm-preparation" },
  { label: "Buy Palm Trees", to: "/palm-trees/buy" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [palmsOpen, setPalmsOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const location = useLocation();

  const closeAll = () => {
    setIsOpen(false);
    setServicesOpen(false);
    setAreasOpen(false);
    setPalmsOpen(false);
    setLearnOpen(false);
  };

  const toggleOne = (setter: React.Dispatch<React.SetStateAction<boolean>>, others: React.Dispatch<React.SetStateAction<boolean>>[]) => {
    setter((prev) => {
      const next = !prev;
      if (next) others.forEach((s) => s(false));
      return next;
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-20 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-primary">
            Gulf Coast <span className="text-palm-light">Palms</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-5">
          <Link to="/" className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}>
            Home
          </Link>

          {/* Services Dropdown */}
          <div className="relative group">
            <Link to="/services" className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 ${location.pathname.startsWith("/services") ? "text-primary" : "text-muted-foreground"}`}>
              Services <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[260px]">
                {serviceNavLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === link.to ? "text-primary font-semibold" : "text-foreground"}`}>
                    {link.label}
                  </Link>
                ))}
                <Link to="/palm-tree-maintenance-plans" className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === "/palm-tree-maintenance-plans" ? "text-primary font-semibold" : "text-foreground"}`}>
                  Maintenance Plans
                </Link>
              </div>
            </div>
          </div>

          <Link to="/jobs" className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/jobs" ? "text-primary" : "text-muted-foreground"}`}>
            Jobs Completed
          </Link>

          {/* Learn Dropdown */}
          <div className="relative group">
            <span className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 cursor-pointer ${["/palm-trees", "/palm-tree-cost", "/hurricane-palm-preparation"].some((p) => location.pathname.startsWith(p)) ? "text-primary" : "text-muted-foreground"}`}>
              Learn <ChevronDown className="w-3.5 h-3.5" />
            </span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[240px]">
                {learnLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === link.to ? "text-primary font-semibold" : "text-foreground"}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Service Areas Dropdown */}
          <div className="relative group">
            <Link to="/service-areas" className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 ${location.pathname.includes("palm-tree-trimming") || location.pathname === "/service-areas" ? "text-primary" : "text-muted-foreground"}`}>
              Service Areas <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[220px] max-h-[60vh] overflow-y-auto">
                {locations.map((loc) => (
                  <Link key={loc.slug} to={`/${loc.slug}`} className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === `/${loc.slug}` ? "text-primary font-semibold" : "text-foreground"}`}>
                    {loc.city}, {loc.state}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link to="/about" className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/about" ? "text-primary" : "text-muted-foreground"}`}>
            About
          </Link>
        </nav>

        {/* CTA buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <a href={PHONE_NUMBER_TEL} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-palm-light transition-colors">
            <Phone className="w-4 h-4" /> {PHONE_NUMBER_DISPLAY}
          </a>
          <a href={SMS_NUMBER} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-body font-semibold text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
            <MessageSquare className="w-4 h-4" /> Text Us a Photo
          </a>
        </div>

        {/* Mobile: phone icon + menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <a href={PHONE_NUMBER_TEL} className="p-2 rounded-lg bg-primary text-primary-foreground" aria-label="Call Gulf Coast Palms">
            <Phone className="w-5 h-5" />
          </a>
          <button className="text-foreground p-2" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-background border-b border-border animate-fade-in">
          <nav className="flex flex-col items-center gap-4 py-6 max-h-[75vh] overflow-y-auto">
            <Link to="/" onClick={closeAll} className={`font-body font-medium text-lg transition-colors hover:text-primary ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}>
              Home
            </Link>

            {/* Mobile Services */}
            <button onClick={() => toggleOne(setServicesOpen, [setPalmsOpen, setAreasOpen, setLearnOpen])} className={`font-body font-medium text-lg transition-colors hover:text-primary inline-flex items-center gap-1 ${location.pathname.startsWith("/services") ? "text-primary" : "text-muted-foreground"}`}>
              Services <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
            </button>
            {servicesOpen && (
              <div className="flex flex-col items-center gap-2 w-full px-4">
                {serviceNavLinks.map((link) => (
                  <Link key={link.to} to={link.to} onClick={closeAll} className={`font-body text-sm transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            <Link to="/jobs" onClick={closeAll} className={`font-body font-medium text-lg transition-colors hover:text-primary ${location.pathname === "/jobs" ? "text-primary" : "text-muted-foreground"}`}>
              Jobs Completed
            </Link>

            {/* Mobile Learn */}
            <button onClick={() => toggleOne(setLearnOpen, [setServicesOpen, setPalmsOpen, setAreasOpen])} className={`font-body font-medium text-lg transition-colors hover:text-primary inline-flex items-center gap-1 ${["/palm-trees", "/palm-tree-cost", "/hurricane-palm-preparation"].some((p) => location.pathname.startsWith(p)) ? "text-primary" : "text-muted-foreground"}`}>
              Learn <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${learnOpen ? "rotate-180" : ""}`} />
            </button>
            {learnOpen && (
              <div className="flex flex-col items-center gap-2 w-full px-4">
                {learnLinks.map((link) => (
                  <Link key={link.to} to={link.to} onClick={closeAll} className={`font-body text-sm transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile Service Areas */}
            <button onClick={() => toggleOne(setAreasOpen, [setServicesOpen, setPalmsOpen, setLearnOpen])} className={`font-body font-medium text-lg transition-colors hover:text-primary inline-flex items-center gap-1 ${location.pathname.includes("palm-tree-trimming") ? "text-primary" : "text-muted-foreground"}`}>
              Service Areas <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${areasOpen ? "rotate-180" : ""}`} />
            </button>
            {areasOpen && (
              <div className="flex flex-col items-center gap-2 w-full px-4">
                {locations.map((loc) => (
                  <Link key={loc.slug} to={`/${loc.slug}`} onClick={closeAll} className={`font-body text-sm transition-colors hover:text-primary ${location.pathname === `/${loc.slug}` ? "text-primary" : "text-muted-foreground"}`}>
                    {loc.city}, {loc.state}
                  </Link>
                ))}
              </div>
            )}

            <Link to="/about" onClick={closeAll} className={`font-body font-medium text-lg transition-colors hover:text-primary ${location.pathname === "/about" ? "text-primary" : "text-muted-foreground"}`}>
              About
            </Link>

            <div className="flex flex-col gap-3 mt-4 w-full max-w-xs">
              <a href={SMS_NUMBER} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-body font-semibold">
                <MessageSquare className="w-4 h-4" /> Text Us a Photo for Instant Quote
              </a>
              <a href={PHONE_NUMBER_TEL} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 border-primary text-primary font-body font-semibold">
                <Phone className="w-4 h-4" /> Call {PHONE_NUMBER_DISPLAY}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
