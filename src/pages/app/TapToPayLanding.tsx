import { useSearchParams } from "react-router-dom";
import { Smartphone, ExternalLink, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Universal-link fallback page for Tap to Pay.
 * Route: /app/tap-to-pay?business_id=&invoice_id=&customer_id=&amount=&payment_mode=tap_to_pay
 *
 * If the native POS app is installed, the deep link (gcpops://) will open it directly.
 * This page is the fallback when the app is NOT installed.
 */
export default function TapToPayLanding() {
  const [params] = useSearchParams();
  const { toast } = useToast();

  const businessId = params.get("business_id") || "";
  const invoiceId = params.get("invoice_id") || "";
  const customerId = params.get("customer_id") || "";
  const amount = params.get("amount") || "0";

  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [invRes, bizRes] = await Promise.all([
        invoiceId
          ? supabase.from("platform_invoices").select("invoice_number, total, balance_due, status, customer_id").eq("id", invoiceId).maybeSingle()
          : Promise.resolve({ data: null }),
        businessId
          ? supabase.from("businesses").select("public_brand_name, shortcode, default_business_color").eq("id", businessId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setInvoiceData(invRes.data);
      setBusinessData(bizRes.data);
      setLoading(false);
    }
    load();
  }, [invoiceId, businessId]);

  const deepLink = `gcpops://tap-to-pay?business_id=${businessId}&invoice_id=${invoiceId}&customer_id=${customerId}&amount=${amount}&payment_mode=tap_to_pay&return_url=${encodeURIComponent(window.location.origin + "/platform/invoices")}`;

  const handleTryApp = () => {
    window.location.href = deepLink;
    // After a short delay, if page is still visible, app isn't installed
    setTimeout(() => {
      toast({ title: "Mobile POS app not detected", description: "Use the Stripe Dashboard app as a fallback." });
    }, 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deepLink);
    toast({ title: "Deep link copied" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-body text-sm">Loading...</div>
      </div>
    );
  }

  const displayAmount = Number(amount || invoiceData?.balance_due || invoiceData?.total || 0);
  const invoiceNumber = invoiceData?.invoice_number || "—";
  const businessName = businessData?.public_brand_name || "Unknown Business";
  const brandColor = businessData?.default_business_color || "#3b82f6";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: brandColor + "15" }}>
            <Smartphone className="w-7 h-7" style={{ color: brandColor }} />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Tap to Pay</h1>
          <p className="font-body text-sm text-muted-foreground">In-person payment collection</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
            <span className="font-body text-sm font-semibold text-foreground">{businessName}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Invoice" value={invoiceNumber} />
            <InfoRow label="Amount Due" value={`$${displayAmount.toLocaleString()}`} highlight />
            <InfoRow label="Status" value={invoiceData?.status || "—"} />
            <InfoRow label="Payment Mode" value="Tap to Pay" />
          </div>
        </div>

        {/* Primary: Try opening native app */}
        <Button className="w-full h-12 font-body font-semibold text-sm" onClick={handleTryApp}>
          <Smartphone className="w-4.5 h-4.5 mr-2" />
          Open in Mobile POS App
        </Button>

        {/* Fallback instructions */}
        <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#f59e0b] mt-0.5 shrink-0" />
            <div>
              <p className="font-body text-sm font-semibold text-foreground">App not installed?</p>
              <p className="font-body text-xs text-muted-foreground leading-relaxed mt-1">
                You can use the <strong>Stripe Dashboard app</strong> on your phone to collect in-person payments:
              </p>
            </div>
          </div>
          <ol className="font-body text-xs text-muted-foreground space-y-1.5 pl-6 list-decimal">
            <li>Open the <strong>Stripe Dashboard</strong> app on your iPhone or Android</li>
            <li>Tap <strong>Payments → + Collect a payment</strong></li>
            <li>Enter <strong>${displayAmount.toLocaleString()}</strong></li>
            <li>Select <strong>Tap to Pay</strong> as the collection method</li>
            <li>Have the customer tap their card or phone</li>
            <li>Add reference: <strong>{invoiceNumber}</strong></li>
          </ol>
          <a
            href="https://dashboard.stripe.com/payments"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-body text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Stripe Dashboard
          </a>
        </div>

        {/* Copy deep link */}
        <Button variant="outline" size="sm" className="w-full font-body text-xs" onClick={handleCopyLink}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Deep Link
        </Button>

        {/* API contract reference */}
        <p className="text-center font-body text-[10px] text-muted-foreground/50">
          Deep link: gcpops://tap-to-pay • Universal link: /app/tap-to-pay
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="font-body text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className={`font-body text-sm font-semibold ${highlight ? "text-foreground" : "text-foreground/80"}`}>{value}</p>
    </div>
  );
}
