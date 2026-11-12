import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { serviceGroups } from "@/data/services";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";
import QuoteRequestButton from "@/components/cta/QuoteRequestButton";

const primary = [
  { label: "Tree Services", to: "/services/tree-trimming-removal" },
  { label: "Palm Care", to: "/services/palm-tree-trimming" },
  { label: "Service Areas", to: "/service-areas" },
  { label: "About", to: "/about" },
];

/** Compact header scoped to the cinematic preview; the shared Navbar is untouched. */
const CinematicHeader = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-palm-dark/95 backdrop-blur border-b border-palm-sand/10">
      <div className="container mx-auto px-5 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
        <Link to="/" className="font-display text-lg md:text-xl font-bold text-palm-sand">
          Gulf Coast <span className="text-palm-light">Palms</span>
        </Link>
        <nav aria-label="Main" className="hidden lg:flex items-center gap-7">
          {primary.map((l) => (
            <Link key={l.to} to={l.to} className="font-body text-sm text-palm-sand/80 hover:text-primary-foreground">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={TEL_HREF} data-track-placement="header" aria-label={`Call ${GCP_BUSINESS.phoneDisplay}`}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-palm-sand/25 text-palm-sand font-body text-sm font-semibold hover:border-palm-light">
            <Phone className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">{GCP_BUSINESS.phoneDisplay}</span>
          </a>
          <QuoteRequestButton source="header" className="hidden md:inline-flex !py-2.5 !text-sm">Free Quote</QuoteRequestButton>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg text-palm-sand" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetTitle className="font-display">Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-4 space-y-5">
                {serviceGroups.map((g) => (
                  <div key={g.label}>
                    <p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">{g.label}</p>
                    <ul className="space-y-2">
                      {g.links.map((l) => (
                        <li key={l.to}><Link to={l.to} onClick={() => setOpen(false)} className="font-body text-sm">{l.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                ))}
                <ul className="space-y-2 border-t pt-4">
                  {primary.slice(2).map((l) => (
                    <li key={l.to}><Link to={l.to} onClick={() => setOpen(false)} className="font-body text-sm">{l.label}</Link></li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default CinematicHeader;
