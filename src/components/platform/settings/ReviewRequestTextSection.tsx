import { useEffect, useRef, useState } from "react";
import { MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { toast } from "sonner";
import {
  DEFAULT_REVIEW_TEMPLATE,
  FALLBACK_REVIEW_LINK,
  analyzeSms,
  buildReviewMessage,
  formatSegmentLabel,
} from "@/lib/review-sms";

const TOKENS = [
  { token: "{first_name}", help: "the customer's first name (\"there\" if we don't have a name)" },
  { token: "{full_name}", help: "their full name as saved" },
  { token: "{business_name}", help: "your business name" },
  { token: "{review_link}", help: "your Google review link below" },
] as const;

/** Owner-only editor for the automated post-job review request text. */
export default function ReviewRequestTextSection() {
  const { isOwner, selectedBusinessId, businesses } = usePlatformAuth();
  const [template, setTemplate] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedBusinessId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("business_settings")
        .select("review_request_template, review_request_link")
        .eq("business_id", selectedBusinessId)
        .maybeSingle();
      if (!active) return;
      setTemplate(data?.review_request_template ?? DEFAULT_REVIEW_TEMPLATE);
      setLink(data?.review_request_link ?? FALLBACK_REVIEW_LINK);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [selectedBusinessId]);

  if (!isOwner) return null;

  const businessName = businesses.find((b) => b.id === selectedBusinessId)?.public_brand_name ?? "Gulf Coast Palms";

  const save = async () => {
    if (!selectedBusinessId) { toast.error("Select a business workspace first."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .update({ review_request_template: template, review_request_link: link })
      .eq("business_id", selectedBusinessId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Review request text saved");
  };

  return (
    <ReviewRequestTextForm
      businessName={businessName}
      template={template}
      setTemplate={setTemplate}
      link={link}
      setLink={setLink}
      loading={loading}
      saving={saving}
      onSave={save}
    />
  );
}

interface FormProps {
  businessName: string;
  template: string;
  setTemplate: (v: string) => void;
  link: string;
  setLink: (v: string) => void;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
}

/** Presentational form — exported so it can be rendered without auth in dev harnesses. */
export function ReviewRequestTextForm({ businessName, template, setTemplate, link, setLink, loading, saving, onSave }: FormProps) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertToken = (token: string) => {
    const el = areaRef.current;
    if (!el) { setTemplate(template + token); return; }
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    setTemplate(template.slice(0, start) + token + template.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const preview = buildReviewMessage({ customerName: "Sarah Jenkins", businessName, template, reviewLink: link });
  const info = analyzeSms(preview);

  return (
    <div className="platform-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Review Request Text</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-lg border border-border bg-secondary/40 p-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="font-body text-[11px] leading-relaxed text-muted-foreground">
              Google policy: ask for a review, never a 5-star review. Don't say 'if we did a great job', don't promise anything in exchange, and don't ask customers to name a crew member. Violations can get reviews removed or the profile suspended.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-template" className="font-body text-xs text-muted-foreground">Message template</Label>
            <Textarea
              id="review-template"
              ref={areaRef}
              rows={6}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="font-body text-sm min-h-[140px] w-full"
            />
          </div>

          <div className="space-y-2">
            <p className="font-body text-[11px] text-muted-foreground">Insert a token at your cursor:</p>
            <div className="flex flex-wrap gap-2">
              {TOKENS.map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => insertToken(t.token)}
                  className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary hover:bg-primary/20 transition-colors"
                >
                  {t.token}
                </button>
              ))}
            </div>
            <p className="font-body text-[10px] leading-relaxed text-muted-foreground">
              {TOKENS.map((t) => `${t.token} = ${t.help}`).join(" · ")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-link" className="font-body text-xs text-muted-foreground">Google review link</Label>
            <Input
              id="review-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="font-body text-sm w-full"
              placeholder={FALLBACK_REVIEW_LINK}
            />
          </div>

          <div className="space-y-1.5">
            <p className="font-body text-[11px] text-muted-foreground">Live preview — exactly what the customer receives:</p>
            <div
              data-testid="review-sms-preview"
              className="rounded-lg border border-border bg-secondary/50 p-3 font-body text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words"
            >
              {preview}
            </div>
            <p data-testid="review-sms-counter" className="font-body text-[10px] text-muted-foreground">
              {formatSegmentLabel(info)}
            </p>
          </div>

          <Button onClick={onSave} disabled={saving} className="w-full font-body text-sm">
            {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>) : "Save review text"}
          </Button>
        </div>
      )}
    </div>
  );
}
