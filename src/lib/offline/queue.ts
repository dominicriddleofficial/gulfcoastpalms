import { supabase } from "@/integrations/supabase/client";
import {
  getOfflineDB,
  type MutationAction,
  type MutationStatus,
  type QueuedMutation,
} from "./db";

function uuidv4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (shouldn't normally hit in modern browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface EnqueueInput {
  action: MutationAction;
  jobId: string;
  businessId: string | null;
  userId: string | null;
  payload?: Record<string, unknown>;
  blob?: Blob;
  blobFilename?: string;
}

export async function enqueueMutation(input: EnqueueInput): Promise<QueuedMutation> {
  const db = await getOfflineDB();
  const now = Date.now();
  const mutation: QueuedMutation = {
    client_mutation_id: uuidv4(),
    user_id: input.userId,
    business_id: input.businessId,
    action: input.action,
    job_id: input.jobId,
    payload: input.payload ?? {},
    blob: input.blob,
    blob_filename: input.blobFilename,
    status: "pending",
    attempts: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  };
  await db.put("mutation_queue", mutation);
  notifySubscribers();
  return mutation;
}

export async function listMutations(filter?: { status?: MutationStatus }): Promise<QueuedMutation[]> {
  const db = await getOfflineDB();
  const all = await db.getAll("mutation_queue");
  const sorted = all.sort((a, b) => a.created_at - b.created_at);
  return filter?.status ? sorted.filter((m) => m.status === filter.status) : sorted;
}

export async function updateMutation(
  id: string,
  patch: Partial<Pick<QueuedMutation, "status" | "attempts" | "last_error">>,
): Promise<void> {
  const db = await getOfflineDB();
  const existing = await db.get("mutation_queue", id);
  if (!existing) return;
  await db.put("mutation_queue", {
    ...existing,
    ...patch,
    updated_at: Date.now(),
  });
  notifySubscribers();
}

export async function deleteMutation(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("mutation_queue", id);
  notifySubscribers();
}

export async function clearSyncedMutations(olderThanMs = 24 * 3600 * 1000): Promise<number> {
  const all = await listMutations();
  const cutoff = Date.now() - olderThanMs;
  let cleared = 0;
  for (const m of all) {
    if (m.status === "synced" && m.updated_at < cutoff) {
      await deleteMutation(m.client_mutation_id);
      cleared += 1;
    }
  }
  return cleared;
}

/**
 * Server-side dedupe check + receipt write so a retried mutation never
 * applies twice. Both reads and writes are best-effort — if the network
 * fails the caller treats the mutation as still pending.
 */
export async function recordIdempotencyReceipt(
  m: QueuedMutation,
  status: "success" | "error",
  result: Record<string, unknown> | null,
  errorText?: string,
): Promise<void> {
  await supabase.from("mutation_idempotency").insert({
    client_mutation_id: m.client_mutation_id,
    user_id: m.user_id,
    business_id: m.business_id,
    action_type: m.action,
    entity_type: "job",
    entity_id: m.job_id,
    status,
    result,
    error: errorText ?? null,
  });
}

export async function checkAlreadyApplied(clientMutationId: string): Promise<boolean> {
  const { data } = await supabase
    .from("mutation_idempotency")
    .select("client_mutation_id")
    .eq("client_mutation_id", clientMutationId)
    .maybeSingle();
  return !!data;
}

// --- Subscribers (used by hooks for live UI updates) ---

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySubscribers(): void {
  for (const l of listeners) l();
}