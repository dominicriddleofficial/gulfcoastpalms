import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessAccess {
  id: string;
  business_id: string;
  role_name: string;
  can_view_all_business_data: boolean;
  can_manage_leads: boolean;
  can_manage_quotes: boolean;
  can_manage_jobs: boolean;
  can_manage_schedule: boolean;
  can_manage_invoices: boolean;
  can_manage_payments: boolean;
  can_manage_communications: boolean;
  can_manage_settings: boolean;
  can_export_data: boolean;
  can_view_financials: boolean;
  can_manage_users: boolean;
  can_delete_records: boolean;
  default_business: boolean;
  business: {
    id: string;
    public_brand_name: string;
    shortcode: string;
    logo_url: string | null;
    default_business_color?: string;
  };
}

export function usePlatformAuth() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [businessAccess, setBusinessAccess] = useState<BusinessAccess[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null); // null = all
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/platform/login"); return; }

    // Check workspace ownership
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_user_id", user.id);

    const owner = !!(workspaces && workspaces.length > 0);

    // Check admin role as fallback
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin") || false;

    // Get business access
    const { data: access } = await supabase
      .from("user_business_access")
      .select(`
        id, business_id, role_name,
        can_view_all_business_data, can_manage_leads, can_manage_quotes,
        can_manage_jobs, can_manage_schedule, can_manage_invoices,
        can_manage_payments, can_manage_communications, can_manage_settings,
        can_export_data, can_view_financials, can_manage_users,
        can_delete_records, default_business
      `)
      .eq("user_id", user.id)
      .eq("active_status", "active");

    if (!owner && !isAdmin && (!access || access.length === 0)) {
      navigate("/platform/login");
      return;
    }

    // Get business details for each access
    let enrichedAccess: BusinessAccess[] = [];
    if (access && access.length > 0) {
      const bizIds = access.map(a => a.business_id);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, public_brand_name, shortcode, logo_url")
        .in("id", bizIds);

      // Also get settings for color
      const { data: settings } = await supabase
        .from("business_settings")
        .select("business_id, default_business_color")
        .in("business_id", bizIds);

      const bizMap = new Map(businesses?.map(b => [b.id, b]) || []);
      const settingsMap = new Map(settings?.map(s => [s.business_id, s]) || []);

      enrichedAccess = access.map(a => ({
        ...a,
        business: {
          ...bizMap.get(a.business_id)!,
          default_business_color: settingsMap.get(a.business_id)?.default_business_color || undefined,
        },
      }));
    } else if (owner || isAdmin) {
      // Owner/admin gets all businesses
      const { data: allBiz } = await supabase
        .from("businesses")
        .select("id, public_brand_name, shortcode, logo_url");
      
      const { data: settings } = await supabase
        .from("business_settings")
        .select("business_id, default_business_color");

      const settingsMap = new Map(settings?.map(s => [s.business_id, s]) || []);

      enrichedAccess = (allBiz || []).map(b => ({
        id: "",
        business_id: b.id,
        role_name: "owner",
        can_view_all_business_data: true,
        can_manage_leads: true,
        can_manage_quotes: true,
        can_manage_jobs: true,
        can_manage_schedule: true,
        can_manage_invoices: true,
        can_manage_payments: true,
        can_manage_communications: true,
        can_manage_settings: true,
        can_export_data: true,
        can_view_financials: true,
        can_manage_users: true,
        can_delete_records: true,
        default_business: false,
        business: {
          ...b,
          default_business_color: settingsMap.get(b.id)?.default_business_color || undefined,
        },
      }));
    }

    setUserId(user.id);
    setUserEmail(user.email || "");
    setIsOwner(owner || isAdmin);
    setBusinessAccess(enrichedAccess);

    // Set default business
    const defaultBiz = enrichedAccess.find(a => a.default_business);
    if (defaultBiz) {
      setSelectedBusinessId(defaultBiz.business_id);
    }
    // If owner, default to "all"
    
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/platform/login");
  };

  const selectedBusiness = businessAccess.find(a => a.business_id === selectedBusinessId) || null;
  const businesses = businessAccess.map(a => a.business);

  return {
    loading,
    userId,
    userEmail,
    isOwner,
    businessAccess,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    signOut,
  };
}
