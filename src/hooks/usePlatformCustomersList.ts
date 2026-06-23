import { supabase } from "@/integrations/supabase/client";

export type UnifiedCustomerRow = {
  id: string;
  source: "jobber" | "platform";
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  jobber_id?: string;
  business_id?: string;
  created_at: string;
  synced_at?: string;
};

export const platformCustomersKey = (businessId: string | null) =>
  ["platform-customers-list", businessId] as const;

export async function fetchPlatformCustomersList(
  businessId: string | null,
): Promise<UnifiedCustomerRow[]> {
  if (!businessId) return [];
  const [jobberRes, platformRes] = await Promise.all([
    supabase
      .from("jobber_clients")
      .select(
        "id, jobber_id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at, synced_at, business_id",
      )
      .eq("business_id", businessId)
      .order("display_name", { ascending: true }),
    supabase
      .from("platform_customers")
      .select(
        "id, business_id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at",
      )
      .eq("business_id", businessId)
      .order("display_name", { ascending: true }),
  ]);
  const jobberCustomers: UnifiedCustomerRow[] = (jobberRes.data || []).map(
    (c: Record<string, unknown>) => ({ ...(c as UnifiedCustomerRow), source: "jobber" as const }),
  );
  const platformCustomers: UnifiedCustomerRow[] = (platformRes.data || []).map(
    (c: Record<string, unknown>) => ({ ...(c as UnifiedCustomerRow), source: "platform" as const }),
  );
  return [...platformCustomers, ...jobberCustomers];
}