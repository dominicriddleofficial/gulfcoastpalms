/**
 * Opening block for the rebuilt inner pages: where you are, the page heading, one
 * sentence, and the three actions, next to a photo of the work.
 *
 * A large photo gets a tall frame. A small source photo is shown as a framed print at
 * its own size and the heading leads instead, so nothing is ever stretched. A page
 * with one job photographed in order opens with those frames in a row.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GCP_BUSINESS } from "@/lib/business-info";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon } from "../lib/icons";
import Photo, { type PhotoSource } from "./Photo";
import { SequenceFrames, type SequenceFrame } from "./Sequence";

interface Crumb { label: string; to?: string }

interface PageHeroProps {
  crumbs: Crumb[];
  title: string;
  lead?: string;
  photo?: { src: PhotoSource; alt: string; caption?: string; focus?: string; small?: boolean };
  /** One job in order, shown in place of a single photo. */
  frames?: { label: string; note: string; items: SequenceFrame[] };
  /** Existing quote-form label to preselect. */
  service?: string;
  placement: string;
  quoteLabel?: string;
  /** Service area to preselect on the quote form, e.g. "Navarre, FL". */
  area?: string;
  tone?: "green" | "coal";
  children?: ReactNode;
}

export default function PageHero({ crumbs, title, lead, photo, frames, service, area, placement, quoteLabel, tone = "green", children }: PageHeroProps) {
  const layout = frames ? "frames" : !photo ? "plain" : photo.small ? "print" : "photo";
  return (
    <section className={`rd-phero rd-phero--${layout} ${tone === "coal" ? "rd-coal" : "rd-dark"}`}>
      <div className="rd-phero__text">
        <nav aria-label="Breadcrumb" className="rd-crumbs">
          <ol>
            {crumbs.map((c, i) => (
              <li key={c.label} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="rd-h1">{title}</h1>
        {lead && <p className="rd-lead rd-phero__lead">{lead}</p>}
        {children}
        <div className="rd-phero__actions" data-rd-actions>
          <QuoteLink placement={placement} service={service} area={area} className="rd-btn rd-btn--go">{quoteLabel}</QuoteLink>
          <CallLink placement={placement} className="rd-btn rd-btn--line" ariaLabel={`Call ${GCP_BUSINESS.phoneDisplay}`}>
            <PhoneIcon size={18} />
            <span>Call<span className="rd-phero__num"> {GCP_BUSINESS.phoneDisplay}</span></span>
          </CallLink>
          <TextLink placement={placement} className="rd-btn rd-btn--line">
            <CameraIcon size={18} />
            Text a photo
          </TextLink>
        </div>
        {/* What the photo shows, in words, under the buttons where it never covers the picture. */}
        {photo && layout === "photo" && photo.caption && <p className="rd-phero__cap">Photo: {photo.caption}</p>}
      </div>
      {photo && layout === "photo" && (
        <div className="rd-phero__photo">
          <Photo src={photo.src} alt={photo.alt} focus={photo.focus} sizes="(min-width: 1000px) 52vw, 100vw" eager />
        </div>
      )}
      {frames && (
        <div className="rd-phero__frames">
          <SequenceFrames frames={frames.items} label={frames.label} eager />
          <p className="rd-small rd-phero__note">{frames.note}</p>
        </div>
      )}
      {photo && layout === "print" && (
        <figure className="rd-print rd-phero__print">
          <Photo src={photo.src} alt={photo.alt} sizes="(min-width: 1000px) 32rem, 92vw" eager />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      )}
    </section>
  );
}
