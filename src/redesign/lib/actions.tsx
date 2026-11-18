/**
 * The three ways a visitor reaches the office: quote form, call, text a photo.
 *
 * These carry the same tracking attributes the current site uses, so the one
 * site-wide click handler (handleTrackedClick in src/lib/analytics.ts) keeps
 * recording each tap exactly once under the same names:
 *   - quote links:  data-track-cta="quote_request" + data-track-placement
 *   - call / text:  a tel: or sms: address + data-track-placement
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GCP_BUSINESS, SMS_HREF, TEL_HREF } from "@/lib/business-info";
import { quotePath } from "./quote-path";

interface ActionProps {
  /** Where the button sits on the page; shows up in the owner's website report. */
  placement: string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

interface QuoteLinkProps extends ActionProps {
  /** Existing quote-form label to preselect, e.g. "Tree Removal". */
  service?: string;
  /** Service area to preselect, written as the form lists it, e.g. "Navarre, FL". */
  area?: string;
}

export function QuoteLink({ placement, service, area, className, children, onClick }: QuoteLinkProps) {
  return (
    <Link
      to={quotePath(service, placement, area ? { location: area } : undefined)}
      data-track-cta="quote_request"
      data-track-placement={placement}
      className={className}
      onClick={onClick}
    >
      {children ?? "Get a Free Quote"}
    </Link>
  );
}

export function CallLink({ placement, className, children, onClick, ariaLabel }: ActionProps) {
  return (
    <a href={TEL_HREF} data-track-placement={placement} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children ?? `Call ${GCP_BUSINESS.phoneDisplay}`}
    </a>
  );
}

export function TextLink({ placement, className, children, onClick, ariaLabel }: ActionProps) {
  return (
    <a href={SMS_HREF} data-track-placement={placement} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children ?? "Text a photo"}
    </a>
  );
}
