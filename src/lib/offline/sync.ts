import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  checkAlreadyApplied,
  listMutations,
  notifySubscribers,
  recordIdempotencyReceipt,
  updateMutation,
} from "./queue";
import { setMeta } from "./db";
import type { QueuedMutation } from "./db";

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 4000;

let processing = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function backoffOk(m: QueuedMutation): boolean {
  if (m.attempts === 0) return true;
  const wait = BACKOFF_BASE_MS * Math.pow(2, Math.min(m.attempts - 1, 5));
  return Date.now() - m.updated_at >= wait;
}

async function applyMutation(m: QueuedMutation): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  // Server-side dedupe: if a previous receipt exists with this client id, treat as already applied.
  try {
    if (await checkAlreadyApplied(m.client_mutation_id)) {
      return { ok: true, result: { deduped: true } };
    }
  } catch {
    // Network error during dedupe check — we'll fail and retry later.
    return { ok: false, error: "Could not verify idempotency" };
  }

  switch (m.action) {
    case "on_my_way":
    case "start_visit":
    case "complete_visit": {
      const status =
        m.action === "on_my_way" ? "on_my_way" : m.action === "start_visit" ? "in_progress" : "completed";
      const patch: { status: string; completed_at?: string } = { status };
      if (status === "completed") patch.completed_at = new Date(m.created_at).toISOString();
      const { error } = await supabase.from("platform_jobs").update(patch).eq("id", m.job_id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, result: patch };
    }
    case "add_note": {
      const text = String(m.payload.text ?? "");
      if (!text) return { ok: false, error: "Empty note" };
      const { data: existing, error: readErr } = await supabase
        .from("platform_jobs")
        .select("internal_notes")
        .eq("id", m.job_id)
        .maybeSingle();
      if (readErr) return { ok: false, error: readErr.message };
      const stamp = format(new Date(m.created_at), "MMM d h:mma");
      const merged =
        (existing?.internal_notes ? existing.internal_notes + "\n\n" : "") +
        `[Crew · ${stamp}] ${text}`;
      const { error } = await supabase
        .from("platform_jobs")
        .update({ internal_notes: merged })
        .eq("id", m.job_id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, result: { note_appended: true } };
    }
    case "upload_photo": {
      if (!m.blob) return { ok: false, error: "Missing photo data" };
      const path =
        (m.payload.path as string | undefined) ??
        `${m.business_id ?? "unknown"}/${m.job_id}/${m.created_at}-${m.blob_filename ?? "photo.jpg"}`;
      const { error } = await supabase.storage.from("job-photos").upload(path, m.blob, {
        upsert: false,
        contentType: m.blob.type || "image/jpeg",
      });
      if (error && !/exists/i.test(error.message)) {
        return { ok: false, error: error.message };
      }
      return { ok: true, result: { path } };
    }
    case "complete_checklist_item": {
      const itemId = String(m.payload.item_id ?? "");
      const completed = Boolean(m.payload.completed ?? true);
      if (!itemId) return { ok: false, error: "Missing checklist item id" };
      const { error } = await supabase
        .from("job_checklist_items")
        .update({
          completed,
          completed_at: completed ? new Date(m.created_at).toISOString() : null,
        })
        .eq("id", itemId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, result: { item_id: itemId, completed } };
    }
    default:
      return { ok: false, error: `Unknown action: ${String(m.action)}` };
  }
}

export async function processQueueOnce(): Promise<void> {
  if (processing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  processing = true;
  try {
    const pending = await listMutations();
    for (const m of pending) {
      if (m.status === "synced") continue;
      if (m.status === "failed" && m.attempts >= MAX_ATTEMPTS) continue;
      if (!backoffOk(m)) continue;

      await updateMutation(m.client_mutation_id, { status: "syncing" });
      const result = await applyMutation(m);
      if (result.ok) {
        try {
          await recordIdempotencyReceipt(m, "success", result.result);
        } catch {
          // Receipt write failed; ignore — server already applied the change once.
        }
        await updateMutation(m.client_mutation_id, { status: "synced", last_error: null });
      } else {
        const nextAttempts = m.attempts + 1;
        const finalStatus: "pending" | "failed" =
          nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
        if (finalStatus === "failed") {
          try {
            await recordIdempotencyReceipt(m, "error", null, result.error);
          } catch {
            // ignore
          }
        }
        await updateMutation(m.client_mutation_id, {
          status: finalStatus,
          attempts: nextAttempts,
          last_error: result.error,
        });
      }
    }
    await setMeta("last_sync_at", Date.now());
    notifySubscribers();
  } finally {
    processing = false;
  }
}

export async function retryFailedMutation(clientMutationId: string): Promise<void> {
  await updateMutation(clientMutationId, { status: "pending", attempts: 0, last_error: null });
  await processQueueOnce();
}

export function startSyncEngine(): void {
  if (typeof window === "undefined") return;
  if (intervalId !== null) return;

  const trigger = () => {
    void processQueueOnce();
  };

  window.addEventListener("online", trigger);
  window.addEventListener("focus", trigger);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") trigger();
  });

  intervalId = setInterval(trigger, 30_000);
  trigger();
}