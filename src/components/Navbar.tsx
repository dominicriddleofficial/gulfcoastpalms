import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Phone, MessageSquare, Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { locations } from "@/data/locations";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "Jobs Completed", to: "/jobs" },
  { label: "About", to: "/about" },
];

const palmTreeLinks = [
  { label: "Palm Tree Types", to: "/palm-trees/types" },
  { label: "Buy Palm Trees", to: "/palm-trees/buy" },
  { label: "Palm Care Guides", to: "/palm-trees/guides" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [palmsOpen, setPalmsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-20 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-primary">
            Gulf Coast <span className="text-palm-light">Palms</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary ${
                location.pathname === link.to
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Palm Trees Dropdown */}
          <div className="relative group">
            <Link
              to="/palm-trees/types"
              className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 ${
                location.pathname.includes("/palm-trees")
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Palm Trees
              <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[220px]">
                {palmTreeLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${
                      location.pathname === link.to
                        ? "text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Service Areas Dropdown */}
          <div className="relative group">
            <Link
              to="/service-areas"
              className={`font-body font-medium text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 ${
                location.pathname.includes("palm-tree-trimming") || location.pathname === "/service-areas"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Service Areas
              <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[220px]">
                {locations.map((loc) => (
                  <Link
                    key={loc.slug}
                    to={`/${loc.slug}`}
                    className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${
                      location.pathname === `/${loc.slug}`
                        ? "text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {loc.city}, {loc.state}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="tel:8509101290"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-palm-light transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Now
          </a>
          <a
            href="sms:8509101290"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-body font-semibold text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Text Us
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-background border-b border-border"
          >
            <nav className="flex flex-col items-center gap-4 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`font-body font-medium text-lg transition-colors hover:text-primary ${
                    location.pathname === link.to
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Palm Trees Accordion */}
              <button
                onClick={() => setPalmsOpen(!palmsOpen)}
                className={`font-body font-medium text-lg transition-colors hover:text-primary inline-flex items-center gap-1 ${
                  location.pathname.includes("/palm-trees") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Palm Trees
                <ChevronDown className={`w-4 h-4 transition-transform ${palmsOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {palmsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col items-center gap-2"
                  >
                    {palmTreeLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => { setIsOpen(false); setPalmsOpen(false); }}
                        className={`font-body text-sm transition-colors hover:text-primary ${
                          location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile Service Areas Accordion */}
              <button
                onClick={() => setAreasOpen(!areasOpen)}
                className={`font-body font-medium text-lg transition-colors hover:text-primary inline-flex items-center gap-1 ${
                  location.pathname.includes("palm-tree-trimming") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Service Areas
                <ChevronDown className={`w-4 h-4 transition-transform ${areasOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {areasOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col items-center gap-2"
                  >
                    {locations.map((loc) => (
                      <Link
                        key={loc.slug}
                        to={`/${loc.slug}`}
                        onClick={() => { setIsOpen(false); setAreasOpen(false); }}
                        className={`font-body text-sm transition-colors hover:text-primary ${
                          location.pathname === `/${loc.slug}` ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {loc.city}, {loc.state}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 mt-4">
                <a
                  href="tel:8509101290"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-body font-semibold"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href="sms:8509101290"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border-2 border-primary text-primary font-body font-semibold"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
