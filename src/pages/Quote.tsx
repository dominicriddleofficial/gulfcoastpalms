import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send, Phone, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { submitLead } from "@/lib/submit-lead";
import { trackEvent } from "@/lib/analytics";
import { serviceNavLinks } from "@/data/services";
import { locations } from "@/data/locations";
import { PHONE_NUMBER_TEL, PHONE_NUMBER_DISPLAY, SMS_NUMBER } from "@/data/contact";
import { toast } from "@/hooks/use-toast";

const Quote = () => {
  const navigate = useNavigate();
  const renderTime = useRef(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    service: "",
    location: "",
    message: "",
    website: "", // honeypot
  });

  useEffect(() => {
    trackEvent("quote_request_started", { source: "quote_page" });
  }, []);

  const update = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const composedMessage = [
      form.address ? `Address: ${form.address}` : null,
      form.message || null,
    ]
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
      trackEvent("quote_request_completed", {
        source: "quote_page",
        service: form.service,
        location: form.location,
      });
      navigate("/thank-you");
    } else {
      toast({
        title: "Could not submit",
        description: result.error || "Please try again or call us directly.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Get a Free Palm Tree Quote | Gulf Coast Palms"
        description="Request a free, no-obligation quote for palm tree trimming, removal, installation, or hurricane prep across Northwest Florida."
        canonicalUrl="/quote"
      />
      <section className="section-padding">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
              Get a Free Quote
            </h1>
            <p className="font-body text-base md:text-lg text-muted-foreground">
              Tell us about your palms — we typically respond within 15 minutes during business hours.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <a
              href={PHONE_NUMBER_TEL}
              onClick={() => trackEvent("phone_click", { source: "quote_page" })}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-semibold text-sm"
            >
              <Phone className="w-4 h-4" /> Call {PHONE_NUMBER_DISPLAY}
            </a>
            <a
              href={SMS_NUMBER}
              onClick={() => trackEvent("text_us_click", { source: "quote_page" })}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary text-primary font-body font-semibold text-sm"
            >
              <MessageSquare className="w-4 h-4" /> Text Us a Photo
            </a>
          </div>

          <form
            onSubmit={onSubmit}
            className="bg-card border border-border rounded-2xl p-5 md:p-8 space-y-4 shadow-sm"
          >
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            <div>
              <label htmlFor="q-name" className="block font-body text-sm font-medium text-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="q-name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="q-phone" className="block font-body text-sm font-medium text-foreground mb-1">
                  Phone <span className="text-destructive">*</span>
                </label>
                <input
                  id="q-phone"
                  type="tel"
                  inputMode="tel"
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="q-email" className="block font-body text-sm font-medium text-foreground mb-1">
                  Email <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  id="q-email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label htmlFor="q-address" className="block font-body text-sm font-medium text-foreground mb-1">
                Property Address <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <input
                id="q-address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Main St, Navarre, FL"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="q-service" className="block font-body text-sm font-medium text-foreground mb-1">
                  Service Needed
                </label>
                <select
                  id="q-service"
                  value={form.service}
                  onChange={(e) => update("service", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a service</option>
                  {serviceNavLinks.map((s) => (
                    <option key={s.to} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                  <option value="Other / Not sure">Other / Not sure</option>
                </select>
              </div>
              <div>
                <label htmlFor="q-location" className="block font-body text-sm font-medium text-foreground mb-1">
                  Service Area
                </label>
                <select
                  id="q-location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select your area</option>
                  {locations.map((loc) => (
                    <option key={loc.slug} value={`${loc.city}, ${loc.state}`}>
                      {loc.city}, {loc.state}
                    </option>
                  ))}
                  <option value="Other">Other / Not listed</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="q-message" className="block font-body text-sm font-medium text-foreground mb-1">
                Tell us about your palms
              </label>
              <textarea
                id="q-message"
                rows={4}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Number of palms, approximate height, access notes…"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background font-body text-base focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
              <p className="mt-2 font-body text-xs text-muted-foreground">
                💡 For the fastest quote, text a photo of your palms to{" "}
                <a href={SMS_NUMBER} className="text-primary font-semibold underline-offset-2 hover:underline">
                  {PHONE_NUMBER_DISPLAY}
                </a>
                .
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-base hover:bg-palm-light transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Request My Free Quote
                </>
              )}
            </button>

            <p className="font-body text-xs text-muted-foreground text-center">
              By submitting you agree to be contacted about your request. We never share your info.
            </p>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default Quote;