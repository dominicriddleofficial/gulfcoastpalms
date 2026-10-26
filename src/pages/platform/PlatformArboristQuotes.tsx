import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Check, ClipboardCopy, ImagePlus, Loader2, LockKeyhole, MapPin, Pencil, Plus, Save, Search, Send, Trash2, Trees, X } from "lucide-react";
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
import { arboristQuotesKey, prepareArboristPhoto, saveArboristQuote, uploadArboristPhoto, useArboristQuotes } from "@/hooks/useArboristQuotes";
import { ARBORIST_PHOTO_BUCKET, ARBORIST_SERVICES, ARBORIST_STATUSES, MAX_TREE_PHOTOS, MAX_TREES, arboristReviewSummary, newArboristQuote, newArboristTree, priceLabel, quoteTotals, totalLabel, validateArboristQuote, type ArboristPhoto, type ArboristQuote, type ArboristTree } from "@/lib/arborist-quotes";
import { supabase } from "@/integrations/supabase/client";
import { copyTextToClipboard } from "@/lib/quote-message";
import { cn } from "@/lib/utils";
import { WorkspaceThemeProvider, getWorkspaceTheme, workspaceThemeVars } from "@/contexts/WorkspaceThemeContext";

const panel = "rounded-2xl border border-border bg-card/95 p-4 sm:p-6";
const selectClass = "flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Could not save. Your form is still here; try again.";
function Field({ title, hint, children }: { title: string; hint?: string; children: ReactElement<{ id?: string; "aria-describedby"?: string }> }) {
  const id = useId();
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{title}</label>{cloneElement(children, { id, "aria-describedby": hint ? `${id}-hint` : undefined })}{hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
function Status({ status }: { status: ArboristQuote["status"] }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap", status === "submitted" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : status === "reviewed" ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground")}>{ARBORIST_STATUSES[status]}</span>;
}
function PrivateNote() {
  return <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />Internal only · notes and suggested prices for office review</p>;
}

