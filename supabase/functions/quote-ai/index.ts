import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { streamText, Output, jsonSchema, APICallError, NoObjectGeneratedError } from "npm:ai@6";
import { decideQuoteAiAccess, audioUploadType, MAX_AUDIO_BYTES, MAX_TRANSCRIPT_CHARS, shapeTranscript } from "./authz.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const TRANSCRIBE_MODEL = "openai/gpt-transcribe";
const QUOTE_MODEL = "openai/gpt-6-astra";
const headers = { ...corsHeaders, "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

const UNITS = ["sq_ft", "linear_ft", "each", "hour", "job"];
const QUOTE_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["title", "sections", "lines", "unresolved"],
  properties: {
    title: { type: ["string", "null"] },
    sections: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["heading", "quantity", "unit", "steps", "exclusions"],
      properties: {
        heading: { type: "string" }, quantity: { type: ["number", "null"] }, unit: { type: "string", enum: UNITS },
        steps: { type: "array", items: { type: "string" } }, exclusions: { type: "array", items: { type: "string" } },
      } } },
    lines: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["section_index", "description", "quantity", "unit", "unit_rate", "price_status", "issue"],
      properties: {
        section_index: { type: ["integer", "null"] }, description: { type: "string" },
        quantity: { type: ["number", "null"] }, unit: { type: "string", enum: UNITS },
        unit_rate: { type: ["number", "null"] }, price_status: { type: "string", enum: ["stated", "missing", "ambiguous"] },
        issue: { type: ["string", "null"] },
      } } },
    unresolved: { type: "array", items: { type: "string" } },
  },
};

const INSTRUCTIONS = `You turn a contractor's spoken or typed job description into a reviewable quote DRAFT.
Rules:
- Create one scope section per explicit area/job (e.g. Patio, Garage). Steps keep the speaker's exact order, materials and coating names; write them in short professional wording.
- Record every explicit exclusion (e.g. "no moisture vapor barrier") in that section's exclusions.
- Create one billing line per priced area. When a per-square-foot (or per-unit) rate covers several steps, those steps are included scope, NOT separate billing lines.
- Use unit "sq_ft" for square-foot pricing, "linear_ft" for linear feet, "hour" for hourly, "job" for a single lump sum, "each" only for counted items.
- unit_rate is the stated price per unit in dollars. NEVER compute or output totals. If a rate or quantity is not stated or is unclear, set it to null, set price_status to "missing" or "ambiguous", and explain in issue. Never use 0 as a substitute.
- Do NOT invent brands, colors, warranties, dates, guarantees, discounts, taxes, deposits, customer names or extra services. Do not mention tax or deposits as billing lines.
- List anything unclear in unresolved. section_index is the 0-based index of the section a line bills for.`;

async function authorize(req: Request, businessId: unknown) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  let userId: string | null = null;
  if (token) { const { data } = await db.auth.getUser(token); userId = data.user?.id ?? null; }
  let restricted: boolean | null = null; let role: string | null = null;
  if (userId && typeof businessId === "string") {
    const [r, g] = await Promise.all([
      db.rpc("is_restricted_climber", { _user_id: userId }),
      db.rpc("get_user_role", { _user_id: userId, _business_id: businessId }),
    ]);
    restricted = r.error ? null : r.data as boolean;
    role = g.error ? null : (g.data as string | null);
  }
  return decideQuoteAiAccess({ userId, businessId, restrictedClimber: restricted, role });
}

function gatewayError(status: number, body: string) {
  let message = "";
  try { const p = JSON.parse(body); message = p?.error?.message || p?.message || ""; } catch { /* ignore */ }
  if (status === 402) return json({ error: message || "AI credits are used up. Add credits in Settings → Plans & credits." }, 402);
  if (status === 429) return json({ error: "The AI service is busy. Wait a moment and try again." }, 429);
  if (status === 400) return json({ error: message ? `The audio could not be transcribed: ${message}` : "The audio could not be transcribed." }, 400);
  if (status === 403) return json({ error: message || "AI access is blocked for this workspace." }, 403);
  return json({ error: "The AI service failed. Your work is kept; try again." }, status >= 500 ? 502 : status);
}

