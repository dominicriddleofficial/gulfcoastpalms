// Pure authorization + bounds logic (no Deno/npm imports) so it can be unit tested.

export const QUOTE_AI_ROLES = ["owner", "office_manager", "manager"] as const;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_TRANSCRIPT_CHARS = 8000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Formats the transcription provider actually accepted in verification (raw ADTS .aac is rejected upstream). */
const AUDIO_TYPES: Record<string, string> = {
  m4a: "audio/mp4", mp4: "audio/mp4", webm: "audio/webm", wav: "audio/wav",
  mp3: "audio/mpeg", mpeg: "audio/mpeg", mpga: "audio/mpeg", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac",
};

export type AuthDecision = { ok: true } | { ok: false; status: number; error: string };

export function decideQuoteAiAccess(input: {
  userId: string | null; businessId: unknown; restrictedClimber: boolean | null; role: string | null;
}): AuthDecision {
  if (!input.userId) return { ok: false, status: 401, error: "Sign in to use the quote assistant." };
  if (typeof input.businessId !== "string" || !UUID.test(input.businessId)) return { ok: false, status: 400, error: "Select a workspace first." };
  // Unknown restriction state is treated as restricted.
  if (input.restrictedClimber !== false) return { ok: false, status: 403, error: "This account can access Arborist Quotes only." };
  if (!input.role || !(QUOTE_AI_ROLES as readonly string[]).includes(input.role)) {
    return { ok: false, status: 403, error: "Only owners and office managers can build quotes for this workspace." };
  }
  return { ok: true };
}

/** Returns the upload MIME type the provider accepts, or an error message. */
export function audioUploadType(name: string, size: number): { type: string } | { error: string } {
  if (!size) return { error: "The recording is empty. Record or choose a voice memo again." };
  if (size > MAX_AUDIO_BYTES) return { error: "That voice memo is over 20 MB. Record a shorter memo or trim it." };
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "aac") return { error: "Raw .aac files need converting first. Try again from the app, or share the memo as .m4a." };
  const type = AUDIO_TYPES[ext];
  if (!type) return { error: "Unsupported audio format. Use m4a, mp4, webm, wav or mp3." };
  return { type };
}

/** Hard safety ceiling for a single transcription response (well above the generation limit). */
export const MAX_TRANSCRIPT_RESPONSE_CHARS = 100_000;

/** Shapes a finished transcript: returns it whole, or an explicit error — never a silently cut transcript. */
export function shapeTranscript(raw: string): { text: string } | { error: string; status: number } {
  const text = raw.trim();
  if (!text) return { error: "No speech was found in that recording.", status: 422 };
  if (text.length > MAX_TRANSCRIPT_RESPONSE_CHARS) {
    return { error: "That recording is too long to transcribe in full. Split it into shorter memos.", status: 413 };
  }
  return { text };
}
