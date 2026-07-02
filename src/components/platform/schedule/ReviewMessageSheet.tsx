import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { buildReviewMessage, buildSmsHref, getReviewLink } from "@/lib/reviewLinks";

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
  const defaultMessage = buildReviewMessage({ customerName, businessId });
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  // Reset message when the sheet is (re)opened for a different job.
  useEffect(() => {
    if (open) {
      setMessage(buildReviewMessage({ customerName, businessId }));
      setCopied(false);
    }
  }, [open, customerName, businessId]);

  const link = getReviewLink(businessId);
  const isPlaceholder = link === "REPLACE_WITH_GOOGLE_REVIEW_LINK";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
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
            No Google review link configured for this business yet. Edit
            src/lib/reviewLinks.ts to add one.
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