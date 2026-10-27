import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ClipboardCopy, Link2, MapPin, Pencil, Plus, Search, Trees } from "lucide-react";
import { toast } from "sonner";
import PlatformLayout from "@/components/platform/PlatformLayout";
import QuotesSectionNav from "@/components/platform/QuotesSectionNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useWriteGuard } from "@/hooks/useOfflineMode";
import { arboristQuotesKey, saveArboristQuote, useArboristQuotes } from "@/hooks/useArboristQuotes";
import { ARBORIST_STATUSES, arboristReviewSummary, newArboristQuote, priceLabel, type ArboristQuote } from "@/lib/arborist-quotes";
import { ArboristQuoteEditor, PrivateNote, SignedPhotos, Status, Totals, errorText, panel, selectClass } from "@/components/platform/arborist/ArboristQuoteEditor";
import { ArboristLinkPanel, SendQuoteLinkDialog } from "@/components/platform/arborist/SendQuoteLinkDialog";
import { copyTextToClipboard } from "@/lib/quote-message";
import { cn } from "@/lib/utils";
import { WorkspaceThemeProvider, getWorkspaceTheme, workspaceThemeVars } from "@/contexts/WorkspaceThemeContext";


export { ArboristQuoteEditor };

function ReportReview({ report, canReview, canEdit, disabled, onBack, onEdit, onSaved }: { report: ArboristQuote; canReview: boolean; canEdit: boolean; disabled: boolean; onBack: () => void; onEdit: () => void; onSaved: (quote: ArboristQuote) => void }) {
  const [saving, setSaving] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const markReviewed = async () => {
    if (saving) return;
    setSaving(true);
    try { const saved = await saveArboristQuote(report, "reviewed"); onSaved(saved); toast.success("Marked reviewed"); }
    catch (error) { toast.error(errorText(error)); }
    finally { setSaving(false); }
  };
  return <div className="space-y-5">
    <Button variant="ghost" className="-ml-3" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />All arborist quotes</Button>
    <section className={panel}><div className="flex flex-wrap justify-between items-start gap-3"><div><p className="text-xs font-medium uppercase tracking-widest text-primary mb-2">Arborist field report</p><h1 className="text-2xl font-display font-semibold break-words">{report.customer_name || "Untitled visit"}</h1><p className="mt-2 text-sm text-muted-foreground flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{report.property_address || "Address not added"}</p><p className="text-sm text-muted-foreground mt-2">{report.arborist_name || "Arborist not added"} · {report.visit_date} · {report.trees.length} trees</p></div><Status status={report.status} /></div><div className="mt-5"><PrivateNote /></div></section>
    {canReview && <ArboristLinkPanel report={report} disabled={disabled} />}
    <Totals trees={report.trees} />
    {report.trees.map((tree, index) => <section key={tree.id} className={panel} aria-label={`Tree ${index + 1} review`}><div className="flex flex-wrap items-start justify-between gap-3 mb-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Tree {index + 1}</p><h2 className="text-xl font-display font-semibold">{tree.species || "Tree type not added"}</h2><p className="text-sm text-muted-foreground mt-1">{tree.service || "Work not selected"}{tree.location ? ` · ${tree.location}` : ""}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Suggested price</p><p className="font-semibold text-lg tabular-nums">{priceLabel(tree)}</p></div></div>
      <div className="grid lg:grid-cols-2 gap-5"><div className="space-y-4"><div><h3 className="text-sm font-semibold mb-2">Tree description & work</h3><p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">{tree.description || "Not added"}</p></div><div className="rounded-xl bg-secondary/50 border border-border p-4"><h3 className="text-sm font-semibold mb-2">What the customer discussed</h3><p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">{tree.customerDiscussion || "Not added"}</p></div></div><div>{tree.photos.length ? <SignedPhotos photos={tree.photos} /> : <p className="text-sm text-muted-foreground border border-dashed border-border p-8 rounded-xl text-center">No photos added</p>}</div></div>
    </section>)}
    {report.general_notes && <section className={panel}><h2 className="font-semibold mb-3">Whole-job notes</h2><p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">{report.general_notes}</p></section>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={async () => { const text = arboristReviewSummary(report); if (await copyTextToClipboard(text)) toast.success("Internal summary copied"); else setManualCopy(text); }}><ClipboardCopy className="mr-2 h-4 w-4" />Copy internal summary</Button>
      {canEdit && <Button variant="outline" disabled={disabled || saving} onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit report</Button>}
      {canReview && report.status === "submitted" && <Button disabled={disabled || saving} onClick={() => void markReviewed()}><Check className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Mark reviewed"}</Button>}
    </div>
    <Dialog open={!!manualCopy} onOpenChange={open => { if (!open) setManualCopy(null); }}><DialogContent><DialogHeader><DialogTitle>Copy internal summary</DialogTitle><DialogDescription>Select and copy this internal report text.</DialogDescription></DialogHeader><Textarea readOnly className="min-h-80" value={manualCopy || ""} onFocus={event => event.target.select()} /></DialogContent></Dialog>
  </div>;
}

function ArboristWorkspace({ businessId, userId, canReview }: { businessId: string; userId: string; canReview: boolean }) {
  const qc = useQueryClient();
  const { writeDisabled } = useWriteGuard();
  const query = useArboristQuotes(businessId, userId);
  const reports = query.data || [];
  const [editing, setEditing] = useState<ArboristQuote | null>(null);
  const [selected, setSelected] = useState<ArboristQuote | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const saved = (report: ArboristQuote) => {
    qc.setQueryData<ArboristQuote[]>(arboristQuotesKey(businessId, userId), current => [report, ...(current || []).filter(item => item.id !== report.id)]);
    void qc.invalidateQueries({ queryKey: arboristQuotesKey(businessId, userId) });
    setEditing(null); setSelected(report);
  };
  if (editing) return <ArboristQuoteEditor key={editing.id} initial={editing} onBack={() => setEditing(null)} onSaved={saved} disabled={writeDisabled} crewView={!canReview} />;
  if (selected) {
    const latest = reports.find(report => report.id === selected.id) || selected;
    return <ReportReview report={latest} canReview={canReview} canEdit={canReview || (latest.author_id === userId && latest.status !== "reviewed")} disabled={writeDisabled} onBack={() => setSelected(null)} onEdit={() => setEditing(latest)} onSaved={saved} />;
  }
  const filtered = reports.filter(report => (filter === "all" || report.status === filter) && `${report.customer_name} ${report.property_address} ${report.arborist_name}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-2xl font-semibold tracking-tight">Arborist Quotes</h1><p className="text-sm text-muted-foreground mt-1">Tree-by-tree field notes for a clear customer quote.</p></div><div className="flex flex-wrap gap-2">{canReview && <Button variant="outline" disabled={writeDisabled || query.isError || query.isLoading} onClick={() => setLinkOpen(true)}><Link2 className="mr-2 h-4 w-4" />Send quote link</Button>}<Button disabled={writeDisabled || query.isError || query.isLoading} onClick={() => { setSelected(null); setEditing(newArboristQuote(businessId, userId)); }}><Plus className="mr-2 h-4 w-4" />New arborist quote</Button></div></div>
    {canReview && <SendQuoteLinkDialog open={linkOpen} onOpenChange={setLinkOpen} businessId={businessId} onIssued={() => void qc.invalidateQueries({ queryKey: arboristQuotesKey(businessId, userId) })} />}
    <PrivateNote />
    <div className="grid grid-cols-3 gap-3">{(["submitted", "draft", "reviewed"] as const).map(status => <button key={status} onClick={() => setFilter(status)} className={cn("rounded-xl border bg-card p-3 sm:p-4 text-left", filter === status ? "border-primary/50" : "border-border")}><p className="text-xs text-muted-foreground">{ARBORIST_STATUSES[status]}</p><p className="font-display text-2xl font-semibold mt-1">{reports.filter(report => report.status === status).length}</p></button>)}</div>
    <div className="flex flex-wrap gap-3"><div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search arborist quotes" placeholder="Search customer, address, or arborist…" className="pl-10 h-11" value={search} onChange={event => setSearch(event.target.value)} /></div><select aria-label="Filter arborist quotes" className={cn(selectClass, "w-auto")} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All reports</option>{Object.entries(ARBORIST_STATUSES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    {query.isLoading ? <p role="status" className="py-10 text-center text-muted-foreground">Loading arborist quotes…</p> : query.isError ? <div role="alert" className={panel}><p>Arborist quotes could not be loaded.</p><p className="text-sm text-muted-foreground mt-2">{query.error instanceof Error ? query.error.message : "Check the connection and try again."}</p><Button variant="outline" className="mt-4" onClick={() => query.refetch()}>Retry</Button></div> : !filtered.length ? <div className={cn(panel, "py-12 text-center")}><Trees className="h-10 w-10 text-primary mx-auto mb-4" /><h2 className="font-semibold">{reports.length ? "No matching reports" : "Keep every tree clear"}</h2><p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{reports.length ? "Try a different search or status." : "Start a visit, add each tree's notes and photos, then submit it for office review."}</p></div> : <div className="space-y-3">{filtered.map(report => <button key={report.id} onClick={() => setSelected(report)} className="w-full rounded-xl border border-border bg-card p-4 sm:p-5 text-left hover:border-primary/40 transition-colors"><div className="flex flex-wrap justify-between items-start gap-3"><div className="min-w-0"><p className="font-semibold break-words">{report.customer_name || "Untitled visit"}</p><p className="mt-1 text-sm text-muted-foreground break-words">{report.property_address || "Address not added"}</p></div><Status status={report.status} /></div><div className="flex flex-wrap justify-between gap-3 mt-4 text-sm"><span className="text-muted-foreground">{report.trees.length} trees · {report.arborist_name || "Arborist not added"} · {report.visit_date}</span><span className="font-medium tabular-nums">{totalLabel(report.trees)}{quoteTotals(report.trees).unpriced ? " · incomplete" : ""}</span></div></button>)}</div>}
  </div>;
}

export default function PlatformArboristQuotes() {
  const auth = usePlatformAuth();
  const { isCrew, isStaff, isLoading } = useUserRole();
  const business = auth.businesses.find(item => item.id === auth.selectedBusinessId);
  const gcp = auth.businesses.find(item => item.shortcode.toUpperCase() === "GCP");
  const body = auth.loading || isLoading ? <p role="status" className="p-8">Loading…</p> : business?.shortcode.toUpperCase() !== "GCP" || !auth.userId ? <div className={panel}><p>Select Gulf Coast Palms to open arborist quotes.</p>{gcp && <Button className="mt-4" onClick={() => auth.setSelectedBusinessId(gcp.id)}>Open Gulf Coast Palms</Button>}</div> : <ArboristWorkspace key={`${auth.selectedBusinessId}:${auth.userId}`} businessId={auth.selectedBusinessId!} userId={auth.userId} canReview={isStaff} />;
  if (isCrew) return <WorkspaceThemeProvider shortcode="GCP"><div className="ops-theme min-h-screen bg-background text-foreground" style={workspaceThemeVars(getWorkspaceTheme("GCP"))}><div className="mx-auto max-w-5xl p-4 pb-32"><Link to="/platform/crew" className="inline-flex items-center min-h-11 gap-2 text-sm text-primary mb-4"><ArrowLeft className="h-4 w-4" />My schedule</Link>{body}</div></div></WorkspaceThemeProvider>;
  return <PlatformLayout><QuotesSectionNav />{body}</PlatformLayout>;
}
