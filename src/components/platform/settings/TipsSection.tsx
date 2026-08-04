import { useEffect, useState } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { toast } from "sonner";

const DEFAULT_PRESETS = [20, 50, 100];

/** Owner-only control for the optional customer tip on the public pay page. */
export default function TipsSection() {
  const { isOwner, selectedBusinessId } = usePlatformAuth();
  const [enabled, setEnabled] = useState(false);
  const [presets, setPresets] = useState<string[]>(DEFAULT_PRESETS.map(String));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedBusinessId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("business_settings")
        .select("tips_enabled, tip_presets")
        .eq("business_id", selectedBusinessId)
        .maybeSingle();
      if (!active) return;
      setEnabled(!!data?.tips_enabled);
      const raw = data?.tip_presets;
      const list = Array.isArray(raw) && raw.length === 3 ? raw.map((n) => String(n)) : DEFAULT_PRESETS.map(String);
      setPresets(list);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [selectedBusinessId]);

  if (!isOwner) return null;

  const parsed = presets.map((p) => Math.round(Number(p) || 0));
  const valid = parsed.every((n) => n >= 1);

  const save = async () => {
    if (!selectedBusinessId) { toast.error("Select a business workspace first."); return; }
    if (!valid) { toast.error("Each preset must be at least $1."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .update({ tips_enabled: enabled, tip_presets: parsed })
      .eq("business_id", selectedBusinessId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tip settings saved");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <HandCoins className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-bold text-foreground">Customer Tips</h2>
      </div>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-body text-sm font-medium text-foreground">Allow tips on the pay page</p>
              <p className="font-body text-[11px] text-muted-foreground">
                Tips are charged on top of the invoice and never count as job revenue.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <p className="font-body text-xs font-medium text-foreground mb-1.5">Preset amounts (dollars)</p>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((value, i) => (
                <Input
                  key={i}
                  type="number"
                  min={1}
                  value={value}
                  onChange={(e) => setPresets(presets.map((p, j) => (j === i ? e.target.value : p)))}
                  className="bg-background border-border font-body text-sm h-10"
                />
              ))}
            </div>
            {!valid && <p className="font-body text-[11px] text-destructive mt-1">Each preset must be at least $1.</p>}
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Live preview</p>
            {enabled ? (
              <>
                <p className="font-body text-sm font-semibold text-foreground mb-2">Add a tip?</p>
                <div className="flex flex-wrap gap-2">
                  {parsed.map((n, i) => (
                    <span key={i} className="inline-flex items-center justify-center min-h-[36px] px-3 rounded-lg border border-border bg-background font-body text-sm text-foreground">
                      ${n}
                    </span>
                  ))}
                  <span className="inline-flex items-center justify-center min-h-[36px] px-3 rounded-lg border border-border bg-background font-body text-sm text-foreground">Other</span>
                  <span className="inline-flex items-center justify-center min-h-[36px] px-3 rounded-lg border border-border bg-background font-body text-sm text-muted-foreground">No thanks</span>
                </div>
              </>
            ) : (
              <p className="font-body text-xs text-muted-foreground">Tips are off — the pay page shows no tip section.</p>
            )}
          </div>

          <Button className="h-10 font-body font-semibold" disabled={saving || !valid} onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null} Save tip settings
          </Button>
        </div>
      )}
    </div>
  );
}
