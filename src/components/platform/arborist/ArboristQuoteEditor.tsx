import { cloneElement, createContext, useContext, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, ImagePlus, Loader2, LockKeyhole, Plus, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prepareArboristPhoto, saveArboristQuote, uploadArboristPhoto } from "@/hooks/useArboristQuotes";
import { ARBORIST_PHOTO_BUCKET, ARBORIST_SERVICES, ARBORIST_STATUSES, MAX_TREE_PHOTOS, MAX_TREES, newArboristTree, priceLabel, quoteTotals, totalLabel, validateArboristQuote, type ArboristPhoto, type ArboristQuote, type ArboristTree } from "@/lib/arborist-quotes";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Storage/save backend for the editor: signed-in staff by default, or a guest quote link. */
export interface ArboristApi {
  save: (report: ArboristQuote, status: ArboristQuote["status"]) => Promise<ArboristQuote>;
  upload: (report: ArboristQuote, treeId: string, photoId: string, blob: Blob) => Promise<string>;
  signUrls: (paths: string[]) => Promise<{ path: string | null; signedUrl: string }[]>;
}
export const defaultArboristApi: ArboristApi = {
  save: saveArboristQuote,
  upload: uploadArboristPhoto,
  signUrls: async paths => {
    const { data, error } = await supabase.storage.from(ARBORIST_PHOTO_BUCKET).createSignedUrls(paths, 3600);
    if (error) throw error;
    return data;
  },
};
export const ArboristApiContext = createContext<ArboristApi>(defaultArboristApi);

export const panel = "rounded-2xl border border-border bg-card/95 p-4 sm:p-6";
export const selectClass = "flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const errorText = (error: unknown) => error instanceof Error ? error.message : "Could not save. Your form is still here; try again.";
export function Field({ title, hint, children }: { title: string; hint?: string; children: ReactElement<{ id?: string; "aria-describedby"?: string }> }) {
  const id = useId();
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{title}</label>{cloneElement(children, { id, "aria-describedby": hint ? `${id}-hint` : undefined })}{hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
export function Status({ status }: { status: ArboristQuote["status"] }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap", status === "submitted" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : status === "reviewed" ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground")}>{ARBORIST_STATUSES[status]}</span>;
}
export function PrivateNote() {
  return <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />Internal only · notes and suggested prices for office review</p>;
}

export function SignedPhotos({ photos, onRemove }: { photos: ArboristPhoto[]; onRemove?: (id: string) => void }) {
  const api = useContext(ArboristApiContext);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["arborist-photo-links", photos.map(photo => photo.path)],
    queryFn: () => api.signUrls(photos.map(photo => photo.path)), enabled: photos.length > 0, staleTime: 8 * 60_000, refetchInterval: 8 * 60_000, placeholderData: () => undefined,
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

export function Totals({ trees }: { trees: ArboristTree[] }) {
  const totals = quoteTotals(trees);
  return <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-sm font-medium">{totals.unpriced ? "Priced trees subtotal" : "Suggested job total"}</p><p className="text-xs text-muted-foreground mt-1">{trees.length} tree{trees.length === 1 ? "" : "s"}{totals.unpriced ? ` · ${totals.unpriced} still need pricing` : " · sum of per-tree suggestions"}</p></div>
    <p className="text-xl font-semibold tabular-nums tracking-tight text-primary">{totalLabel(trees)}</p>
  </div>;
}

interface PendingPhoto { id: string; treeId: string; name: string; blob: Blob; preview: string }

export function ArboristQuoteEditor({ initial, onBack, onSaved, disabled = false, crewView = false, heading, intro }: { initial: ArboristQuote; onBack?: () => void; onSaved: (report: ArboristQuote) => void; disabled?: boolean; crewView?: boolean; heading?: string; intro?: ReactNode }) {
  const api = useContext(ArboristApiContext);
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
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
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
    // Stop the whole save sequence if this form was closed (e.g. a different link opened)
    // or the server answered for a different report.
    const current = (r: ArboristQuote) => {
      if (!mountedRef.current) return false;
      if (r.id !== initial.id) throw new Error("This form changed. Reload to continue.");
      return true;
    };
    try {
      if (pending.length) {
        // Create/save the parent draft before any upload. A failed upload never submits a partial report.
        working = await api.save(working, "draft");
        if (!current(working)) return;
        setReport(working);
        for (const photo of pending) {
          const path = await api.upload(working, photo.treeId, photo.id, photo.blob);
          if (!mountedRef.current) return;
          working = { ...working, trees: working.trees.map(tree => tree.id === photo.treeId ? { ...tree, photos: [...tree.photos, { id: photo.id, path, name: photo.name }] } : tree) };
          setReport(working); discardPending([photo.id]);
        }
      }
      const saved = await api.save(working, status);
      if (!current(saved)) return;
      setReport(saved); setDirty(false);
      toast.success(status === "submitted" ? "Submitted for office review" : "Draft saved");
      onSaved(saved);
    } catch (error) { if (mountedRef.current) setErrors([errorText(error)]); }
    finally { savingRef.current = false; if (mountedRef.current) setBusy(false); }
  };
  const locked = busy || preparing || disabled;
  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save("submitted"); }}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>{onBack && <Button type="button" variant="ghost" className="-ml-3 mb-2" disabled={busy || preparing} onClick={() => { if (!dirty || window.confirm("Leave this form? Changes since your last save and newly added photos will be lost.")) onBack(); }}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
        <h1 className="font-display text-2xl font-semibold tracking-tight">{heading ?? (initial.version ? "Edit arborist quote" : "New arborist quote")}</h1><p className="mt-1 text-sm text-muted-foreground">One tree at a time. Keep the photo, scope, and price together.</p>{intro}</div>
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

