import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

interface QuoteRequestButtonProps {
  source?: string;
  variant?: "primary" | "secondary";
  className?: string;
  children?: ReactNode;
}

const variantClasses = {
  primary:
    "bg-primary text-primary-foreground hover:bg-palm-light shadow-lg shadow-primary/30",
  secondary:
    "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
} as const;

/**
 * Canonical "Get a Free Quote" CTA button. Always routes to /quote and
 * fires the cta_click GA event with a source label.
 */
const QuoteRequestButton = ({
  source = "unknown",
  variant = "primary",
  className = "",
  children,
}: QuoteRequestButtonProps) => (
  <Link
    to="/quote"
    onClick={() => {
      if (source === "hero") trackEvent("hero_cta_click", { source, cta_text: "quote_request" });
      else if (source.startsWith("service")) trackEvent("service_page_cta_click", { source, cta_text: "quote_request" });
      else if (source.startsWith("location") || source.startsWith("area")) trackEvent("location_page_cta_click", { source, cta_text: "quote_request" });
      trackEvent("cta_click", { source, cta_text: "quote_request" });
    }}
    className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-body font-bold text-base transition-all whitespace-nowrap ${variantClasses[variant]} ${className}`}
  >
    {children ?? "Get a Free Quote"}
    <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
  </Link>
);

export default QuoteRequestButton;