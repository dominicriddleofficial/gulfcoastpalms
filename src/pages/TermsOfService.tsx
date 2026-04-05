import Layout from "@/components/Layout";

const TermsOfService = () => {
  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-5 py-16 max-w-3xl">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-10 text-sm">Last updated: April 5, 2026</p>

          <div className="prose prose-green max-w-none space-y-8 text-foreground/90 font-body text-sm leading-relaxed">
            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">1. Agreement to Terms</h2>
              <p>By accessing or using the services provided by Gulf Coast Palms ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">2. Services</h2>
              <p>Gulf Coast Palms provides professional palm tree and landscaping services including but not limited to: palm tree trimming, palm tree removal, palm tree installation, diamond cutting, trunk skinning, tree trimming &amp; removal, and general landscaping services throughout the Florida Gulf Coast / Emerald Coast region.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">3. Estimates &amp; Pricing</h2>
              <p>All estimates provided are based on information available at the time of assessment. Final pricing may vary if conditions differ from what was described or observed during the initial estimate. We reserve the right to adjust pricing if the scope of work changes after the estimate is provided.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">4. Scheduling &amp; Cancellations</h2>
              <p>We make every effort to complete work on the scheduled date. However, scheduling may be affected by weather, equipment availability, or other circumstances beyond our control. If you need to cancel or reschedule, please provide at least 24 hours' notice. Cancellations with less than 24 hours' notice may be subject to a cancellation fee.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">5. Payment Terms</h2>
              <p>Payment is due upon completion of services unless otherwise agreed in writing. We accept cash, check, credit/debit cards, and digital payments. Invoices not paid within 30 days of the due date may be subject to a late fee of 1.5% per month. Deposits may be required for large or specialty jobs.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">6. Property Access &amp; Responsibility</h2>
              <p>By scheduling services, you authorize Gulf Coast Palms and its employees to access the property for the purpose of completing the agreed-upon work. You are responsible for ensuring that we can safely access the work area. Please notify us of any underground utilities, irrigation systems, septic systems, or other potential hazards.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">7. Liability &amp; Damages</h2>
              <p>Gulf Coast Palms carries general liability insurance. While we take every precaution to avoid property damage, some risk is inherent in tree and landscaping work. We are not liable for pre-existing damage, damage to items not disclosed prior to work, or damage caused by factors outside our control (e.g., wind, storms, root systems). Any claims must be reported within 48 hours of service completion.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">8. Warranty &amp; Satisfaction</h2>
              <p>We stand behind the quality of our work. If you are not satisfied with the services provided, please contact us within 7 days of service completion and we will work to resolve the issue. Plant and tree installations carry a limited survival warranty when proper watering and care instructions are followed.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">9. Communications &amp; Marketing</h2>
              <p>By providing your phone number or email address, you consent to receive service-related communications from Gulf Coast Palms. You may opt out of marketing messages at any time. Standard message and data rates may apply for text messages. See our <a href="/text-consent" className="text-primary underline">Text Consent Policy</a> for details.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">10. Intellectual Property</h2>
              <p>All content on this website, including text, images, logos, and design elements, is the property of Gulf Coast Palms and may not be reproduced, distributed, or used without written permission.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">11. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Gulf Coast Palms shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to our services or this website.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">12. Governing Law</h2>
              <p>These Terms of Service shall be governed by and construed in accordance with the laws of the State of Florida, without regard to conflict of law principles.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">13. Changes to Terms</h2>
              <p>We reserve the right to update these Terms of Service at any time. Changes will be posted on this page with an updated revision date. Continued use of our services after changes are posted constitutes acceptance of the revised terms.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground">14. Contact</h2>
              <p>If you have questions about these Terms of Service, contact us at:</p>
              <p className="mt-2">
                <strong>Gulf Coast Palms</strong><br />
                Phone: <a href="tel:8509101290" className="text-primary underline">(850) 910-1290</a><br />
                Text: <a href="sms:8509101290" className="text-primary underline">(850) 910-1290</a><br />
                Serving the Emerald Coast, Florida
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService;
