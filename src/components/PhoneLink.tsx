import { Phone } from "lucide-react";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";
import { trackEvent } from "@/lib/analytics";

interface PhoneLinkProps {
  /** Tracking source label (e.g. "navbar", "footer") */
  source?: string;
  /** Show the leading phone icon */
  withIcon?: boolean;
  /** Override displayed text (defaults to formatted phone) */
  children?: React.ReactNode;
  className?: string;
  /** ARIA label for icon-only buttons */
  ariaLabel?: string;
}

/**
 * Standardized clickable phone link. Always points at the central
 * GCP_BUSINESS phone number and fires the call_now_click GA event.
 */
const PhoneLink = ({
  source = "unknown",
  withIcon = true,
  children,
  className,
  ariaLabel,
}: PhoneLinkProps) => (
  <a
    href={TEL_HREF}
    onClick={() => trackEvent("call_now_click", { source })}
    className={className}
    aria-label={ariaLabel}
  >
    {withIcon && <Phone className="w-4 h-4" aria-hidden="true" />}
    {children ?? GCP_BUSINESS.phoneDisplay}
  </a>
);

export default PhoneLink;