import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Phone, MessageSquare, Menu, ChevronDown, ArrowRight } from "lucide-react";
import { locations } from "@/data/locations";
import { serviceNavLinks } from "@/data/services";
import { PHONE_NUMBER_TEL, PHONE_NUMBER_DISPLAY, SMS_NUMBER } from "@/data/contact";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { trackEvent } from "@/lib/analytics";
import { prefetchOnHover } from "@/lib/route-prefetch";

const learnLinks = [
  { label: "Palm Care Guides", to: "/learn" },
  { label: "Palm Tree Types", to: "/palm-trees/types" },
  { label: "Care Guides (Legacy)", to: "/palm-trees/guides" },
  { label: "Palm Tree Cost Guide", to: "/palm-tree-cost" },
  { label: "Hurricane Prep Guide", to: "/hurricane-palm-preparation" },
];

const Navbar = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeAll = () => {
    setSheetOpen(false);
    setServicesOpen(false);
    setAreasOpen(false);
    setLearnOpen(false);
  };

  const trackMenuLink = (label: string) => {
    trackEvent("mobile_menu_link_clicked", { source: "mobile_menu", cta_text: label });
    closeAll();
  };

  const toggleOne = (setter: React.Dispatch<React.SetStateAction<boolean>>, others: React.Dispatch<React.SetStateAction<boolean>>[]) => {
    setter((prev) => {
      const next = !prev;
      if (next) others.forEach((s) => s(false));
      return next;
    });
  };

  const topAreas = locations.slice(0, 6);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border transition-[height,box-shadow] duration-200 ${scrolled ? "shadow-sm" : ""}`}>
      <div className={`container mx-auto flex items-center justify-between px-4 lg:px-8 transition-[height] duration-200 ${scrolled ? "h-14 lg:h-16" : "h-16 lg:h-20"}`}>
        <Link to="/" className="flex items-center gap-2">
          <span className={`font-display font-bold text-primary transition-all ${scrolled ? "text-xl" : "text-2xl"}`}>
            Gulf Coast <span className="text-palm-light">Palms</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
          <Link to="/" className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}>
            Home
          </Link>

          {/* Services Dropdown */}
          <div className="relative group">
            <Link to="/services" className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 ${location.pathname.startsWith("/services") ? "text-primary" : "text-muted-foreground"}`}>
              Services <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[260px]">
                {serviceNavLinks.map((link) => (
                  <Link key={link.to} to={link.to} {...prefetchOnHover(link.to)} className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === link.to ? "text-primary font-semibold" : "text-foreground"}`}>
                    {link.label}
                  </Link>
                ))}
                <Link to="/palm-tree-maintenance-plans" {...prefetchOnHover("/palm-tree-maintenance-plans")} className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === "/palm-tree-maintenance-plans" ? "text-primary font-semibold" : "text-foreground"}`}>
                  Maintenance Plans
                </Link>
              </div>
            </div>
          </div>

          <Link to="/jobs" className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/jobs" ? "text-primary" : "text-muted-foreground"}`}>
            Jobs Completed
          </Link>

          {/* Learn Dropdown */}
          <div className="relative group">
            <span className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 cursor-pointer ${["/palm-trees", "/palm-tree-cost", "/hurricane-palm-preparation"].some((p) => location.pathname.startsWith(p)) ? "text-primary" : "text-muted-foreground"}`}>
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

          <Link to="/palm-trees/buy" className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/palm-trees/buy" ? "text-primary" : "text-muted-foreground"}`}>
            Buy Palm Trees
          </Link>

          {/* Service Areas Dropdown */}
          <div className="relative group">
            <Link to="/service-areas" className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary inline-flex items-center gap-1 ${location.pathname.includes("palm-tree-trimming") || location.pathname === "/service-areas" ? "text-primary" : "text-muted-foreground"}`}>
              Service Areas <ChevronDown className="w-3.5 h-3.5" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-card border border-border rounded-xl shadow-xl py-2 min-w-[220px] max-h-[60vh] overflow-y-auto">
                {locations.map((loc) => (
                  <Link key={loc.slug} to={`/${loc.slug}`} {...prefetchOnHover(`/${loc.slug}`)} className={`block px-4 py-2.5 font-body text-sm hover:bg-secondary transition-colors ${location.pathname === `/${loc.slug}` ? "text-primary font-semibold" : "text-foreground"}`}>
                    {loc.city}, {loc.state}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link to="/about" className={`whitespace-nowrap font-body font-medium text-[13px] xl:text-sm uppercase tracking-wider transition-colors hover:text-primary ${location.pathname === "/about" ? "text-primary" : "text-muted-foreground"}`}>
            About
          </Link>
        </nav>

        {/* CTA buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <a
            href={SMS_NUMBER}
            onClick={() => trackEvent("text_us_click", { source: "navbar" })}
            className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-primary font-body font-semibold text-[13px] hover:bg-primary/10 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Text a Photo
          </a>
          <a
            href={PHONE_NUMBER_TEL}
            onClick={() => trackEvent("call_now_click", { source: "navbar" })}
            className="whitespace-nowrap inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body font-semibold text-[13px] hover:bg-palm-light shadow-brand transition-all"
          >
            <Phone className="w-4 h-4" /> {PHONE_NUMBER_DISPLAY}
          </a>
        </div>

        {/* Mobile: phone icon + Sheet menu */}
        <div className="lg:hidden flex items-center gap-2">
          <a
            href={PHONE_NUMBER_TEL}
            onClick={() => trackEvent("call_now_click", { source: "navbar_mobile" })}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-primary text-primary-foreground"
            aria-label={`Call ${PHONE_NUMBER_DISPLAY}`}
          >
            <Phone className="w-5 h-5" />
          </a>
          <a
            href={SMS_NUMBER}
            onClick={() => trackEvent("text_us_click", { source: "navbar_mobile" })}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border-2 border-primary text-primary"
            aria-label="Text us a photo"
          >
            <MessageSquare className="w-5 h-5" />
          </a>
          <Sheet open={sheetOpen} onOpenChange={(o) => {
            setSheetOpen(o);
            if (o) trackEvent("mobile_menu_opened", { source: "navbar" });
          }}>
            <SheetTrigger asChild>
              <button
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-foreground rounded-lg"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88%] max-w-sm bg-background p-0 flex flex-col">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

              {/* Scrollable section list */}
              <nav className="flex-1 overflow-y-auto px-4 py-5">
                {/* Main */}
                <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 mb-2">Main</p>
                <ul className="mb-5">
                  <li>
                    <Link to="/" onClick={() => trackMenuLink("Home")} className={`block px-2 py-2.5 rounded-md font-body text-base ${location.pathname === "/" ? "text-primary font-semibold" : "text-foreground"}`}>Home</Link>
                  </li>
                  <li>
                    <Link to="/about" onClick={() => trackMenuLink("About")} className={`block px-2 py-2.5 rounded-md font-body text-base ${location.pathname === "/about" ? "text-primary font-semibold" : "text-foreground"}`}>About</Link>
                  </li>
                  <li>
                    <Link to="/jobs" onClick={() => trackMenuLink("Jobs")} className={`block px-2 py-2.5 rounded-md font-body text-base ${location.pathname === "/jobs" ? "text-primary font-semibold" : "text-foreground"}`}>Jobs Completed</Link>
                  </li>
                  <li>
                    <Link to="/palm-trees/buy" onClick={() => trackMenuLink("Buy Palm Trees")} className={`block px-2 py-2.5 rounded-md font-body text-base ${location.pathname === "/palm-trees/buy" ? "text-primary font-semibold" : "text-foreground"}`}>Buy Palm Trees</Link>
                  </li>
                </ul>

                {/* Services */}
                <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 mb-2">Services</p>
                <button
                  type="button"
                  onClick={() => toggleOne(setServicesOpen, [setAreasOpen, setLearnOpen])}
                  aria-expanded={servicesOpen}
                  aria-controls="mobile-services-panel"
                  className={`w-full flex items-center justify-between px-2 py-2.5 rounded-md font-body text-base ${location.pathname.startsWith("/services") ? "text-primary font-semibold" : "text-foreground"}`}
                >
                  <span>All Services</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
                </button>
                {servicesOpen && (
                  <ul id="mobile-services-panel" className="max-h-[40vh] overflow-y-auto pl-3 border-l border-border ml-2 mb-3">
                    <li>
                      <Link to="/services" onClick={() => trackMenuLink("All services")} className="block px-2 py-2 font-body text-sm text-foreground/90 hover:text-primary">View all services</Link>
                    </li>
                    {serviceNavLinks.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} onClick={() => trackMenuLink(link.label)} className={`block px-2 py-2 font-body text-sm hover:text-primary ${location.pathname === link.to ? "text-primary font-semibold" : "text-foreground/90"}`}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link to="/palm-tree-maintenance-plans" onClick={() => trackMenuLink("Maintenance Plans")} className="block px-2 py-2 font-body text-sm text-foreground/90 hover:text-primary">Maintenance Plans</Link>
                    </li>
                  </ul>
                )}

                {/* Learn */}
                <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 mt-2 mb-2">Learn</p>
                <button
                  type="button"
                  onClick={() => toggleOne(setLearnOpen, [setServicesOpen, setAreasOpen])}
                  aria-expanded={learnOpen}
                  aria-controls="mobile-learn-panel"
                  className="w-full flex items-center justify-between px-2 py-2.5 rounded-md font-body text-base text-foreground"
                >
                  <span>Guides &amp; Resources</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${learnOpen ? "rotate-180" : ""}`} />
                </button>
                {learnOpen && (
                  <ul id="mobile-learn-panel" className="max-h-[40vh] overflow-y-auto pl-3 border-l border-border ml-2 mb-3">
                    {learnLinks.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} onClick={() => trackMenuLink(link.label)} className={`block px-2 py-2 font-body text-sm hover:text-primary ${location.pathname === link.to ? "text-primary font-semibold" : "text-foreground/90"}`}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Service Areas */}
                <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 mt-2 mb-2">Service Areas</p>
                <button
                  type="button"
                  onClick={() => toggleOne(setAreasOpen, [setServicesOpen, setLearnOpen])}
                  aria-expanded={areasOpen}
                  aria-controls="mobile-areas-panel"
                  className="w-full flex items-center justify-between px-2 py-2.5 rounded-md font-body text-base text-foreground"
                >
                  <span>Where We Serve</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${areasOpen ? "rotate-180" : ""}`} />
                </button>
                {areasOpen && (
                  <ul id="mobile-areas-panel" className="max-h-[40vh] overflow-y-auto pl-3 border-l border-border ml-2 mb-3">
                    {topAreas.map((loc) => (
                      <li key={loc.slug}>
                        <Link to={`/${loc.slug}`} onClick={() => trackMenuLink(`${loc.city}, ${loc.state}`)} className={`block px-2 py-2 font-body text-sm hover:text-primary ${location.pathname === `/${loc.slug}` ? "text-primary font-semibold" : "text-foreground/90"}`}>
                          {loc.city}, {loc.state}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link to="/service-areas" onClick={() => trackMenuLink("All service areas")} className="inline-flex items-center gap-1 px-2 py-2 font-body text-sm font-semibold text-primary hover:underline">
                        View all service areas <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </li>
                  </ul>
                )}

                {/* Contact */}
                <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 mt-2 mb-2">Contact</p>
                <ul>
                  <li>
                    <Link to="/emergency-palm-service" onClick={() => trackMenuLink("Emergency")} className="block px-2 py-2.5 rounded-md font-body text-base text-foreground">Emergency Service</Link>
                  </li>
                  <li>
                    <Link to="/referral" onClick={() => trackMenuLink("Referral")} className="block px-2 py-2.5 rounded-md font-body text-base text-foreground">Referral Program</Link>
                  </li>
                </ul>
              </nav>

              {/* Pinned CTAs */}
              <div className="border-t border-border p-4 flex flex-col gap-2.5 bg-background">
                <Link
                  to="/quote"
                  onClick={() => trackMenuLink("Get a Free Quote")}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-body font-semibold"
                >
                  Get a Free Quote <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={PHONE_NUMBER_TEL}
                    onClick={() => { trackEvent("call_now_click", { source: "mobile_menu" }); closeAll(); }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-primary text-primary font-body font-semibold text-sm"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>
                  <a
                    href={SMS_NUMBER}
                    onClick={() => { trackEvent("text_us_click", { source: "mobile_menu" }); closeAll(); }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-primary text-primary font-body font-semibold text-sm"
                  >
                    <MessageSquare className="w-4 h-4" /> Text
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
