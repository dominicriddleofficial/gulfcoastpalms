// Pure helpers for the arborist guest-link function. Never log tokens.
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const LINK_STATES = ["invalid", "expired", "revoked", "submitted"] as const;

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function decodeJpeg(base64: unknown): Uint8Array | null {
  if (typeof base64 !== "string" || base64.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 4) return null;
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)); } catch { return null; }
  if (bytes.length < 4 || bytes.length > MAX_PHOTO_BYTES) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  return bytes;
}

export function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Maps database errors to safe responses. Only our own validation messages pass through. */
export function mapDbError(message: string): { status: number; body: Record<string, unknown> } {
  if (message === "link_stale") return { status: 409, body: { error: "This form was saved from another screen. Reload the link before making more changes." } };
  if (message === "link_photo_limit") return { status: 400, body: { error: "This tree has reached its photo upload limit." } };
  if (message === "link_bad_photo") return { status: 400, body: { error: "Save the draft before adding photos to this tree." } };
  if (message === "link_bad_status" || message === "link_bad_fields") return { status: 400, body: { error: "This form could not be saved. Reload the link and try again." } };
  const state = message.startsWith("link_") ? message.slice(5) : "";
  if ((LINK_STATES as readonly string[]).includes(state)) return { status: 410, body: { state } };
  if (message === "not_allowed") return { status: 403, body: { error: "Only the owner or office can manage arborist quote links." } };
  if (message === "not_draft") return { status: 409, body: { error: "This report was already submitted, so it can't get a new link." } };
  if (message === "not_found") return { status: 404, body: { error: "Report not found." } };
  if (/^(Each |Tree |Invalid |Add a price|Customer, property|Photo |High price|Choose fixed|A report needs|This quote link)/.test(message)) return { status: 400, body: { error: message } };
  return { status: 500, body: { error: "Something went wrong. Try again." } };
}

export interface ReportRow {
  id: string; customer_name: string; property_address: string; visit_date: string; arborist_name: string;
  general_notes: string; trees: unknown; status: string; version: number; submitted_at: string | null;
}
/** Whitelists report fields sent to a guest. */
export function guestReport(row: ReportRow) {
  return {
    id: row.id, customer_name: row.customer_name, property_address: row.property_address, visit_date: row.visit_date,
    arborist_name: row.arborist_name, general_notes: row.general_notes, trees: row.trees, status: row.status,
    version: row.version, submitted_at: row.submitted_at,
  };
}

export function reportPhotoPaths(trees: unknown): Set<string> {
  const paths = new Set<string>();
  if (!Array.isArray(trees)) return paths;
  for (const tree of trees) {
    const photos = (tree as { photos?: unknown })?.photos;
    if (Array.isArray(photos)) for (const p of photos) { const path = (p as { path?: unknown })?.path; if (typeof path === "string") paths.add(path); }
  }
  return paths;
}
