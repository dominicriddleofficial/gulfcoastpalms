import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Upload, Sparkles, Loader2, AlertTriangle, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { QUOTE_UNITS } from "@/lib/quote-units";
import {
  parseAiDraft, toReviewLines, lineStatus, reviewTotals, scopeText, toAppliedLines, formatCents,
  type ReviewLine, type AppliedLine,
} from "@/lib/quote-ai";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_RECORD_SECONDS = 10 * 60;
const MAX_CHARS = 8000;

export interface QuoteAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  hasExistingWork: boolean;
  settingsSummary: string;
  onApply: (draft: { scope: string; lines: AppliedLine[] }) => void;
}

async function callQuoteAi(body: FormData | string, signal: AbortSignal): Promise<Record<string, unknown>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Sign in again.");
  let res: Response;
  try {
    res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-ai`, {
      method: "POST", signal, body,
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(typeof body === "string" ? { "Content-Type": "application/json" } : {}) },
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new Error("Upload failed or timed out. Check your connection and try again — your work is kept.");
  }
  const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof payload.error === "string" ? payload.error : `The quote assistant failed (${res.status}).`);
  return payload;
}

/** iPhone voice memos can be raw AAC, which the transcription provider rejects: decode on-device and send 16 kHz WAV. */
async function aacToWav(file: File): Promise<File> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const rate = 16000;
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const src = offline.createBufferSource(); src.buffer = decoded; src.connect(offline.destination); src.start();
    const pcm = (await offline.startRendering()).getChannelData(0);
    const buf = new ArrayBuffer(44 + pcm.length * 2); const v = new DataView(buf);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) { const s = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return new File([buf], file.name.replace(/\.aac$/i, ".wav"), { type: "audio/wav" });
  } finally { void ctx.close(); }
}

function recorderMime(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return typeof MediaRecorder !== "undefined" ? options.find(t => MediaRecorder.isTypeSupported?.(t)) ?? "" : "";
}

export default function QuoteAssistant({ open, onOpenChange, businessId, hasExistingWork, settingsSummary, onApply }: QuoteAssistantProps) {
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState<"" | "transcribing" | "generating">("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [scope, setScope] = useState("");
  const [lines, setLines] = useState<ReviewLine[] | null>(null);
  const [unresolvedNotes, setUnresolvedNotes] = useState<string[]>([]);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const releaseMic = useCallback((discard: boolean) => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    const rec = recorderRef.current;
    if (rec && discard) rec.ondataavailable = null;
    if (rec && rec.state !== "inactive") { if (discard) rec.onstop = null; rec.stop(); }
    if (discard) { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; recorderRef.current = null; }
    setRecording(false);
  }, []);

  const cancelWork = useCallback(() => { seqRef.current++; abortRef.current?.abort(); abortRef.current = null; setBusy(""); }, []);

  // Closing, unmounting or switching workspace stops the mic and drops in-flight results.
  useEffect(() => { if (!open) { releaseMic(true); cancelWork(); setConfirmReplace(false); } }, [open, releaseMic, cancelWork]);
  useEffect(() => () => { releaseMic(true); cancelWork(); }, [releaseMic, cancelWork]);
  useEffect(() => { cancelWork(); setLines(null); setScope(""); setError(""); }, [businessId, cancelWork]);

  const transcribe = async (file: File) => {
    setError("");
    if (!file.size) { setError("The recording is empty. Try again."); return; }
    if (file.size > MAX_BYTES) { setError("That voice memo is over 20 MB. Record a shorter memo or trim it."); return; }
    const seq = ++seqRef.current; const ctrl = new AbortController(); abortRef.current = ctrl;
    setBusy("transcribing");
    try {
      let upload = file;
      if (/\.aac$/i.test(file.name) || file.type === "audio/aac" || file.type === "audio/x-aac") {
        try { upload = await aacToWav(file); } catch { throw new Error("This .aac memo couldn't be read on this device. Share it as .m4a and try again."); }
        if (upload.size > MAX_BYTES) throw new Error("That memo is too long once converted. Record a shorter memo.");
      }
      const form = new FormData(); form.append("business_id", businessId); form.append("file", upload, upload.name);
      const res = await callQuoteAi(form, ctrl.signal);
      if (seq !== seqRef.current) return;
      const text = typeof res.text === "string" ? res.text.trim() : "";
      if (!text) throw new Error("No speech was found in that recording.");
      setTranscript(prev => (prev.trim() ? `${prev.trim()}\n${text}` : text).slice(0, MAX_CHARS));
    } catch (err) {
      if (seq === seqRef.current && !ctrl.signal.aborted) setError(err instanceof Error ? err.message : "Transcription failed.");
    } finally { if (seq === seqRef.current) setBusy(""); }
  };

  const startRecording = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Recording isn't supported in this browser. Upload a voice memo or use keyboard dictation instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!open) { stream.getTracks().forEach(t => t.stop()); return; }
      const mime = recorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); streamRef.current = null; recorderRef.current = null;
        const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
        const ext = type.includes("mp4") ? "m4a" : type.includes("wav") ? "wav" : "webm";
        void transcribe(new File(chunks, `recording.${ext}`, { type: type.replace("video/", "audio/") }));
      };
      streamRef.current = stream; recorderRef.current = rec;
      rec.start(1000); setRecording(true); setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds(s => { if (s + 1 >= MAX_RECORD_SECONDS) releaseMic(false); return s + 1; }), 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(name === "NotAllowedError" ? "Microphone access was blocked. Allow the microphone in your browser settings, or upload a voice memo." :
        name === "NotFoundError" ? "No microphone was found on this device." : "Couldn't start recording. Try uploading a voice memo instead.");
    }
  };

  const generate = async () => {
    setError("");
    if (!transcript.trim()) { setError("Type, dictate or record a description first."); return; }
    const seq = ++seqRef.current; const ctrl = new AbortController(); abortRef.current = ctrl;
    setBusy("generating");
    try {
      const res = await callQuoteAi(JSON.stringify({ business_id: businessId, transcript }), ctrl.signal);
      if (seq !== seqRef.current) return;
      const draft = parseAiDraft(res.draft);
      if (!draft.lines.length && !draft.sections.length) throw new Error("No quotable work was found in that description.");
      setScope(scopeText(draft)); setLines(toReviewLines(draft)); setUnresolvedNotes(draft.unresolved); setConfirmReplace(false);
    } catch (err) {
      if (seq === seqRef.current && !ctrl.signal.aborted) setError(err instanceof Error ? err.message : "Quote generation failed.");
    } finally { if (seq === seqRef.current) setBusy(""); }
  };

  const totals = useMemo(() => reviewTotals(lines ?? []), [lines]);
  const update = (id: string, patch: Partial<ReviewLine>) => setLines(ls => ls?.map(l => l.id === id ? { ...l, ...patch, issue: patch.rate !== undefined || patch.qty !== undefined ? null : l.issue } : l) ?? null);

  const apply = () => {
    if (!lines) return;
    if (hasExistingWork && !confirmReplace) { setConfirmReplace(true); return; }
    onApply({ scope, lines: toAppliedLines(lines) });
    onOpenChange(false);
    setLines(null); setScope(""); setConfirmReplace(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="ops-theme h-[94vh] sm:h-[90vh] p-0 bg-background border-border flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0 text-left">
          <SheetTitle className="font-display text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Describe your quote</SheetTitle>
          <SheetDescription className="font-body text-xs text-muted-foreground">Type, dictate with your keyboard mic, record, or upload a voice memo. AI creates a draft you review — nothing is sent.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 max-w-3xl w-full mx-auto">
          <div className="flex flex-wrap gap-2">
            {recording ? (
              <Button type="button" variant="destructive" onClick={() => releaseMic(false)} aria-label="Stop recording">
                <Square className="w-4 h-4 mr-1.5" />Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={!!busy} onClick={() => void startRecording()}><Mic className="w-4 h-4 mr-1.5" />Record voice memo</Button>
            )}
            <Button type="button" variant="outline" disabled={!!busy || recording} onClick={() => fileInput.current?.click()}><Upload className="w-4 h-4 mr-1.5" />Upload memo</Button>
            <input ref={fileInput} type="file" className="hidden" data-testid="quote-ai-file"
              accept="audio/*,.m4a,.mp4,.aac,.webm,.wav,.mp3"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void transcribe(f); }} />
          </div>
          <div>
            <label htmlFor="quote-ai-transcript" className="font-body text-[11px] font-medium text-muted-foreground mb-1 block">Description (edit freely)</label>
            <Textarea id="quote-ai-transcript" value={transcript} maxLength={MAX_CHARS} onChange={e => setTranscript(e.target.value)}
              placeholder="e.g. Patio 605 sq ft at $7.50 a square foot: prep, vapor barrier, base coat with flake, top coat…"
              className="bg-card border-border font-body text-sm min-h-[120px]" />
            <p className="font-body text-[10px] text-muted-foreground mt-1">{transcript.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</p>
          </div>
          {busy && <p role="status" className="font-body text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{busy === "transcribing" ? "Transcribing your memo…" : "Building your quote draft…"}<button type="button" className="text-primary underline text-xs" onClick={cancelWork}>Cancel</button></p>}
          {error && <p role="alert" className="font-body text-sm text-destructive flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
          <Button type="button" className="w-full" disabled={!!busy || recording || !transcript.trim()} onClick={() => void generate()}><Sparkles className="w-4 h-4 mr-1.5" />Generate quote</Button>

          {lines && (
            <section className="space-y-3 border-t border-border pt-4" aria-label="Generated draft">
              <div>
                <label htmlFor="quote-ai-scope" className="font-body text-[11px] font-medium text-muted-foreground mb-1 block">Scope of work (shown to customer)</label>
                <Textarea id="quote-ai-scope" value={scope} onChange={e => setScope(e.target.value)} className="bg-card border-border font-body text-sm min-h-[160px]" />
              </div>
              <div className="space-y-2">
                {lines.map(l => {
                  const s = lineStatus(l);
                  return (
                    <div key={l.id} className="rounded-lg border border-border bg-card p-2.5 space-y-2">
                      <div className="flex gap-2">
                        <Input aria-label="Line description" value={l.description} onChange={e => update(l.id, { description: e.target.value })} className="bg-secondary/50 font-body text-sm" />
                        <button type="button" aria-label="Remove line" onClick={() => setLines(ls => ls?.filter(x => x.id !== l.id) ?? null)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[100px_110px_110px_1fr] gap-2 items-center">
                        <Input aria-label="Quantity" inputMode="decimal" placeholder="Qty" value={l.qty} onChange={e => update(l.id, { qty: e.target.value })} className="bg-secondary/50 font-body text-sm text-center" />
                        <select aria-label="Unit" value={l.unit} onChange={e => update(l.id, { unit: e.target.value })} className="h-10 rounded-md border border-border bg-secondary/50 px-2 font-body text-sm text-foreground">
                          {QUOTE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <Input aria-label="Rate" inputMode="decimal" placeholder="Rate $" value={l.rate} onChange={e => update(l.id, { rate: e.target.value })} className="bg-secondary/50 font-body text-sm text-right" />
                        <span className="col-span-3 sm:col-span-1 text-right font-body text-sm font-semibold text-foreground">{s.cents === null ? "—" : formatCents(s.cents)}</span>
                      </div>
                      {s.problem && <p className="font-body text-xs text-amber-400 flex items-center gap-1.5" data-testid="quote-ai-unresolved"><AlertTriangle className="w-3.5 h-3.5" />Needs price: {s.problem}</p>}
                    </div>
                  );
                })}
                <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => setLines(ls => [...(ls ?? []), { id: crypto.randomUUID(), description: "", qty: "1", unit: "each", rate: "", issue: null }])}><Plus className="w-3.5 h-3.5 mr-1" />Add line</Button>
              </div>
              {unresolvedNotes.length > 0 && <ul className="font-body text-xs text-muted-foreground list-disc pl-5">{unresolvedNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
              <div className="rounded-lg border border-border bg-card p-3 font-body text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Quoted work subtotal</span><span className="font-semibold text-foreground" data-testid="quote-ai-subtotal">{formatCents(totals.subtotalCents)}</span></div>
                {totals.unresolved > 0 && <p className="text-xs text-amber-400">{totals.unresolved} line{totals.unresolved === 1 ? "" : "s"} still need a price — not counted, and the quote can't be saved until priced.</p>}
                <p className="text-xs text-muted-foreground">Tax, discount and deposit are not set by AI. Current quote settings stay as they are: {settingsSummary}.</p>
              </div>
              {confirmReplace && <p role="alert" className="font-body text-sm text-amber-400">This replaces the current scope of work and line items in the quote. Tap Apply again to confirm.</p>}
              <div className="flex gap-2 pb-6">
                <Button type="button" className="flex-1" onClick={apply}>{confirmReplace ? "Replace and apply" : "Apply to quote"}</Button>
                {confirmReplace && <Button type="button" variant="outline" onClick={() => setConfirmReplace(false)}>Keep current</Button>}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
