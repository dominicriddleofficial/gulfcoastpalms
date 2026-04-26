import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

type Member = {
  user_id: string;
  role_name: string;
  display_name: string;
};

/**
 * Owner / manager UI to pick which crew members are assigned to a Jobber job.
 * Writes to jobber_job_assignments.
 */
export default function AssignedCrewPicker({
  jobberJobId, businessId,
}: { jobberJobId: string; businessId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [{ data: access }, { data: existing }] = await Promise.all([
        supabase
          .from("user_business_access")
          .select("user_id, role_name")
          .eq("business_id", businessId)
          .eq("active_status", "active")
          .in("role_name", ["crew", "manager"]),
        supabase
          .from("jobber_job_assignments")
          .select("user_id")
          .eq("jobber_job_id", jobberJobId),
      ]);
      if (cancelled) return;

      const userIds = (access || []).map(a => a.user_id);
      let profiles: any[] = [];
      if (userIds.length) {
        const { data: p } = await supabase
          .from("profiles" as any)
          .select("id, email, first_name, full_name")
          .in("id", userIds);
        profiles = (p as any[]) || [];
      }
      const pMap = new Map(profiles.map(p => [p.id, p]));

      setMembers((access || []).map(a => ({
        user_id: a.user_id,
        role_name: a.role_name,
        display_name:
          pMap.get(a.user_id)?.first_name ||
          pMap.get(a.user_id)?.full_name ||
          pMap.get(a.user_id)?.email ||
          a.user_id.slice(0, 8),
      })));
      setAssigned(new Set((existing || []).map(r => r.user_id)));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [jobberJobId, businessId]);

  async function toggle(userId: string, checked: boolean) {
    setSaving(userId);
    if (checked) {
      const { error } = await supabase
        .from("jobber_job_assignments")
        .insert({ business_id: businessId, jobber_job_id: jobberJobId, user_id: userId });
      if (error) {
        toast.error("Could not assign crew member");
      } else {
        setAssigned(prev => new Set(prev).add(userId));
      }
    } else {
      const { error } = await supabase
        .from("jobber_job_assignments")
        .delete()
        .eq("jobber_job_id", jobberJobId)
        .eq("user_id", userId);
      if (error) {
        toast.error("Could not unassign crew member");
      } else {
        setAssigned(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    }
    setSaving(null);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="font-body text-xs text-muted-foreground">Assigned Crew</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground">No crew or managers in this business yet. Invite one from the Team page.</p>
      ) : (
        <div className="space-y-1.5">
          {members.map(m => (
            <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={assigned.has(m.user_id)}
                onCheckedChange={(v) => toggle(m.user_id, !!v)}
                disabled={saving === m.user_id}
              />
              <span className="font-body text-foreground">{m.display_name}</span>
              <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground/60">{m.role_name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}