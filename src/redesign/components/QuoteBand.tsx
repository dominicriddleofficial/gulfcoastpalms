/**
 * Closing band on every rebuilt page: the three ways to get a quote, with texting a
 * photo spelled out because it is the quickest for most visitors.
 *
 * The photo steps restate the "text-a-photo" answer already in the site's FAQ.
 */
import { GCP_BUSINESS } from "@/lib/business-info";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon } from "../lib/icons";

interface QuoteBandProps {
  heading?: string;
  text?: string;
  /** Existing quote-form label to preselect, e.g. "Tree Removal". */
  service?: string;
  /** Service area to preselect, e.g. "Navarre, FL". */
  area?: string;
  textLabel?: string;
  /** Placement name for this band's buttons in the website report. */
  placement?: string;
  quoteLabel?: string;
}

export default function QuoteBand({
  heading = "Get a free quote",
  text = "Tell us about your trees or palms, your property and the work you have in mind.",
  service,
  area,
  textLabel = "Text a photo",
  placement = "bottom_cta",
  quoteLabel = "Get a Free Quote",
}: QuoteBandProps) {
  return (
    <section className="rd-quoteband rd-dark" aria-labelledby="rd-quoteband-title" data-rv="">
      <div className="rd-wrap rd-quoteband__grid">
        <div className="rd-stack rd-rise">
          <h2 id="rd-quoteband-title" className="rd-h2">{heading}</h2>
          <p className="rd-lead">{text}</p>
          <div className="rd-quoteband__main">
            <QuoteLink placement={placement} service={service} area={area} className="rd-btn rd-btn--go rd-btn--big">{quoteLabel}</QuoteLink>
            <CallLink placement={placement} className="rd-quoteband__phone">
              <PhoneIcon size={26} />
              {GCP_BUSINESS.phoneDisplay}
            </CallLink>
          </div>
        </div>
        <PhotoSteps placement={placement} textLabel={textLabel} className="rd-rise" />
      </div>
    </section>
  );
}

/** The three text-a-photo steps. Also shown beside the quote form on wide screens. */
export function PhotoSteps({ placement, textLabel = "Text a photo", className }: { placement: string; textLabel?: string; className?: string }) {
  return (
    <div className={className ? `rd-photosteps ${className}` : "rd-photosteps"}>
      <h3 className="rd-h3">Quickest: text us a photo</h3>
      <ol>
        <li>Stand back at a safe distance and take a photo of the tree or palm.</li>
        <li>Text it to {GCP_BUSINESS.phoneDisplay} with the property address and the work you need.</li>
        <li>We reply with a quote, or arrange an on-site look if the job needs one.</li>
      </ol>
      <TextLink placement={placement} className="rd-btn rd-btn--line">
        <CameraIcon size={18} />
        {textLabel}
      </TextLink>
      <p className="rd-small rd-muted">Keep clear of unstable trees and downed wires. Do not go closer for a better photo.</p>
    </div>
  );
}
