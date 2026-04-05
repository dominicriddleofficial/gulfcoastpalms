import OpsLayout from "@/components/ops/OpsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOpsAuth } from "@/hooks/useOpsAuth";
import { RefreshCw, CheckCircle2, XCircle, Clock, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OpsSettings() {
  const { isAdmin, userRole } = useOpsAuth();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    // Mock sync — will be replaced with real Jobber sync edge function call
    setTimeout(() => {
      setSyncing(false);
      toast({ title: "Sync complete", description: "Mock data refreshed successfully." });
    }, 2000);
  };

  return (
    <OpsLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

        {/* Jobber Connection */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-body text-base flex items-center gap-2">
              Jobber Connection
              <Badge variant="outline" className="font-body text-xs text-amber-600 border-amber-300 bg-amber-50">
                Not Connected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-body text-sm text-muted-foreground">
              Connect your Jobber account to sync jobs, clients, and schedule data automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="font-body" disabled>
                Connect Jobber Account
              </Button>
              <Button variant="outline" className="font-body" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now (Mock)"}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
              <Clock className="w-3 h-3" />
              Last synced: Using mock data
            </div>
          </CardContent>
        </Card>

        {/* Sync Logs */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-body text-base">Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { type: "Mock Seed", status: "success", records: 7, time: "Just now" },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {log.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-body text-sm text-foreground">{log.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-body text-muted-foreground">
                    <span>{log.records} records</span>
                    <span>{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        {isAdmin && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-body text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-body text-sm">
                {[
                  { role: "Admin", desc: "Full access to all features and settings" },
                  { role: "Manager", desc: "Full schedule and crew view, no config changes" },
                  { role: "Crew Lead", desc: "View all jobs and crew assignments" },
                  { role: "Rookie", desc: "Today's assigned schedule only, read-only" },
                ].map(r => (
                  <div key={r.role} className="flex items-start gap-2 py-1.5">
                    <Badge variant="secondary" className="font-body text-xs shrink-0">{r.role}</Badge>
                    <span className="text-muted-foreground">{r.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Secrets checklist */}
        {isAdmin && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-body text-base">Jobber Integration Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 font-body text-sm text-muted-foreground list-decimal list-inside">
                <li>Create a Jobber Developer App at <strong>api.getjobber.com/developer</strong></li>
                <li>Set redirect URI to your edge function callback URL</li>
                <li>Add <strong>JOBBER_CLIENT_ID</strong> secret</li>
                <li>Add <strong>JOBBER_CLIENT_SECRET</strong> secret</li>
                <li>Click "Connect Jobber Account" above to authorize</li>
                <li>Click "Sync Now" to pull your first batch of data</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </OpsLayout>
  );
}
