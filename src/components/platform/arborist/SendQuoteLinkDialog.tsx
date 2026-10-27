import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, Link2, Loader2, MessageSquare, Share2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { copyTextToClipboard } from "@/lib/quote-message";
import { arboristLinkMessage, buildArboristLink, issueArboristLink, revokeArboristLink, smsComposeHref } from "@/lib/arborist-link";
import type { ArboristQuote } from "@/lib/arborist-quotes";

const formatExpiry = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const arboristLinkKey = (reportId: string) => ["arborist-quote-link", reportId];

/** Staff dialog: creates (or replaces) a private single-report link and offers copy / text / share. Never sends anything itself. */
export function SendQuoteLinkDialog({ open, onOpenChange, businessId, reportId, onIssued }: { open: boolean; onOpenChange: (open: boolean) => void; businessId: string; reportId?: string; onIssued?: (reportId: string) => void }) {
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [climber, setClimber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ link: string; expiresAt: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const reset = () => { setCustomer(""); setAddress(""); setClimber(""); setBusy(false); setError(null); setIssued(null); setNote(null); };
  const close = (next: boolean) => { if (busy) return; onOpenChange(next); if (!next) reset(); };
  const create = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await issueArboristLink({ businessId, reportId, customerName: customer, propertyAddress: address, arboristName: climber });
      setIssued({ link: buildArboristLink(result.token), expiresAt: result.expires_at });
      onIssued?.(result.report_id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the link. Try again."); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!issued) return;
    if (await copyTextToClipboard(issued.link)) setNote("Link copied. Paste it into a text to the climber — nothing has been sent yet.");
    else setNote("Couldn't copy automatically. Tap the link box above, select it, and copy.");
  };
  const share = async () => {
    if (!issued) return;
    try { await navigator.share({ title: "GCP arborist quote", text: arboristLinkMessage(issued.link) }); setNote("Share sheet opened. Only you can confirm it was sent."); }
    catch { /* cancelled */ }
  };

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="ops-theme text-foreground border-border w-[calc(100vw-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{reportId ? "New quote link" : "Send quote link"}</DialogTitle>
        <DialogDescription>{issued ? "Send this private link to the climber from your phone." : reportId ? "Creates a fresh link for this draft. The old link stops working right away." : "Creates a new internal draft the climber can fill in without logging in."}</DialogDescription>
      </DialogHeader>
      {!issued ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); void create(); }}>
        {!reportId && <fieldset disabled={busy} className="space-y-4">
          <p className="text-xs text-muted-foreground">All optional — the climber can fill these in.</p>
          <label className="block space-y-1.5 text-sm font-medium">Customer name<Input className="h-11 text-base" maxLength={300} value={customer} onChange={e => setCustomer(e.target.value)} /></label>
          <label className="block space-y-1.5 text-sm font-medium">Property address<Input className="h-11 text-base" maxLength={1000} value={address} onChange={e => setAddress(e.target.value)} /></label>
          <label className="block space-y-1.5 text-sm font-medium">Climber name<Input className="h-11 text-base" maxLength={300} value={climber} onChange={e => setClimber(e.target.value)} /></label>
        </fieldset>}
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => close(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}{busy ? "Creating…" : "Create link"}</Button></div>
      </form> : <div className="space-y-4">
        <label className="block space-y-1.5 text-sm font-medium">Private link<Input readOnly aria-label="Private quote link" className="h-11 text-sm font-mono" value={issued.link} onFocus={e => e.target.select()} onClick={e => e.currentTarget.select()} /></label>
        <p className="text-xs text-muted-foreground">Works for this one quote only, until {formatExpiry(issued.expiresAt)} (7 days) or until it's submitted or turned off. Anyone with the link can fill in this quote, so send it only to your climber.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" onClick={() => void copy()}><ClipboardCopy className="mr-2 h-4 w-4" />Copy link</Button>
          <Button asChild variant="outline"><a href={smsComposeHref(arboristLinkMessage(issued.link))} onClick={() => setNote("Your messages app opened. Pick the climber and tap send there.")}><MessageSquare className="mr-2 h-4 w-4" />Text link</a></Button>
          {canShare && <Button type="button" variant="outline" onClick={() => void share()}><Share2 className="mr-2 h-4 w-4" />Share</Button>}
        </div>
        {note && <p role="status" className="text-sm text-primary">{note}</p>}
        <div className="flex justify-end"><Button type="button" variant="ghost" onClick={() => close(false)}>Done</Button></div>
      </div>}
    </DialogContent>
  </Dialog>;
}

/** Staff-only link status for a draft report, with disable and replace. */
export function ArboristLinkPanel({ report, disabled }: { report: ArboristQuote; disabled: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const query = useQuery({
    queryKey: arboristLinkKey(report.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_arborist_quote_links").select("id, expires_at, revoked_at, created_at").eq("report_id", report.id).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data[0] ?? null;
    },
  });
  if (report.status !== "draft") return null;
  const link = query.data;
  const active = !!link && !link.revoked_at && new Date(link.expires_at) > new Date();
  const label = !link ? "No quote link for this draft." : link.revoked_at ? "Quote link turned off." : active ? `Quote link active until ${formatExpiry(link.expires_at)}.` : "Quote link expired.";
  const disable = async () => {
    if (busy || !window.confirm("Turn off this quote link? The climber won't be able to open or save it.")) return;
    setBusy(true);
    try { await revokeArboristLink(report.id); toast.success("Quote link turned off"); await qc.invalidateQueries({ queryKey: arboristLinkKey(report.id) }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not turn off the link."); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-border bg-card/95 p-4 flex flex-wrap items-center justify-between gap-3" aria-label="Quote link">
    <p className="text-sm text-muted-foreground flex items-center gap-2"><Link2 className="h-4 w-4 text-primary shrink-0" />{query.isLoading ? "Checking quote link…" : query.isError ? "Couldn't check the quote link." : label}</p>
    <div className="flex flex-wrap gap-2">
      {active && <Button variant="outline" disabled={disabled || busy} onClick={() => void disable()}><ShieldOff className="mr-2 h-4 w-4" />Turn off link</Button>}
      <Button variant="outline" disabled={disabled || busy} onClick={() => setReplace(true)}><Link2 className="mr-2 h-4 w-4" />{link ? "New link" : "Create link"}</Button>
    </div>
    <SendQuoteLinkDialog open={replace} onOpenChange={setReplace} businessId={report.business_id} reportId={report.id} onIssued={() => void qc.invalidateQueries({ queryKey: arboristLinkKey(report.id) })} />
  </section>;
}
