import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OPEN_PARAM, PROPERTY_PARAM, SOURCE_PARAM, parseRecordParams, type RecordSource } from "@/lib/search/universalSearch";

export interface DeepLinkTarget { id: string; source: RecordSource; propertyId: string | null }

interface Options<T> {
  businessId: string | null;
  /** True while the page's own list is still loading. */
  listLoading: boolean;
  /** Look in already-loaded list data first (cheap). */
  findInList: (t: DeepLinkTarget) => T | undefined;
  /** Fetch the record directly, scoped to the business (independent of filters / pagination). */
  fetchOne: (t: DeepLinkTarget, businessId: string) => Promise<T | null>;
  onOpen: (record: T, t: DeepLinkTarget) => void;
  /** Called when the URL no longer targets a record (e.g. browser Back). */
  onClear: () => void;
}

export type DeepLinkStatus = "idle" | "loading" | "missing" | "error";

/**
 * Opens a record's detail view from `?open=<id>&source=<platform|jobber>`.
 * Re-runs per history entry (location.key) so repeated / same-path selections
 * and Back/Forward all behave. Never falls back silently to the generic list.
 */
export function useRecordDeepLink<T>(opts: Options<T>) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DeepLinkStatus>("idle");
  const ref = useRef(opts);
  ref.current = opts;
  const handledKey = useRef<string | null>(null);
  const hadTarget = useRef(false);

  const target = parseRecordParams(location.search);
  const targetSig = target ? `${target.id}|${target.source}|${target.propertyId ?? ""}` : "";
  const hasRawParam = new URLSearchParams(location.search).has(OPEN_PARAM);

  useEffect(() => {
    if (!target) {
      if (hadTarget.current) { hadTarget.current = false; ref.current.onClear(); }
      handledKey.current = null;
      setStatus(hasRawParam ? "missing" : "idle");
      return;
    }
    hadTarget.current = true;
    const bizId = opts.businessId;
    if (!bizId || opts.listLoading) { setStatus("loading"); return; }
    const runKey = `${location.key}|${targetSig}|${bizId}`;
    if (handledKey.current === runKey) return;
    handledKey.current = runKey;

    const inList = ref.current.findInList(target);
    if (inList) { setStatus("idle"); ref.current.onOpen(inList, target); return; }

    let cancelled = false;
    setStatus("loading");
    ref.current.fetchOne(target, bizId).then(
      (rec) => {
        if (cancelled) return;
        if (rec) { setStatus("idle"); ref.current.onOpen(rec, target); }
        else setStatus("missing");
      },
      () => { if (!cancelled) setStatus("error"); },
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
    setStatus("idle");
    const qs = p.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "", hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);

  return { status, target, clear };
}

/** Clear the record params when a detail view that was open gets closed (any close path). */
export function useClearOnClose(selected: unknown, clear: () => void) {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (selected) { wasOpen.current = true; return; }
    if (wasOpen.current) { wasOpen.current = false; clear(); }
  }, [selected, clear]);
}
