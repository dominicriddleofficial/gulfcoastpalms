import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformCustomer {
  id: string;
  business_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  preferred_contact_method: string | null;
  customer_status: string;
  source: string | null;
  tags: any;
  vip_flag: boolean;
  do_not_contact_flag: boolean;
  referral_source: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformProperty {
  id: string;
  business_id: string;
  customer_id: string;
  property_label: string | null;
  address_1: string;
  address_2: string | null;
  city: string;
  state: string;
  zip: string;
  property_type: string | null;
  gate_code: string | null;
  access_notes: string | null;
  created_at: string;
}

export function usePlatformCustomers(businessId: string | null) {
  const [customers, setCustomers] = useState<PlatformCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("platform_customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data, error } = await query;
    if (!error && data) setCustomers(data as PlatformCustomer[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = searchQuery
    ? customers.filter(c =>
        c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customers;

  return { customers: filtered, allCustomers: customers, loading, searchQuery, setSearchQuery, refetch: fetchCustomers };
}

export function usePlatformProperties(businessId: string | null, customerId?: string) {
  const [properties, setProperties] = useState<PlatformProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("platform_properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (businessId) query = query.eq("business_id", businessId);
      if (customerId) query = query.eq("customer_id", customerId);

      const { data } = await query;
      if (data) setProperties(data as PlatformProperty[]);
      setLoading(false);
    };
    fetch();
  }, [businessId, customerId]);

  return { properties, loading };
}
