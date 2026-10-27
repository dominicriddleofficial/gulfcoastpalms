import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, LockKeyhole, TriangleAlert } from "lucide-react";
import { ArboristApiContext, ArboristQuoteEditor, type ArboristApi } from "@/components/platform/arborist/ArboristQuoteEditor";
import { WorkspaceThemeProvider, getWorkspaceTheme, workspaceThemeVars } from "@/contexts/WorkspaceThemeContext";
import { ArboristLinkError, loadGuestReport, readLinkToken, saveGuestReport, signGuestPhotos, stateMessage, uploadGuestPhoto, type LinkState } from "@/lib/arborist-link";
import type { ArboristQuote } from "@/lib/arborist-quotes";
import { Button } from "@/components/ui/button";

type PageState = "loading" | "error" | LinkState;

/** Standalone, no-login GCP field form opened from a private single-quote link. */
export default function ArboristLink() {
  const location = useLocation();
  const [token, setToken] = useState(() => readLinkToken());
  const tokenRef = useRef(token);
  const [state, setState] = useState<PageState>(token ? "loading" : "invalid");
  const [report, setReport] = useState<ArboristQuote | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A new link opened in this same tab (hash change / in-app navigation) replaces the current one:
  // the previous report is cleared before the new token is checked, so it's never shown or saved.
  useEffect(() => {
    const pick = () => {
      if (!window.location.hash || window.location.hash === "#") return;
      const next = readLinkToken();
      if (next === tokenRef.current) return;
      tokenRef.current = next;
      setReport(null); setExpiresAt(null); setLoadError(null);
      setState(next ? "loading" : "invalid");
      setToken(next);
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [location.key, location.hash]);

  useEffect(() => {
    if (!token) { setReport(null); setState("invalid"); return; }
    let live = true;
    setReport(null);
    setState("loading");
    loadGuestReport(token).then(result => { if (!live) return; setReport(result.report); setExpiresAt(result.expiresAt); setState("ok"); })
      .catch(error => { if (!live) return; if (error instanceof ArboristLinkError && error.state) setState(error.state); else { setLoadError(error instanceof Error ? error.message : "Could not open this link."); setState("error"); } });
    return () => { live = false; };
  }, [token, attempt]);

  const api = useMemo<ArboristApi>(() => {
    const guard = async <T,>(work: () => Promise<T>) => {
      try { return await work(); }
      catch (error) { if (error instanceof ArboristLinkError && error.state) setState(error.state); throw error; }
    };
    const key = token ?? "";
    return {
      save: (r, status) => guard(() => saveGuestReport(key, r, status)),
      upload: (_r, treeId, photoId, blob) => guard(() => uploadGuestPhoto(key, treeId, photoId, blob)),
      signUrls: paths => guard(() => signGuestPhotos(key, paths)),
    };
  }, [token]);

  const message = (title: string, body: string, ok = false) => <div className="rounded-2xl border border-border bg-card/95 p-6 text-center space-y-3" role={ok ? "status" : "alert"}>
    {ok ? <CheckCircle2 className="h-10 w-10 text-primary mx-auto" /> : <TriangleAlert className="h-10 w-10 text-amber-300 mx-auto" />}
    <h1 className="font-display text-xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{body}</p>
  </div>;

  return <WorkspaceThemeProvider shortcode="GCP">
    <Helmet>
      <title>Internal arborist quote · Gulf Coast Palms</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="referrer" content="no-referrer" />
    </Helmet>
    <div className="ops-theme min-h-screen bg-background text-foreground" style={workspaceThemeVars(getWorkspaceTheme("GCP"))}>
      <header className="border-b border-border bg-card/80 px-4 py-3"><div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
        <p className="font-display font-semibold text-primary">Gulf Coast Palms</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />Internal arborist quote</p>
      </div></header>
      <main className="mx-auto max-w-3xl p-4 pb-32">
        {state === "loading" && <p role="status" className="py-16 text-center text-muted-foreground">Opening quote form…</p>}
        {state === "error" && <div className="space-y-4">{message("Couldn't open the form", loadError ?? "Check your connection and try again.")}<div className="text-center"><Button onClick={() => setAttempt(n => n + 1)}>Try again</Button></div></div>}
        {state === "submitted" && message("Quote received", "Thanks — the office has your tree notes and photos. This link is now closed for edits.", true)}
        {(state === "invalid" || state === "expired" || state === "revoked") && message(state === "expired" ? "Link expired" : state === "revoked" ? "Link turned off" : "Link not valid", stateMessage(state))}
        {state === "ok" && report && <ArboristApiContext.Provider value={api}>
          <ArboristQuoteEditor key={`${token}:${report.id}`} initial={report} crewView heading="Internal arborist quote"
            intro={<p className="mt-2 text-xs text-muted-foreground">For Gulf Coast Palms office review only — the customer doesn't see this.{expiresAt ? ` Link works until ${new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` : ""}</p>}
            onSaved={saved => { if (saved.status === "submitted") setState("submitted"); else setReport(saved); }} />
        </ArboristApiContext.Provider>}
      </main>
    </div>
  </WorkspaceThemeProvider>;
}
