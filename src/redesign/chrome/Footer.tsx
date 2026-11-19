/**
 * Footer. Carries every link the current footer has (all services, all 14 city pages,
 * company and legal pages), because those links are part of the site's local SEO.
 */
import { Link } from "react-router-dom";
import { GOOGLE_REVIEW_URL, aggregateRating } from "@/data/reviews";
import { GCP_BUSINESS } from "@/lib/business-info";
import { coastAreas, companyLinks, legalLinks, palmServices, propertyServices, treeServices, type NavItem } from "../data/nav";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon } from "../lib/icons";

const list = (items: NavItem[]) => items.map((i) => <li key={i.to}><Link to={i.to}>{i.label}</Link></li>);

export default function Footer() {
  return (
    <footer className="rd-ft rd-dark">
      <div className="rd-wrap">
        <div className="rd-ft__top">
          <div className="rd-ft__brand">
            <span className="rd-ft__mark" aria-hidden />
            <p className="rd-ft__name">Gulf Coast Palms</p>
            <p className="rd-ft__line">
              Tree services and palm care for Florida's Gulf Coast. Over a thousand properties served across the
              Emerald Coast, with {aggregateRating.count} Google reviews.
            </p>
          </div>
          <div className="rd-ft__contact">
            <QuoteLink placement="footer" className="rd-btn rd-btn--go" />
            <CallLink placement="footer" className="rd-ft__phone">
              <PhoneIcon size={20} />
              {GCP_BUSINESS.phoneDisplay}
            </CallLink>
            <TextLink placement="footer" className="rd-ft__text">
              <CameraIcon size={18} />
              Text us a photo
            </TextLink>
            <p className="rd-small rd-muted">Serving the entire Emerald Coast</p>
          </div>
        </div>

        <div className="rd-ft__cols">
          <nav aria-label="Tree services">
            <h2 className="rd-ft__head">Tree services</h2>
            <ul>{list(treeServices)}</ul>
            <h2 className="rd-ft__head rd-ft__head--gap">Property services</h2>
            <ul>{list(propertyServices)}</ul>
          </nav>
          <nav aria-label="Palm services">
            <h2 className="rd-ft__head">Palm services</h2>
            <ul>{list(palmServices)}</ul>
          </nav>
          <nav aria-label="Service areas">
            <h2 className="rd-ft__head">Service areas</h2>
            <ul className="rd-ft__two">
              {coastAreas.map((a) => <li key={a.to}><Link to={a.to}>{a.city}, FL</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="rd-ft__head">Company</h2>
            <ul>
              {list(companyLinks)}
              <li><a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">Leave us a review</a></li>
            </ul>
          </nav>
        </div>

        <div className="rd-ft__base">
          <p>© {new Date().getFullYear()} Gulf Coast Palms. All rights reserved.</p>
          <ul>{list(legalLinks)}</ul>
        </div>
      </div>
    </footer>
  );
}
