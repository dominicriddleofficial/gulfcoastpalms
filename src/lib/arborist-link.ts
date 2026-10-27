import { supabase } from "@/integrations/supabase/client";
import type { ArboristQuote, ArboristTree } from "@/lib/arborist-quotes";

export const ARBORIST_LINK_PATH = "/arborist-link";
export const ARBORIST_LINK_STORAGE_KEY = "gcp-arborist-link";
export type LinkState = "ok" | "invalid" | "expired" | "revoked" | "submitted";

export class ArboristLinkError extends Error {
  constructor(message: string, public state?: LinkState) { super(message); }
}

const endpoint = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arborist-link`;

async function call<T>(body: Record<string, unknown>, auth?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: "POST", referrerPolicy: "no-referrer", cache: "no-store",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch { throw new ArboristLinkError("No connection. Your form is still here; try again."); }
  const data = await response.json().catch(() => ({})) as { error?: string; state?: LinkState };
  if (!response.ok) throw new ArboristLinkError(data.error || (data.state ? stateMessage(data.state) : "Something went wrong. Try again."), data.state);
  return data as T;
}

export function stateMessage(state: LinkState): string {
  return state === "expired" ? "This quote link has expired. Ask the office for a new link."
    : state === "revoked" ? "This quote link was turned off. Ask the office for a new link."
    : state === "submitted" ? "This quote was already submitted. Thanks — the office has it."
    : "This link isn't valid. Check that you opened the full link, or ask the office for a new one.";
}

export function buildArboristLink(token: string, origin = window.location.origin) {
  return `${origin}${ARBORIST_LINK_PATH}#t=${token}`;
}
export function arboristLinkMessage(link: string) {
  return `Gulf Coast Palms internal arborist quote form: ${link}\nThis private link expires in 7 days.`;
}
export function smsComposeHref(message: string) {
  return `sms:?&body=${encodeURIComponent(message)}`;
}

const TOKEN_IN_HASH = /(?:^#|&)t=([A-Za-z0-9_-]{43})(?:&|$)/;
let memoryToken: string | null = null;

function rememberToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(ARBORIST_LINK_STORAGE_KEY, token);
    else sessionStorage.removeItem(ARBORIST_LINK_STORAGE_KEY);
  } catch { /* storage blocked: memory copy still works for this page */ }
}

/**
 * Reads the private link token. A fragment in the address bar (or the early capture in index.html)
 * always wins and replaces any earlier token; a malformed one clears it, so an invalid link can never
 * reopen a previous quote. The fragment is always removed from the address bar.
 */
export function readLinkToken(): string | null {
  const w = window as Window & { __gcpArboristToken?: string };
  const hash = window.location.hash;
  let incoming: string | undefined;
  if (hash && hash !== "#") {
    incoming = TOKEN_IN_HASH.exec(hash)?.[1] ?? "";
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* best effort */ }
  } else if (typeof w.__gcpArboristToken === "string") {
    incoming = w.__gcpArboristToken;
  }
  delete w.__gcpArboristToken;
  if (incoming !== undefined) { rememberToken(incoming || null); return incoming || null; }
  if (memoryToken) return memoryToken;
  try { return sessionStorage.getItem(ARBORIST_LINK_STORAGE_KEY); } catch { return null; }
}

/** Test-only: forget the in-memory token. */
export function resetLinkTokenForTests() { memoryToken = null; }

async function staffToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ArboristLinkError("Sign in again to manage quote links.");
  return token;
}

export interface IssuedLink { token: string; report_id: string; expires_at: string }
export async function issueArboristLink(input: { businessId: string; reportId?: string; customerName?: string; propertyAddress?: string; arboristName?: string }) {
  return call<IssuedLink>({ action: "issue", business_id: input.businessId, report_id: input.reportId ?? null, customer_name: input.customerName ?? "", property_address: input.propertyAddress ?? "", arborist_name: input.arboristName ?? "" }, await staffToken());
}
export async function revokeArboristLink(reportId: string) {
  return call<{ disabled: number }>({ action: "revoke", report_id: reportId }, await staffToken());
}

type GuestRow = Omit<ArboristQuote, "business_id" | "author_id" | "trees" | "status"> & { trees: ArboristTree[]; status: ArboristQuote["status"] };
const toQuote = (row: GuestRow): ArboristQuote => ({ ...row, business_id: "", author_id: "" } as ArboristQuote);

export async function loadGuestReport(token: string) {
  const data = await call<{ report: GuestRow; expires_at: string }>({ action: "load", token });
  return { report: toQuote(data.report), expiresAt: data.expires_at };
}
export async function saveGuestReport(token: string, report: ArboristQuote, status: "draft" | "submitted" | "reviewed") {
  if (status === "reviewed") throw new ArboristLinkError("Only the office can mark reports reviewed.");
  const fields = { customer_name: report.customer_name, property_address: report.property_address, visit_date: report.visit_date, arborist_name: report.arborist_name, general_notes: report.general_notes, trees: report.trees };
  const data = await call<{ report: GuestRow }>({ action: "save", token, version: report.version, status, fields });
  return toQuote(data.report);
}
async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export async function uploadGuestPhoto(token: string, treeId: string, photoId: string, blob: Blob) {
  const data = await call<{ path: string }>({ action: "upload", token, tree_id: treeId, photo_id: photoId, data: await blobBase64(blob) });
  return data.path;
}
export async function signGuestPhotos(token: string, paths: string[]) {
  const data = await call<{ urls: { path: string; signedUrl: string }[] }>({ action: "sign", token, paths });
  return data.urls;
}
