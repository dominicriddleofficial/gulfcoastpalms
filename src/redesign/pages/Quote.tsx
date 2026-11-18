/**
 * Rebuilt quote page, laid out to be filled in with one thumb.
 *
 * What it sends is unchanged. It calls the same submitLead() as the current page with
 * the same fields, the same "quote_request_page" source, the same honeypot and timing
 * check, and the same service and area values, so leads land in the CRM exactly as
 * they do today and the same analytics events fire (quote_request_started on first
 * input, lead_form_submit from submitLead on success).
 *
 * New: a `location` address parameter preselects the service area (city pages use it),
 * and errors are shown next to the submit button instead of in a pop-up.
 */
import { useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { PHONE_NUMBER_DISPLAY } from "@/data/contact";
import { locations } from "@/data/locations";
import { publicMarketing } from "@/data/publicMarketing";
import { serviceNavLinks } from "@/data/services";
import { trackEvent } from "@/lib/analytics";
import { submitLead } from "@/lib/submit-lead";
import Layout from "../chrome/Layout";
import { PhotoSteps } from "../components/QuoteBand";
import { CallLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon } from "../lib/icons";

const SERVICE_LABELS = [...serviceNavLinks.map((s) => s.label), "Other / Not sure"];
const AREA_LABELS = [...locations.map((l) => `${l.city}, ${l.state}`), "Other"];

export default function Quote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renderTime = useRef(Date.now());
  const started = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askedService = searchParams.get("service") || "";
  const askedArea = searchParams.get("location") || "";
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    service: askedService,
    location: AREA_LABELS.includes(askedArea) ? askedArea : "",
    message: searchParams.get("message") || "",
    website: "", // honeypot
  });
  // A link may name a service that is not in the list (the Commercial page does); keep it selectable.
  const serviceOptions = askedService && !SERVICE_LABELS.includes(askedService) ? [askedService, ...SERVICE_LABELS] : SERVICE_LABELS;

  const update = (key: keyof typeof form, val: string) => {
    if (key !== "website" && !started.current) {
      started.current = true;
      trackEvent("quote_request_started", { source: searchParams.get("source") || "quote_page" });
    }
    setForm((f) => ({ ...f, [key]: val }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const composedMessage = [form.address ? `Address: ${form.address}` : null, form.message || null]
      .filter(Boolean)
      .join("\n");

    const result = await submitLead({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      service: form.service || undefined,
      location: form.location || undefined,
      message: composedMessage || undefined,
      source: "quote_request_page",
      website: form.website,
      formRenderTime: renderTime.current,
    });

    if (result.success) {
      // The single successful-submit event is recorded by submitLead.
      navigate("/thank-you");
    } else {
      setError(result.error || "Please try again or call us directly.");
      setSubmitting(false);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  };

  return (
    <Layout dock={false} chat={false}>
      <SEOHead
        title="Get a Free Tree Service & Palm Care Quote | Gulf Coast Palms"
        description="Request a free quote for tree removal, tree trimming, storm cleanup or palm care across the Emerald Coast. Call or text (850) 910-1290."
        canonicalUrl="/quote"
      />
      <section className="rd-quote-top rd-dark">
        <div className="rd-wrap rd-quote-top__in">
          <h1 className="rd-h1">Get a Free Quote</h1>
          <p className="rd-lead">{publicMarketing.quoteText}</p>
          <div className="rd-quote-fast">
            <p><b>In a hurry?</b> Text a photo from a safe distance, or call.</p>
            <div>
              <TextLink placement="quote_page" className="rd-btn rd-btn--line">
                <CameraIcon size={18} />
                Text a photo
              </TextLink>
              <CallLink placement="quote_page" className="rd-btn rd-btn--line">
                <PhoneIcon size={18} />
                {PHONE_NUMBER_DISPLAY}
              </CallLink>
            </div>
          </div>
        </div>
      </section>

      <section className="rd-section rd-section--tight">
        <div className="rd-wrap rd-quote-cols">
        <form className="rd-form" onSubmit={onSubmit} aria-label="Quote request">
          {/* Honeypot: hidden from people, must stay empty. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} className="rd-form__trap" aria-hidden="true" />

          <fieldset>
            <legend className="rd-h3 rd-h3--big">The work</legend>
            <div className="rd-field">
              <label htmlFor="q-service">Service needed</label>
              <select id="q-service" value={form.service} onChange={(e) => update("service", e.target.value)}>
                <option value="">Select a service</option>
                {serviceOptions.map((label) => <option key={label} value={label}>{label}</option>)}
              </select>
            </div>
            <div className="rd-field">
              <label htmlFor="q-location">Service area</label>
              <select id="q-location" value={form.location} onChange={(e) => update("location", e.target.value)}>
                <option value="">Select your area</option>
                {locations.map((loc) => {
                  const label = `${loc.city}, ${loc.state}`;
                  return <option key={loc.slug} value={label}>{label}</option>;
                })}
                <option value="Other">Other / Not listed</option>
              </select>
            </div>
            <div className="rd-field rd-field--wide">
              <label htmlFor="q-message">Tell us about your trees or palms</label>
              <textarea
                id="q-message"
                rows={4}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Tree or palm species, work needed, approximate size, access notes…"
              />
              <p className="rd-field__hint">
                A photo helps. Text one from a safe distance to{" "}
                <TextLink placement="quote_page" className="rd-link">{PHONE_NUMBER_DISPLAY}</TextLink>.
              </p>
            </div>
            <div className="rd-field rd-field--wide">
              <label htmlFor="q-address">Property address <span>(optional)</span></label>
              <input id="q-address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, Navarre, FL" autoComplete="street-address" enterKeyHint="next" />
            </div>
          </fieldset>

          <fieldset>
            <legend className="rd-h3 rd-h3--big">How to reach you</legend>
            <div className="rd-field">
              <label htmlFor="q-name">Name <span aria-hidden>*</span></label>
              <input id="q-name" required value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" autoCapitalize="words" enterKeyHint="next" />
            </div>
            <div className="rd-field">
              <label htmlFor="q-phone">Phone <span aria-hidden>*</span></label>
              <input id="q-phone" type="tel" inputMode="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" enterKeyHint="next" />
            </div>
            <div className="rd-field rd-field--wide">
              <label htmlFor="q-email">Email <span>(optional)</span></label>
              <input id="q-email" type="email" inputMode="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" enterKeyHint="send" />
            </div>
          </fieldset>

          <div className="rd-form__send">
            {error && (
              <p className="rd-form__error" role="alert" tabIndex={-1} ref={errorRef}>
                <b>Could not submit.</b> {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className="rd-btn rd-btn--go rd-btn--big rd-btn--wide">
              {submitting ? "Submitting…" : "Request My Free Quote"}
            </button>
          </div>
          <p className="rd-small rd-muted rd-form__consent">By submitting you agree to be contacted about your request. We never share your info.</p>
        </form>
        {/* Wide screens only: the same text-a-photo steps the phone layout offers above the form. */}
        <aside className="rd-quote-aside rd-dark" aria-label="Quicker by text or phone">
          <PhotoSteps placement="quote_page" />
          <p className="rd-quote-aside__call">
            Or call{" "}
            <CallLink placement="quote_page" className="rd-link">{PHONE_NUMBER_DISPLAY}</CallLink>
          </p>
        </aside>
        </div>
      </section>
    </Layout>
  );
}
