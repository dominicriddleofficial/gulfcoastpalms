import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type OpsRole = "admin" | "manager" | "operations" | "team_leader" | "limited_staff" | "user";

const OPS_ROLES: OpsRole[] = ["admin", "manager", "operations", "team_leader", "limited_staff"];

export function useOpsAuth() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<OpsRole>("user");
  const [userEmail, setUserEmail] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/ops/login"); return; }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.length) { navigate("/ops/login"); return; }

    const role = roles[0].role as OpsRole;
    if (!OPS_ROLES.includes(role)) { navigate("/ops/login"); return; }

    setUserId(user.id);
    setUserRole(role);
    setUserEmail(user.email || "");
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/ops/login");
  };

  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager" || userRole === "admin";
  const isCrewLead = userRole === "team_leader" || isManager;
  const isRookie = userRole === "limited_staff";

  return { loading, userId, userRole, userEmail, signOut, isAdmin, isManager, isCrewLead, isRookie };
}