async function transcribe(req: Request, apiKey: string) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_AUDIO_BYTES + 1024 * 1024) return json({ error: "That voice memo is over 20 MB." }, 413);
  const form = await req.formData();
  const auth = await authorize(req, form.get("business_id"));
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No audio file was received." }, 400);
  const kind = audioUploadType(file.name, file.size);
  if ("error" in kind) return json({ error: kind.error }, file.size > MAX_AUDIO_BYTES ? 413 : 400);
  const upstream = new FormData();
  upstream.append("model", TRANSCRIBE_MODEL);
  upstream.append("file", new File([await file.arrayBuffer()], file.name, { type: kind.type }));
  upstream.append("response_format", "json");
  upstream.append("stream", "true");
  const res = await fetch(`${GATEWAY}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" }, body: upstream, signal: req.signal });
  if (!res.ok || !res.body) return gatewayError(res.status, await res.text());
  // Read the SSE stream to its end; the done event carries the final transcript.
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = ""; let deltas = ""; let finalText: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split(/\r?\n\r?\n/); buffer = events.pop() ?? "";
    for (const evt of events) {
      const data = evt.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("");
      if (!data || data === "[DONE]") continue;
      try {
        const p = JSON.parse(data);
        if (p.type === "transcript.text.delta" && typeof p.delta === "string") deltas += p.delta;
        else if (p.type === "transcript.text.done" && typeof p.text === "string") finalText = p.text;
        else if (p.error) return json({ error: `Transcription failed: ${p.error.message ?? "provider error"}` }, 502);
      } catch { /* partial */ }
    }
  }
  const text = (finalText ?? deltas).trim();
  if (finalText === null && !deltas) return json({ error: "Transcription ended before finishing. Try again." }, 502);
  const shaped = shapeTranscript(text);
  return "error" in shaped ? json({ error: shaped.error }, shaped.status) : json({ text: shaped.text });
}

async function generate(req: Request, apiKey: string) {
  const raw = await req.text();
  if (raw.length > MAX_TRANSCRIPT_CHARS * 2) return json({ error: "Description is too long. Keep it under 8,000 characters." }, 413);
  let body: { business_id?: unknown; transcript?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: "Invalid request." }, 400); }
  const auth = await authorize(req, body.business_id);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return json({ error: "Type or record a description first." }, 400);
  if (transcript.length > MAX_TRANSCRIPT_CHARS) return json({ error: "Description is too long. Keep it under 8,000 characters." }, 413);

  const provider = createOpenAI({ baseURL: GATEWAY, apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
  try {
    const result = streamText({
      model: provider.responses(QUOTE_MODEL),
      system: INSTRUCTIONS,
      prompt: transcript,
      maxOutputTokens: 8000,
      abortSignal: req.signal,
      output: Output.object({ schema: jsonSchema(QUOTE_SCHEMA) }),
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    await result.consumeStream();
    const output = await result.output;
    return json({ draft: output });
  } catch (err) {
    if (APICallError.isInstance(err)) return gatewayError(err.statusCode ?? 502, err.responseBody ?? "");
    if (NoObjectGeneratedError.isInstance(err)) return json({ error: "The AI couldn't produce a usable quote from that description. Edit it and try again." }, 422);
    if (req.signal.aborted) return json({ error: "Cancelled." }, 499);
    console.error("quote-ai generate failed", err instanceof Error ? err.message : err);
    return json({ error: "The AI service failed. Your work is kept; try again." }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "The AI service isn't configured for this app." }, 500);
  const type = req.headers.get("content-type") ?? "";
  return type.startsWith("multipart/form-data") ? transcribe(req, apiKey) : generate(req, apiKey);
});
