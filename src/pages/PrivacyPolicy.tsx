import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <SEOHead
        title="Privacy Policy | Gulf Coast Palms"
        description="Read the Gulf Coast Palms privacy policy to understand how we collect, use, and protect your personal information."
        canonicalUrl="/privacy-policy"
      />
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-5 py-16 max-w-3xl">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-10 text-sm">Last updated: April 5, 2026</p>

          <div className="prose prose-green max-w-none space-y-8 text-foreground/90 font-body text-sm leading-relaxed">
            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p>When you request a quote, schedule a service, or contact us, we may collect the following information:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Name</li>
                <li>Phone number</li>
                <li>Email address</li>
                <li>Property address</li>
                <li>Photos of your property or trees</li>
                <li>Service preferences and notes</li>
              </ul>
              <p className="mt-2">We also automatically collect certain technical information when you visit our website, including IP address, browser type, device type, and pages visited.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide, schedule, and complete the services you request</li>
                <li>To communicate with you about your service, including confirmations, reminders, and follow-ups</li>
                <li>To send invoices and process payments</li>
                <li>To improve our website and services</li>
                <li>To send marketing communications (with your consent)</li>
                <li>To respond to inquiries and provide customer support</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">3. Text &amp; SMS Communications</h2>
              <p>By providing your phone number, you may receive service-related text messages from Gulf Coast Palms. Message and data rates may apply. You can opt out at any time by replying STOP. See our <a href="/text-consent" className="text-primary underline">Text Consent Policy</a> for full details.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">4. Cookies &amp; Tracking</h2>
              <p>We use cookies and similar technologies (including Google Analytics and Google Ads conversion tracking) to understand how visitors use our website and to measure advertising effectiveness. You can control cookie settings through your browser preferences.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">5. Information Sharing</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Service providers who help us operate our business (payment processing, scheduling software, email services)</li>
                <li>Law enforcement or government agencies if required by law</li>
                <li>Business partners involved in completing your requested services</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">6. Data Security</h2>
              <p>We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">7. Data Retention</h2>
              <p>We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your data by contacting us.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">8. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us using the information below.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">9. Children's Privacy</h2>
              <p>Our services are not directed at individuals under the age of 18. We do not knowingly collect personal information from children.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">10. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">11. Contact</h2>
              <p>If you have questions about this Privacy Policy, contact us at:</p>
              <p className="mt-2">
                <strong>Gulf Coast Palms</strong><br />
                Phone: <a href="tel:8509101290" className="text-primary underline">(850) 910-1290</a><br />
                Text: <a href="sms:8509101290&body=Hi%20Gulf%20Coast%20Palms!%20I%27d%20like%20a%20quote%20%E2%80%94%20here%27s%20a%20photo%20of%20my%20palms%3A" className="text-primary underline">(850) 910-1290</a><br />
                Serving the Emerald Coast, Florida
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
