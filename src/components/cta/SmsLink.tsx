import { MessageSquare } from "lucide-react";
import { ReactNode } from "react";
import { SMS_HREF } from "@/lib/business-info";
import { trackEvent } from "@/lib/analytics";

interface SmsLinkProps {
  source?: string;
  withIcon?: boolean;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Standardized "text us" link. Always points at the central business
 * SMS number and fires the text_us_click GA event.
 */
const SmsLink = ({
  source = "unknown",
  withIcon = true,
  children,
  className,
  ariaLabel,
}: SmsLinkProps) => (
  <a
    href={SMS_HREF}
    onClick={() => trackEvent("text_us_click", { source })}
    className={className}
    aria-label={ariaLabel}
  >
    {withIcon && <MessageSquare className="w-4 h-4" aria-hidden="true" />}
    {children ?? "Text Us"}
  </a>
);

export default SmsLink;