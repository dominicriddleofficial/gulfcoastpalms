import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { GCP_BUSINESS } from "@/lib/business-info";
import Layout from "../chrome/Layout";
import { CallLink, TextLink } from "../lib/actions";
import { CameraIcon, CheckIcon, PhoneIcon } from "../lib/icons";

/** Shown after a quote request is sent. Same message and noindex setting as the current page. */
export default function ThankYou() {
  return (
    <Layout>
      <SEOHead
        title="Thank You | Gulf Coast Palms"
        description="Thank you for contacting Gulf Coast Palms. A member of our team will be in touch shortly to discuss your palm tree service needs."
        canonicalUrl="/thank-you"
        noIndex
      />
      <section className="rd-thanks rd-dark">
        <div className="rd-wrap rd-stack">
          <span className="rd-thanks__tick" aria-hidden><CheckIcon size={30} /></span>
          <h1 className="rd-h1">Thank You!</h1>
          <p className="rd-lead">
            We've received your request and will get back to you shortly. Our team typically responds within 15
            minutes during business hours.
          </p>
          <p className="rd-copy rd-muted">
            Want to speed things up? Text us a photo of the tree or palm, taken from a safe distance.
          </p>
          <div className="rd-actions" data-rd-actions>
            <TextLink placement="thank_you" className="rd-btn rd-btn--paper">
              <CameraIcon size={18} />
              Text a photo
            </TextLink>
            <CallLink placement="thank_you" className="rd-btn rd-btn--line">
              <PhoneIcon size={18} />
              Call Now: {GCP_BUSINESS.phoneDisplay}
            </CallLink>
            <Link to="/" className="rd-link">Back to Home</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
