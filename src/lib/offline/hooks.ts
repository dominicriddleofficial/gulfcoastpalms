import { useEffect, useState, useCallback } from "react";
import { listMutations, subscribeQueue } from "./queue";
import { getMetaTimestamp } from "./db";
import type { QueuedMutation } from "./db";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useQueueStats(): {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
  refresh: () => Promise<void>;
  mutations: QueuedMutation[];
} {
  const [mutations, setMutations] = useState<QueuedMutation[]>([]);
  const refresh = useCallback(async () => {
    setMutations(await listMutations());
  }, []);
  useEffect(() => {
    void refresh();
    const unsub = subscribeQueue(() => {
      void refresh();
    });
    return () => {
      unsub();
    };
  }, [refresh]);
  return {
    mutations,
    pending: mutations.filter((m) => m.status === "pending").length,
    syncing: mutations.filter((m) => m.status === "syncing").length,
    synced: mutations.filter((m) => m.status === "synced").length,
    failed: mutations.filter((m) => m.status === "failed").length,
    total: mutations.length,
    refresh,
  };
}

export function useLastSyncedAt(): number | null {
  const [ts, setTs] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const value = await getMetaTimestamp("last_sync_at");
      if (mounted) setTs(value);
    };
    void load();
    const unsub = subscribeQueue(() => {
      void load();
    });
    const i = setInterval(load, 15_000);
    return () => {
      mounted = false;
      unsub();
      clearInterval(i);
    };
  }, []);
  return ts;
}