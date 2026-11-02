import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OPEN_PARAM, PROPERTY_PARAM, SOURCE_PARAM, parseRecordParams, type RecordSource } from "@/lib/search/universalSearch";

export interface DeepLinkTarget { id: string; source: RecordSource; propertyId: string | null }

export interface RecordIdentity { id: string; businessId: string | null | undefined; source: RecordSource }

interface Options<T> {
  businessId: string | null;
  /** True while the page's own list is still loading. */
  listLoading: boolean;
  /** Look in already-loaded list data first (cheap). Result is re-verified with `identify`. */
  findInList: (t: DeepLinkTarget) => T | undefined;
  /** Fetch the record directly, scoped to the business (independent of filters / pagination). */
  fetchOne: (t: DeepLinkTarget, businessId: string) => Promise<T | null>;
  /** Identity used to verify a record really is the requested id + source in the selected business. */
  identify: (record: T) => RecordIdentity;
  onOpen: (record: T, t: DeepLinkTarget) => void;
  /** Close any open detail (URL no longer targets it, or a new target is resolving). */
  onClear: () => void;
}

export type DeepLinkStatus = "idle" | "loading" | "missing" | "error";

export function matchesTarget(identity: RecordIdentity, t: DeepLinkTarget, businessId: string): boolean {
  return identity.id === t.id && identity.source === t.source && identity.businessId === businessId;
}

/**
 * Opens a record's detail view from `?open=<id>&source=<platform|jobber>`.
 * Re-runs per history entry (location.key) so repeated / same-path selections
 * and Back/Forward all behave. A new target (or workspace) immediately closes
 * the previous detail; only a record verified against id + source + business
 * is ever opened, and late responses for an older target are dropped.
 */
export function useRecordDeepLink<T>(opts: Options<T>) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DeepLinkStatus>("idle");
  const ref = useRef(opts);
  ref.current = opts;
  const handledKey = useRef<string | null>(null);
  const hadTarget = useRef(false);
  /** Signature of the target whose detail the hook opened (null while resolving / closed). */
  const openedSig = useRef<string | null>(null);
  const resolvingSig = useRef<string | null>(null);

  const target = parseRecordParams(location.search);
  const targetSig = target ? `${target.id}|${target.source}|${target.propertyId ?? ""}` : "";
  const hasRawParam = new URLSearchParams(location.search).has(OPEN_PARAM);

  useEffect(() => {
    if (!target) {
      resolvingSig.current = null;
      if (hadTarget.current) { hadTarget.current = false; openedSig.current = null; ref.current.onClear(); }
      handledKey.current = null;
      setStatus(hasRawParam ? "missing" : "idle");
      return;
    }
    hadTarget.current = true;
    const bizId = opts.businessId;
    const runKey = `${location.key}|${targetSig}|${bizId ?? ""}`;
    if (handledKey.current === runKey) return;

    // New target / workspace: drop whatever was open before we resolve. openedSig is
    // nulled first so the resulting close never strips the incoming URL.
    if (resolvingSig.current !== runKey) {
      resolvingSig.current = runKey;
      if (openedSig.current !== null) { openedSig.current = null; ref.current.onClear(); }
    }
    if (!bizId || opts.listLoading) { setStatus("loading"); return; }
    handledKey.current = runKey;

    const open = (rec: T) => {
      openedSig.current = runKey;
      setStatus("idle");
      ref.current.onOpen(rec, target);
    };

    const inList = ref.current.findInList(target);
    if (inList && matchesTarget(ref.current.identify(inList), target, bizId)) { open(inList); return; }

    let cancelled = false;
    setStatus("loading");
    ref.current.fetchOne(target, bizId).then(
      (rec) => {
        if (cancelled || resolvingSig.current !== runKey) return;
        if (rec && matchesTarget(ref.current.identify(rec), target, bizId)) open(rec);
        else setStatus("missing");
      },
      () => { if (!cancelled && resolvingSig.current === runKey) setStatus("error"); },
    );
    return () => { cancelled = true; if (handledKey.current === runKey) handledKey.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, targetSig, hasRawParam, opts.businessId, opts.listLoading]);

  /** Remove the record params (call when the detail sheet closes). */
  const clear = useCallback(() => {
    const p = new URLSearchParams(location.search);
    if (!p.has(OPEN_PARAM)) return;
    p.delete(OPEN_PARAM); p.delete(SOURCE_PARAM); p.delete(PROPERTY_PARAM);
    hadTarget.current = false;
    openedSig.current = null;
    resolvingSig.current = null;
    setStatus("idle");
    const qs = p.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "", hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);

  /** Clear only if the detail being closed is the one this link opened (not an internal swap). */
  const clearIfOpened = useCallback(() => {
    if (openedSig.current !== null) clear();
  }, [clear]);

  return { status, target, clear, clearIfOpened };
}

/** Clear the record params when a detail view opened from the link gets closed (any close path). */
export function useClearOnClose(selected: unknown, deepLink: { clearIfOpened: () => void }) {
  const wasOpen = useRef(false);
  const { clearIfOpened } = deepLink;
  useEffect(() => {
    if (selected) { wasOpen.current = true; return; }
    if (wasOpen.current) { wasOpen.current = false; clearIfOpened(); }
  }, [selected, clearIfOpened]);
}
