import { useEffect, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Users as UsersIcon } from "lucide-react";
import { clearUserRoleCache } from "@/hooks/useUserRole";

type TeamRow = {
  id: string;
  user_id: string;
  role_name: string;
  active_status: string;
  created_at: string;
  email: string | null;
  first_name: string | null;
};

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "crew", label: "Crew" },
];

function roleColor(role: string) {
  if (role === "owner") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (role === "manager") return "bg-blue-500/15 text-blue-300 border-blue-500/25";
  if (role === "crew") return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  return "bg-zinc-500/15 text-zinc-300 border-zinc-500/25";
}

export default function PlatformTeam() {
  const auth = usePlatformAuth();
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "crew">("crew");
  const [inviting, setInviting] = useState(false);

  const businessId = auth.selectedBusinessId;

  async function loadTeam() {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_business_access")
      .select("id, user_id, role_name, active_status, created_at")
      .eq("business_id", businessId);

    if (error) {
      toast({ title: "Could not load team", description: error.message, variant: "destructive" });
      setTeam([]);
      setLoading(false);
      return;
    }

    // Hydrate user emails from profiles if present
    const userIds = (data || []).map(r => r.user_id);
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: p } = await supabase
        .from("profiles" as any)
        .select("id, email, first_name, full_name")
        .in("id", userIds);
      profiles = (p as any[]) || [];
    }
    const pMap = new Map(profiles.map(p => [p.id, p]));

    setTeam((data || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      role_name: r.role_name,
      active_status: r.active_status,
      created_at: r.created_at,
      email: pMap.get(r.user_id)?.email ?? null,
      first_name: pMap.get(r.user_id)?.first_name ?? pMap.get(r.user_id)?.full_name ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => { loadTeam(); /* eslint-disable-next-line */ }, [businessId]);

  async function sendInvite() {
    if (!businessId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const redirectTo = `${window.location.origin}/platform/login`;
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail.trim(),
        options: { emailRedirectTo: redirectTo, data: { first_name: inviteFirst.trim() } },
      });
      if (error) throw error;
      toast({
        title: "Magic link sent",
        description: `${inviteEmail} will receive a sign-in link. Once they accept, ask them to sign in to claim ${inviteRole} access.`,
      });
      // Note: we cannot insert the user_business_access row here without their user_id.
      // The cleanest path is to insert it after they first sign in, OR to create a
      // pending invites table. For v1 we surface a manual reminder.
      setInviteOpen(false);
      setInviteEmail("");
      setInviteFirst("");
    } catch (e: any) {
      toast({ title: "Could not send invite", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(row: TeamRow, newRole: string) {
    const { error } = await supabase
      .from("user_business_access")
      .update({ role_name: newRole })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Could not update role", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Role updated" });
    clearUserRoleCache();
    loadTeam();
  }

  async function setActive(row: TeamRow, active: boolean) {
    const { error } = await supabase
      .from("user_business_access")
      .update({ active_status: active ? "active" : "inactive" })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: active ? "User reactivated" : "User deactivated" });
    clearUserRoleCache();
    loadTeam();
  }

  return (
    <PlatformLayout>
      <div className="space-y-5 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-[24px] font-bold tracking-tight">Team</h1>
            <p className="font-body text-[12px] text-muted-foreground mt-0.5">
              Manage who can access this business and what they can do.
            </p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" /> Invite Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@email.com" />
                </div>
                <div>
                  <Label htmlFor="first">First name</Label>
                  <Input id="first" value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "manager" | "crew")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  After they accept the magic link and sign in, return here to grant their {inviteRole} role.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Send invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-body text-sm text-muted-foreground">No team members yet.</p>
              <p className="font-body text-xs text-muted-foreground/60 mt-1">Use the Invite button to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Email</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 font-body text-[13px]">
                      {row.first_name || row.email?.split("@")[0] || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-[12px] text-muted-foreground hidden md:table-cell">{row.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-body text-[11px] font-medium border ${roleColor(row.role_name)}`}>
                        {row.role_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-[12px]">
                      <span className={row.active_status === "active" ? "text-emerald-400" : "text-muted-foreground"}>
                        {row.active_status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {row.role_name !== "owner" && (
                          <Select value={row.role_name} onValueChange={(v) => changeRole(row, v)}>
                            <SelectTrigger className="h-8 w-[110px] text-[12px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {row.role_name !== "owner" && (
                          <Button
                            size="sm"
                            variant={row.active_status === "active" ? "ghost" : "secondary"}
                            onClick={() => setActive(row, row.active_status !== "active")}
                          >
                            {row.active_status === "active" ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="font-body text-[11px] text-muted-foreground">
          Crew members are redirected to /platform/crew on sign-in and only see jobs assigned to them.
          Managers see jobs, customers, schedules, and SMS, but not invoices, payments, or revenue.
        </p>
      </div>
    </PlatformLayout>
  );
}