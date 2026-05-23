import { supabase } from "@/integrations/supabase/client";

export type QueuedPoint = {
  business_id: string;
  clock_session_id: string;
  employee_user_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  captured_at: string;
};

const KEY = "gcp_gps_queue_v1";
const MAX = 500;

function read(): QueuedPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedPoint[]) : [];
  } catch {
    return [];
  }
}

function write(list: QueuedPoint[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* storage full — drop silently */
  }
}

export function enqueueGpsPoint(p: QueuedPoint): number {
  const list = read();
  list.push(p);
  write(list);
  return list.length;
}

export function queuedCount(): number {
  return read().length;
}

export async function flushGpsQueue(): Promise<{ sent: number; remaining: number }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, remaining: read().length };
  }
  const list = read();
  if (list.length === 0) return { sent: 0, remaining: 0 };
  // Send oldest 100 at a time to keep payloads small.
  const batch = list.slice(0, 100);
  const { error } = await supabase.from("platform_gps_points").insert(batch);
  if (error) {
    return { sent: 0, remaining: list.length };
  }
  const rest = list.slice(batch.length);
  write(rest);
  return { sent: batch.length, remaining: rest.length };
}
