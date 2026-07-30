import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildSmsHref, getReviewBusinessName } from "@/lib/reviewLinks";
import { buildReviewMessage, FALLBACK_REVIEW_LINK } from "@/lib/review-sms";

interface ReviewMessageSheetProps {
  open: boolean;
  onClose: () => void;
  customerName: string | null;
  customerPhone: string | null;
  businessId: string | null;
}

export function ReviewMessageSheet({
  open,
  onClose,
  customerName,
  customerPhone,
  businessId,
}: ReviewMessageSheetProps) {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState(FALLBACK_REVIEW_LINK);
  const [copied, setCopied] = useState(false);

  // Load the owner-editable template + link when the sheet OPENS, then hold the
  // rendered message in state. The copy handler stays synchronous against this
  // state — iOS invalidates clipboard permission after an await.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setCopied(false);
    const businessName = getReviewBusinessName(businessId);
    // Render defaults immediately so the sheet is never blank.
    setMessage(buildReviewMessage({ customerName, businessName }));
    (async () => {
      if (!businessId) return;
      const { data } = await supabase
        .from("business_settings")
        .select("review_request_template, review_request_link")
        .eq("business_id", businessId)
        .maybeSingle();
      if (!active) return;
      setLink(data?.review_request_link ?? FALLBACK_REVIEW_LINK);
      setMessage(
        buildReviewMessage({
          customerName,
          businessName,
          template: data?.review_request_template ?? null,
          reviewLink: data?.review_request_link ?? null,
        })
      );
    })();
    return () => { active = false; };
  }, [open, customerName, businessId]);

  const isPlaceholder = link === "REPLACE_WITH_GOOGLE_REVIEW_LINK";

  // Synchronous with respect to the clipboard write — no await before writeText.
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const smsHref = customerPhone ? buildSmsHref(customerPhone, message) : "#";

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="bottom"
        className="ops-theme bg-background border-border rounded-t-2xl pb-8"
      >
        <div className="space-y-1 mb-4 pt-2">
          <h3 className="font-display text-xl font-bold text-foreground leading-tight">
            Request a review
          </h3>
          <p className="font-body text-sm text-muted-foreground">
            {customerPhone
              ? "Opens iMessage with the text prefilled — you send it."
              : "No phone on file — SMS unavailable"}
          </p>
        </div>

        {isPlaceholder && (
          <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-body text-destructive">
            No Google review link configured for this business yet. Add one in
            Settings → Review Request Text.
          </div>
        )}

        <div>
          <label className="block font-body text-xs font-medium text-foreground mb-1.5">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={9}
            className="font-body text-sm text-foreground bg-card border-border"
          />
        </div>

        <div className="space-y-2 mt-5">
          <a
            href={smsHref}
            aria-disabled={!customerPhone}
            onClick={(e) => {
              if (!customerPhone) {
                e.preventDefault();
                return;
              }
              // Close after the user is handed off to Messages.
              setTimeout(() => onClose(), 200);
            }}
            className={
              "w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl bg-primary text-primary-foreground font-body font-semibold text-base hover:bg-primary/90 transition-colors " +
              (!customerPhone ? "opacity-50 pointer-events-none" : "")
            }
          >
            <MessageSquare className="w-5 h-5" />
            Open in Messages
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-secondary/40 text-foreground font-body font-semibold text-sm hover:bg-secondary/70 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy message"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-1 p-3 rounded-xl text-center font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ReviewMessageSheet;