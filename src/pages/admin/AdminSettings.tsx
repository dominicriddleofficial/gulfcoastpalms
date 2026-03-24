import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Users, Plus, Settings, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ROLES = ["admin", "operations", "team_leader", "limited_staff"] as const;
const roleLabels: Record<string, string> = {
  admin: "Admin", operations: "Operations", team_leader: "Team Leader", limited_staff: "Limited Staff",
};
const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800", operations: "bg-blue-100 text-blue-800",
  team_leader: "bg-purple-100 text-purple-800", limited_staff: "bg-gray-100 text-gray-800",
};

export default function AdminSettings() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*");
    setRoles(data || []);
    setLoading(false);
  };

  if (loading) return <AdminLayout><p className="text-center text-muted-foreground font-body py-12">Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Settings</h1>
          <p className="font-body text-sm text-muted-foreground">Manage access, roles, and system configuration</p>
        </div>

        {/* User Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> User Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No roles assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-body text-sm font-mono text-muted-foreground truncate max-w-[200px] md:max-w-none">{role.user_id}</p>
                    </div>
                    <Badge className={cn("font-body text-xs capitalize", roleColors[role.role])}>
                      {roleLabels[role.role] || role.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" /> Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 font-body text-sm">
              {[
                { role: "Admin", access: "Full access — Dashboard, Leads, Clients, Jobs, Performance, Reviews, Leaderboards, Crews, Recurring, Job Issues, Uploads, Admin Settings, Applicants, SOPs" },
                { role: "Operations", access: "Dashboard, Leads, Clients, Jobs, Performance, Reviews, Leaderboards, Crews, Recurring" },
                { role: "Team Leader", access: "Dashboard, Jobs, Reviews, Leaderboards, Crews" },
                { role: "Limited Staff", access: "Dashboard only" },
              ].map(({ role, access }) => (
                <div key={role} className="p-3 bg-secondary rounded-lg">
                  <p className="font-semibold text-foreground">{role}</p>
                  <p className="text-muted-foreground text-xs mt-1">{access}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" /> System Info
            </CardTitle>
          </CardHeader>
          <CardContent className="font-body text-sm text-muted-foreground space-y-2">
            <p>• <strong>System of Record:</strong> Jobber (CRM, quotes, invoicing, scheduling)</p>
            <p>• <strong>This Dashboard:</strong> Internal command center for analytics, accountability, and performance tracking</p>
            <p>• <strong>Data Source:</strong> Jobber CSV exports imported via Uploads page</p>
            <p>• <strong>Review Leaderboard:</strong> $100 monthly reward for top review earner</p>
            <p>• <strong>Tables:</strong> clients, jobs, employees, reviews, leads, recurring_services, job_issues, leaderboard_rewards</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
