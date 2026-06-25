import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecentActivityKind = "job" | "invoice" | "quote";

export interface RecentActivityItem {
  kind: RecentActivityKind;
  id: string;
  title: string;
  number: string | null;
  status: string | null;
  total: number | null;
  createdAt: string;
  createdByUserId: string | null;
  createdByName: string | null;
  sourceSystem: string | null;
  scheduledStart: string | null;
}

interface Params {
  businessId: string | null;
  isOwner: boolean;
}

export function useRecentActivity({ businessId, isOwner }: Params) {
  return useQuery({
    queryKey: ["recent-activity", businessId, isOwner],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async (): Promise<RecentActivityItem[]> => {
      if (!businessId) return [];

      const jobsP = supabase
        .from("platform_jobs")
        .select(
          "id, job_number, title, status, created_at, created_by_user_id, source_system, scheduled_start"
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(15);

      const invoicesP = isOwner
        ? supabase
            .from("platform_invoices")
            .select(
              "id, invoice_number, total, status, created_at, created_by_user_id"
            )
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null });

      const quotesP = isOwner
        ? supabase
            .from("platform_quotes")
            .select(
              "id, quote_number, title, total, status, created_at, created_by_user_id"
            )
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null });

      const [jobsRes, invoicesRes, quotesRes] = await Promise.all([jobsP, invoicesP, quotesP]);

      const items: RecentActivityItem[] = [];

      for (const row of (jobsRes.data ?? []) as Array<{
        id: string;
        job_number: string | null;
        title: string | null;
        status: string | null;
        created_at: string;
        created_by_user_id: string | null;
        source_system: string | null;
        scheduled_start: string | null;
      }>) {
        items.push({
          kind: "job",
          id: row.id,
          title: row.title ?? row.job_number ?? "Job",
          number: row.job_number,
          status: row.status,
          total: null,
          createdAt: row.created_at,
          createdByUserId: row.created_by_user_id,
          createdByName: null,
          sourceSystem: row.source_system,
          scheduledStart: row.scheduled_start,
        });
      }

      if (isOwner) {
        for (const row of (invoicesRes.data ?? []) as Array<{
          id: string;
          invoice_number: string | null;
          total: number | string | null;
          status: string | null;
          created_at: string;
          created_by_user_id: string | null;
        }>) {
          items.push({
            kind: "invoice",
            id: row.id,
            title: row.invoice_number ?? "Invoice",
            number: row.invoice_number,
            status: row.status,
            total: row.total != null ? Number(row.total) : null,
            createdAt: row.created_at,
            createdByUserId: row.created_by_user_id,
            createdByName: null,
            sourceSystem: null,
            scheduledStart: null,
          });
        }

        for (const row of (quotesRes.data ?? []) as Array<{
          id: string;
          quote_number: string | null;
          title: string | null;
          total: number | string | null;
          status: string | null;
          created_at: string;
          created_by_user_id: string | null;
        }>) {
          items.push({
            kind: "quote",
            id: row.id,
            title: row.title ?? row.quote_number ?? "Quote",
            number: row.quote_number,
            status: row.status,
            total: row.total != null ? Number(row.total) : null,
            createdAt: row.created_at,
            createdByUserId: row.created_by_user_id,
            createdByName: null,
            sourceSystem: null,
            scheduledStart: null,
          });
        }
      }

      const userIds = Array.from(
        new Set(items.map((i) => i.createdByUserId).filter((v): v is string => !!v))
      );
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("platform_user_profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);
        const nameMap = new Map<string, string>();
        for (const p of (profiles ?? []) as Array<{
          user_id: string;
          display_name: string | null;
          email: string | null;
        }>) {
          nameMap.set(p.user_id, p.display_name ?? p.email ?? "Unknown");
        }
        for (const it of items) {
          if (it.createdByUserId) it.createdByName = nameMap.get(it.createdByUserId) ?? null;
        }
      }

      items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return items.slice(0, 25);
    },
  });
}