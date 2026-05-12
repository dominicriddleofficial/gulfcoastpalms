import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type MutationStatus = "pending" | "syncing" | "synced" | "failed";

export type MutationAction =
  | "on_my_way"
  | "start_visit"
  | "complete_visit"
  | "add_note"
  | "upload_photo"
  | "complete_checklist_item";

export interface QueuedMutation {
  client_mutation_id: string;
  user_id: string | null;
  business_id: string | null;
  action: MutationAction;
  job_id: string;
  payload: Record<string, unknown>;
  // Photo bytes are kept here when offline
  blob?: Blob;
  blob_filename?: string;
  status: MutationStatus;
  attempts: number;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface CachedJob {
  id: string;
  business_id: string;
  user_id: string;
  cached_at: number;
  data: unknown;
}

export interface CachedJobDetail {
  id: string;
  cached_at: number;
  data: unknown;
}

export interface MetaEntry {
  key: string;
  value: unknown;
  updated_at: number;
}

interface OfflineDB extends DBSchema {
  cached_jobs: {
    key: string;
    value: CachedJob;
    indexes: { by_user_business: [string, string]; by_cached_at: number };
  };
  cached_job_details: {
    key: string;
    value: CachedJobDetail;
  };
  mutation_queue: {
    key: string;
    value: QueuedMutation;
    indexes: { by_status: string; by_created_at: number };
  };
  meta: {
    key: string;
    value: MetaEntry;
  };
}

const DB_NAME = "gcp-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cached_jobs")) {
          const store = db.createObjectStore("cached_jobs", { keyPath: "id" });
          store.createIndex("by_user_business", ["user_id", "business_id"]);
          store.createIndex("by_cached_at", "cached_at");
        }
        if (!db.objectStoreNames.contains("cached_job_details")) {
          db.createObjectStore("cached_job_details", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("mutation_queue")) {
          const q = db.createObjectStore("mutation_queue", { keyPath: "client_mutation_id" });
          q.createIndex("by_status", "status");
          q.createIndex("by_created_at", "created_at");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getOfflineDB();
  await db.put("meta", { key, value, updated_at: Date.now() });
}

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await getOfflineDB();
  const row = await db.get("meta", key);
  return (row?.value as T | undefined) ?? null;
}

export async function getMetaTimestamp(key: string): Promise<number | null> {
  const db = await getOfflineDB();
  const row = await db.get("meta", key);
  return row?.updated_at ?? null;
}