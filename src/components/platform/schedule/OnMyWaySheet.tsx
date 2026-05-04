import { useState, useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Send, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnMyWaySheetProps {
  open: boolean;
  onClose: () => void;
  customerName: string | null;
  customerPhone: string | null;
  crewFirstName?: string | null;
  /** Called once user confirms. `smsSent` true if SMS attempt succeeded. */
  onConfirm: (smsSent: boolean) => void;
}

const ETA_OPTIONS = [15, 30, 45, 60] as const;

function firstNameOf(name: string | null): string {
  const t = (name ?? "").trim();
  return t ? t.split(/\s+/)[0] : "there";
}

export function OnMyWaySheet({
  open,
  onClose,
  customerName,
  customerPhone,
  crewFirstName,
  onConfirm,
}: OnMyWaySheetProps) {
  const [eta, setEta] = useState<number>(30);
  const [sending, setSending] = useState(false);
  const crew = (crewFirstName ?? "").trim() || "Dom";
  const first = firstNameOf(customerName);

  const defaultMessage = useMemo(
    () =>
      `Hi ${first}, this is ${crew} with Gulf Coast Palms — on my way to your property now. See you in about ${eta} min.`,
    [first, crew, eta],
  );
  const [message, setMessage] = useState(defaultMessage);

  // Keep message in sync until user manually edits
  const [touched, setTouched] = useState(false);
  const effectiveMessage = touched ? message : defaultMessage;

  const handleSend = async () => {
    if (!customerPhone) {
      onConfirm(false);
      onClose();
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-sms", {
        body: { to: customerPhone, message: effectiveMessage },
      });
      if (error) throw error;
      onConfirm(true);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SMS failed";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    onConfirm(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="bottom"
        className="ops-theme bg-background border-border rounded-t-2xl pb-8"
      >
        <div className="space-y-1 mb-4 pt-2">
          <h3 className="font-display text-xl font-bold text-foreground leading-tight">
            On My Way
          </h3>
          <p className="font-body text-sm text-muted-foreground">
            {customerPhone ? `Notify ${first}` : "No phone on file — SMS unavailable"}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-body text-xs font-medium text-foreground mb-1.5">
              ETA
            </label>
            <div className="flex gap-1.5">
              {ETA_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setEta(opt); setTouched(false); }}
                  className={cn(
                    "flex-1 min-h-[44px] rounded-lg font-body text-sm font-semibold transition-colors",
                    eta === opt
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-foreground hover:bg-secondary/70",
                  )}
                >
                  {opt}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-medium text-foreground mb-1.5">
              Message
            </label>
            <Textarea
              value={effectiveMessage}
              onChange={(e) => { setTouched(true); setMessage(e.target.value); }}
              rows={4}
              className="font-body text-sm text-foreground bg-card border-border"
              disabled={!customerPhone}
            />
          </div>
        </div>

        <div className="space-y-2 mt-5">
          <button
            type="button"
            disabled={!customerPhone || sending}
            onClick={handleSend}
            className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl bg-primary text-primary-foreground font-body font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {sending ? "Sending…" : "Send & Mark On My Way"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-secondary/40 text-foreground font-body font-semibold text-sm hover:bg-secondary/70 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip SMS — just mark on my way
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

export default OnMyWaySheet;