function SignedPhotos({ photos, onRemove }: { photos: ArboristPhoto[]; onRemove?: (id: string) => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["arborist-photo-links", photos.map(photo => photo.path)],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(ARBORIST_PHOTO_BUCKET).createSignedUrls(photos.map(photo => photo.path), 3600);
      if (error) throw error;
      return data;
    }, enabled: photos.length > 0, staleTime: 40 * 60_000, refetchInterval: 40 * 60_000, placeholderData: () => undefined,
  });
  if (!photos.length) return null;
  if (isLoading) return <p className="text-xs text-muted-foreground">Loading photos…</p>;
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>Retry photos</Button>;
  return <div className={cn("grid gap-3", photos.length === 1 ? "grid-cols-1 max-w-md" : "grid-cols-2 sm:grid-cols-3")}>{photos.map(photo => {
    const url = data?.find(item => item.path === photo.path)?.signedUrl;
    return <div key={photo.id} className="relative overflow-hidden rounded-xl border border-border bg-secondary">
      {url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Open photo: ${photo.name}`}><img src={url} alt={photo.name} loading="lazy" className="aspect-[4/3] w-full object-cover" /></a> : <p className="p-4 text-xs">Photo unavailable</p>}
      {onRemove && <button type="button" aria-label={`Remove photo ${photo.name}`} className="absolute top-1 right-1 rounded-full bg-black/80 p-2 text-white" onClick={() => onRemove(photo.id)}><X className="h-4 w-4" /></button>}
    </div>;
  })}</div>;
}

function Totals({ trees }: { trees: ArboristTree[] }) {
  const totals = quoteTotals(trees);
  return <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-sm font-medium">{totals.unpriced ? "Priced trees subtotal" : "Suggested job total"}</p><p className="text-xs text-muted-foreground mt-1">{trees.length} tree{trees.length === 1 ? "" : "s"}{totals.unpriced ? ` · ${totals.unpriced} still need pricing` : " · sum of per-tree suggestions"}</p></div>
    <p className="text-xl font-semibold tabular-nums tracking-tight text-primary">{totalLabel(trees)}</p>
  </div>;
}

interface PendingPhoto { id: string; treeId: string; name: string; blob: Blob; preview: string }

export function ArboristQuoteEditor({ initial, onBack, onSaved, disabled = false, crewView = false }: { initial: ArboristQuote; onBack: () => void; onSaved: (report: ArboristQuote) => void; disabled?: boolean; crewView?: boolean }) {
  const [report, setReport] = useState(initial);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [count, setCount] = useState(String(initial.trees.length));
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const urls = useRef(new Set<string>());
  const savingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const guardNavigation = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (busy || preparing || (dirty && !window.confirm("Leave this form? Unsaved changes and newly added photos will be lost."))) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    document.addEventListener("click", guardNavigation, true);
    return () => document.removeEventListener("click", guardNavigation, true);
  }, [dirty, busy, preparing]);
  useEffect(() => { if (errors.length) errorRef.current?.focus(); }, [errors]);
  const update = (patch: Partial<ArboristQuote>) => { setReport(current => ({ ...current, ...patch })); setDirty(true); };
  const updateTree = (id: string, patch: Partial<ArboristTree>) => {
    setReport(current => ({ ...current, trees: current.trees.map(tree => tree.id === id ? { ...tree, ...patch } : tree) })); setDirty(true);
  };
  const discardPending = (ids: string[]) => setPending(current => {
    current.filter(photo => ids.includes(photo.id)).forEach(photo => { URL.revokeObjectURL(photo.preview); urls.current.delete(photo.preview); });
    return current.filter(photo => !ids.includes(photo.id));
  });
  const resizeTrees = (size: number) => {
    if (!Number.isInteger(size) || size < 1 || size > MAX_TREES) { setCount(String(report.trees.length)); return; }
    if (size < report.trees.length && !window.confirm(`Remove the last ${report.trees.length - size} tree entry or entries and their photos from this form?`)) { setCount(String(report.trees.length)); return; }
    const trees = size > report.trees.length ? [...report.trees, ...Array.from({ length: size - report.trees.length }, newArboristTree)] : report.trees.slice(0, size);
    const keep = new Set(trees.map(tree => tree.id));
    discardPending(pending.filter(photo => !keep.has(photo.treeId)).map(photo => photo.id));
    setCount(String(size)); update({ trees });
  };
  const removeTree = (tree: ArboristTree) => {
    if (!window.confirm("Remove this tree and its photos from the report?")) return;
    discardPending(pending.filter(photo => photo.treeId === tree.id).map(photo => photo.id));
    const trees = report.trees.filter(item => item.id !== tree.id);
    setCount(String(trees.length)); update({ trees });
  };
  const addPhotos = async (tree: ArboristTree, files: File[]) => {
    const available = MAX_TREE_PHOTOS - tree.photos.length - pending.filter(photo => photo.treeId === tree.id).length;
    if (files.length > available) { toast.error(`Keep up to ${MAX_TREE_PHOTOS} photos per tree. You have room for ${available}.`); return; }
    setPreparing(true);
    try {
      for (const file of files) {
        const blob = await prepareArboristPhoto(file);
        const preview = URL.createObjectURL(blob); urls.current.add(preview);
        setPending(current => [...current, { id: crypto.randomUUID(), treeId: tree.id, name: file.name, blob, preview }]);
        setDirty(true);
      }
    } catch (error) { toast.error(errorText(error)); }
    finally { setPreparing(false); }
  };

  const save = async (status: "draft" | "submitted") => {
    if (savingRef.current || preparing || disabled) return;
    const validationReport = { ...report, trees: report.trees.map(tree => ({ ...tree, photos: [...tree.photos, ...pending.filter(photo => photo.treeId === tree.id).map(photo => ({ id: photo.id, path: "pending", name: photo.name }))] })) };
    const messages = validateArboristQuote(validationReport, status === "submitted");
    setErrors(messages);
    if (messages.length) return;
    savingRef.current = true; setBusy(true);
    let working = report;
    try {
      if (pending.length) {
        // Create/save the parent draft before any upload. A failed upload never submits a partial report.
        working = await saveArboristQuote(working, "draft");
        setReport(working);
        for (const photo of pending) {
          const path = await uploadArboristPhoto(working, photo.treeId, photo.id, photo.blob);
          working = { ...working, trees: working.trees.map(tree => tree.id === photo.treeId ? { ...tree, photos: [...tree.photos, { id: photo.id, path, name: photo.name }] } : tree) };
          setReport(working); discardPending([photo.id]);
        }
      }
      const saved = await saveArboristQuote(working, status);
      setReport(saved); setDirty(false);
      toast.success(status === "submitted" ? "Submitted for office review" : "Draft saved");
      onSaved(saved);
    } catch (error) { setErrors([errorText(error)]); }
    finally { savingRef.current = false; setBusy(false); }
  };
  const locked = busy || preparing || disabled;
  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save("submitted"); }}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Button type="button" variant="ghost" className="-ml-3 mb-2" disabled={busy || preparing} onClick={() => { if (!dirty || window.confirm("Leave this form? Changes since your last save and newly added photos will be lost.")) onBack(); }}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{initial.version ? "Edit arborist quote" : "New arborist quote"}</h1><p className="mt-1 text-sm text-muted-foreground">One tree at a time. Keep the photo, scope, and price together.</p></div>
      <Status status="draft" />
    </div>
    <PrivateNote />
    {errors.length > 0 && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><p className="font-semibold mb-2">Check these details</p><ul className="list-disc pl-5 space-y-1">{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
    <fieldset disabled={locked} className="space-y-5 disabled:opacity-70">
      <section className={panel} aria-label="Visit details"><h2 className="font-display text-lg font-semibold mb-5">Visit details</h2><div className="grid sm:grid-cols-2 gap-5">
        <Field title="Customer name"><Input maxLength={300} className="h-11 text-base" value={report.customer_name} onChange={event => update({ customer_name: event.target.value })} placeholder="Who did you meet with?" /></Field>
        <Field title="Property address"><Input maxLength={1000} className="h-11 text-base" value={report.property_address} onChange={event => update({ property_address: event.target.value })} placeholder="Street, city, and ZIP" /></Field>
        <Field title="Arborist / climber name"><Input maxLength={300} className="h-11 text-base" autoComplete="name" value={report.arborist_name} onChange={event => update({ arborist_name: event.target.value })} placeholder="Your name" /></Field>
        <Field title="Date of visit"><Input type="date" className="h-11 text-base" value={report.visit_date} onChange={event => update({ visit_date: event.target.value })} /></Field>
      </div></section>
      <section className={panel}><div className="flex flex-wrap justify-between items-end gap-4"><Field title="How many trees?" hint="Each tree gets its own numbered entry."><Input type="number" min={1} max={MAX_TREES} className="w-28 h-11 text-base" value={count} onChange={event => setCount(event.target.value)} onBlur={() => resizeTrees(Number(count))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); resizeTrees(Number(count)); } }} /></Field><Button type="button" variant="outline" disabled={report.trees.length >= MAX_TREES} onClick={() => resizeTrees(report.trees.length + 1)}><Plus className="mr-2 h-4 w-4" />Add tree</Button></div></section>
      {report.trees.map((tree, index) => {
        const waiting = pending.filter(photo => photo.treeId === tree.id);
        return <details open key={tree.id} className="rounded-2xl border border-border bg-card/95 overflow-hidden" data-testid="arborist-tree">
          <summary className="cursor-pointer p-4 sm:p-6 bg-primary/[0.04] marker:text-primary"><span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 ml-2"><span className="font-display font-semibold text-primary">Tree {index + 1}</span><span className="font-medium">{tree.species || "Tree type"}{tree.service ? ` · ${tree.service}` : ""}</span><span className="text-sm text-muted-foreground">{priceLabel(tree)}</span></span></summary>
          <div className="p-4 sm:p-6 space-y-5 border-t border-border">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field title={`Tree ${index + 1} type / species`}><Input className="h-11 text-base" maxLength={300} placeholder="Oak, magnolia, pine, sabal…" value={tree.species} onChange={event => updateTree(tree.id, { species: event.target.value })} /></Field>
              <Field title={`Tree ${index + 1} requested work`}><select className={selectClass} value={tree.service} onChange={event => updateTree(tree.id, { service: event.target.value })}><option value="">Choose work</option>{ARBORIST_SERVICES.map(service => <option key={service}>{service}</option>)}</select></Field>
            </div>
            <Field title={`Tree ${index + 1} location on property`} hint="Optional. Helps match the notes to the right tree."><Input maxLength={1000} className="h-11 text-base" placeholder="Backyard, beside the shed, left of driveway…" value={tree.location} onChange={event => updateTree(tree.id, { location: event.target.value })} /></Field>
            <Field title={`Tree ${index + 1} description and work needed`}><Textarea className="min-h-28 text-base" maxLength={10000} placeholder="Describe the tree, its condition, the work needed, and access or obstacles." value={tree.description} onChange={event => updateTree(tree.id, { description: event.target.value })} /></Field>
            <Field title={`Tree ${index + 1} customer discussion`}><Textarea className="min-h-28 text-base" maxLength={10000} placeholder="What did you and the customer agree on or discuss for this tree? Note any options or work they do not want." value={tree.customerDiscussion} onChange={event => updateTree(tree.id, { customerDiscussion: event.target.value })} /></Field>
            <div className="rounded-xl border border-border bg-background/60 p-4 grid sm:grid-cols-3 gap-4">
              <Field title={`Tree ${index + 1} pricing`}><select className={selectClass} value={tree.priceType} onChange={event => updateTree(tree.id, { priceType: event.target.value as ArboristTree["priceType"] })}><option value="fixed">Fixed price</option><option value="range">Price range</option><option value="unsure">Not sure yet</option></select></Field>
              {tree.priceType !== "unsure" && <Field title={`Tree ${index + 1} ${tree.priceType === "range" ? "low price" : "suggested price"} ($)`}><Input className="h-11 text-base" inputMode="decimal" placeholder="0.00" value={tree.priceMin} onChange={event => updateTree(tree.id, { priceMin: event.target.value })} /></Field>}
              {tree.priceType === "range" && <Field title={`Tree ${index + 1} high price ($)`}><Input className="h-11 text-base" inputMode="decimal" placeholder="0.00" value={tree.priceMax} onChange={event => updateTree(tree.id, { priceMax: event.target.value })} /></Field>}
            </div>
            <div className="space-y-3"><p className="text-sm font-medium">Tree {index + 1} photos <span className="text-muted-foreground font-normal">({tree.photos.length + waiting.length}/{MAX_TREE_PHOTOS})</span></p><SignedPhotos photos={tree.photos} onRemove={id => updateTree(tree.id, { photos: tree.photos.filter(photo => photo.id !== id) })} />
              {waiting.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{waiting.map(photo => <div key={photo.id} className="relative rounded-xl border border-border overflow-hidden"><img src={photo.preview} alt={photo.name} className="aspect-[4/3] w-full object-cover" /><span className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1 text-xs text-white">Uploads when saved</span><button type="button" aria-label={`Remove photo ${photo.name}`} className="absolute top-1 right-1 rounded-full bg-black/80 p-2 text-white" onClick={() => { discardPending([photo.id]); setDirty(true); }}><X className="h-4 w-4" /></button></div>)}</div>}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm text-primary focus-within:ring-2 focus-within:ring-ring"><Camera className="h-4 w-4" />Take photo<input type="file" accept="image/*" capture="environment" aria-label={`Take photo for tree ${index + 1}`} className="sr-only" onChange={event => { void addPhotos(tree, Array.from(event.target.files || [])); event.target.value = ""; }} /></label>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm focus-within:ring-2 focus-within:ring-ring"><ImagePlus className="h-4 w-4" />Choose photos<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple aria-label={`Choose photos for tree ${index + 1}`} className="sr-only" onChange={event => { void addPhotos(tree, Array.from(event.target.files || [])); event.target.value = ""; }} /></label>
              </div><p className="text-xs text-muted-foreground">At least one photo per tree before submitting. Photos stay attached to this tree.</p>
            </div>
            {report.trees.length > 1 && <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => removeTree(tree)}><Trash2 className="mr-2 h-4 w-4" />Remove tree {index + 1}</Button>}
          </div>
        </details>;
      })}
      <section className={panel}><Field title="Whole-job notes" hint="Optional. Use this for items that apply to the entire visit."><Textarea className="min-h-28 text-base" maxLength={10000} value={report.general_notes} onChange={event => update({ general_notes: event.target.value })} placeholder="Haul away or leave by the road? Stumps included? Equipment, access, timing, or other customer requests?" /></Field></section>
      <Totals trees={report.trees} />
    </fieldset>
    <div className={cn("sticky z-20 rounded-xl border border-border bg-card/95 p-3 backdrop-blur shadow-xl flex flex-wrap items-center justify-between gap-2", crewView ? "bottom-4" : "bottom-20 lg:bottom-4")}>
      <p role="status" className="text-xs text-muted-foreground">{preparing ? "Preparing photos…" : busy ? "Saving notes and photos…" : disabled ? "Reconnect to save or submit." : dirty ? "Unsaved changes" : "Save a draft or submit for office review"}</p>
      <div className="grid grid-cols-2 w-full sm:w-auto sm:flex gap-2"><Button type="button" variant="outline" className="px-3 text-xs sm:text-sm" disabled={locked} onClick={() => void save("draft")}><Save className="h-4 w-4" />Save draft</Button><Button type="submit" className="px-3 text-xs sm:text-sm" disabled={locked}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit for review</Button></div>
    </div>
  </form>;
}

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
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-2xl font-semibold tracking-tight">Arborist Quotes</h1><p className="text-sm text-muted-foreground mt-1">Tree-by-tree field notes for a clear customer quote.</p></div><Button disabled={writeDisabled || query.isError || query.isLoading} onClick={() => { setSelected(null); setEditing(newArboristQuote(businessId, userId)); }}><Plus className="mr-2 h-4 w-4" />New arborist quote</Button></div>
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
