import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Users as UsersIcon, Eye, EyeOff } from "lucide-react";
import { clearUserRoleCache } from "@/hooks/useUserRole";

interface BusinessOption {
  id: string;
  shortcode: string;
  public_brand_name: string;
}

interface TeamMemberRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  must_change_password: boolean;
  roles: { business_id: string; shortcode: string; role_name: string; active_status: string }[];
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const array = new Uint32Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) out += chars[array[i] % chars.length];
  return out;
}

function roleClass(role: string) {
  if (role === "owner") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (role === "office_manager") return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  if (role === "manager") return "bg-blue-500/15 text-blue-300 border-blue-500/25";
  if (role === "crew") return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  return "bg-zinc-500/15 text-zinc-300 border-zinc-500/25";
}

export default function TeamMembersSection() {
  const { isOwner } = useUserRole();
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState(generateTempPassword());
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<"owner" | "office_manager">("office_manager");
  const [selectedBiz, setSelectedBiz] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadBusinesses = useCallback(async () => {
    const { data } = await supabase
      .from("businesses")
      .select("id, shortcode, public_brand_name")
      .order("shortcode");
    setBusinesses((data as BusinessOption[]) || []);
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const { data: access } = await supabase
      .from("user_business_access")
      .select("user_id, business_id, role_name, active_status, businesses!inner(shortcode)");

    if (!access) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set(access.map(a => a.user_id)));
    const { data: profiles } = userIds.length
      ? await supabase
          .from("platform_user_profiles")
          .select("user_id, email, display_name, must_change_password")
          .in("user_id", userIds)
      : { data: [] };
    const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const grouped = new Map<string, TeamMemberRow>();
    for (const a of access) {
      const r = grouped.get(a.user_id) ?? {
        user_id: a.user_id,
        email: profMap.get(a.user_id)?.email ?? null,
        display_name: profMap.get(a.user_id)?.display_name ?? null,
        must_change_password: profMap.get(a.user_id)?.must_change_password ?? false,
        roles: [],
      };
      r.roles.push({
        business_id: a.business_id,
        shortcode: (a.businesses as { shortcode: string } | null)?.shortcode ?? "?",
        role_name: a.role_name,
        active_status: a.active_status,
      });
      grouped.set(a.user_id, r);
    }
    setMembers(Array.from(grouped.values()));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBusinesses();
    loadMembers();
  }, [loadBusinesses, loadMembers]);

  function resetForm() {
    setName("");
    setEmail("");
    setTempPassword(generateTempPassword());
    setRole("office_manager");
    setSelectedBiz({});
    setShowPw(false);
  }

  async function submit() {
    const business_ids = Object.entries(selectedBiz).filter(([, v]) => v).map(([k]) => k);
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!email.trim()) return toast({ title: "Email required", variant: "destructive" });
    if (tempPassword.length < 8) return toast({ title: "Temp password must be 8+ chars", variant: "destructive" });
    if (business_ids.length === 0) return toast({ title: "Select at least one workspace", variant: "destructive" });

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: {
        email: email.trim(),
        display_name: name.trim(),
        temp_password: tempPassword,
        role,
        business_ids,
      },
    });
    setSubmitting(false);

    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error || error?.message || "Invite failed";
      toast({ title: "Could not invite", description: msg, variant: "destructive" });
      return;
    }
    toast({
      title: "Team member added",
      description: `${email} can sign in with the temp password and will be prompted to change it.`,
    });
    clearUserRoleCache();
    setOpen(false);
    resetForm();
    loadMembers();
  }

  if (!isOwner) return null;

  return (
    <div className="bg-card/60 border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <UsersIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-foreground tracking-tight">Team Members</h2>
            <p className="font-body text-[11px] text-muted-foreground">Invite users and manage workspace access.</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" /> Invite Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tm-name">Name</Label>
                <Input id="tm-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <Label htmlFor="tm-email">Email</Label>
                <Input id="tm-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" />
              </div>
              <div>
                <Label htmlFor="tm-pw">Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    id="tm-pw"
                    type={showPw ? "text" : "password"}
                    value={tempPassword}
                    onChange={e => setTempPassword(e.target.value)}
                    className="font-mono text-[13px]"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowPw(s => !s)} aria-label="Show/hide password">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setTempPassword(generateTempPassword())}>
                    Generate
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  They'll be forced to change this on first login.
                </p>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={v => setRole(v as "owner" | "office_manager")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner — full access</SelectItem>
                    <SelectItem value="office_manager">Office Manager — everything except Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Workspace access</Label>
                <div className="space-y-2 mt-1.5">
                  {businesses.map(b => (
                    <label key={b.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/30 cursor-pointer">
                      <div>
                        <p className="font-body text-[13px] text-foreground">{b.public_brand_name}</p>
                        <p className="font-body text-[10px] text-muted-foreground">{b.shortcode}</p>
                      </div>
                      <Switch
                        checked={!!selectedBiz[b.id]}
                        onCheckedChange={(v) => setSelectedBiz(s => ({ ...s, [b.id]: v }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Create user
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-10">
          <UsersIcon className="w-7 h-7 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-body text-sm text-muted-foreground">No team members yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 hidden md:table-cell">Email</th>
                <th className="px-3 py-2">Workspaces / Role</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id} className="border-t border-border align-top">
                  <td className="px-3 py-3 font-body text-[13px]">{m.display_name || m.email?.split("@")[0] || "—"}</td>
                  <td className="px-3 py-3 font-body text-[12px] text-muted-foreground hidden md:table-cell">{m.email || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.roles.map(r => (
                        <span
                          key={r.business_id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-body text-[10px] font-medium border ${roleClass(r.role_name)}`}
                        >
                          <span className="opacity-70">{r.shortcode}</span>
                          <span>·</span>
                          <span>{r.role_name.replace("_", " ")}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-body text-[12px]">
                    {m.must_change_password ? (
                      <span className="text-amber-400">Pending</span>
                    ) : m.roles.some(r => r.active_status === "active") ? (
                      <span className="text-emerald-400">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}