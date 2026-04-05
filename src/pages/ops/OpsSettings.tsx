import OpsLayout from "@/components/ops/OpsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOpsAuth } from "@/hooks/useOpsAuth";
import { RefreshCw, CheckCircle2, XCircle, Clock, Shield, ExternalLink } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = {
  connected: boolean;
  expired?: boolean;
  expires_at?: string;
  updated_at?: string;
};

export default function OpsSettings() {
  const { isAdmin, userRole } = useOpsAuth();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const fnBase = `https://${projectId}.supabase.co/functions/v1/jobber-oauth`;

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${fnBase}?action=status`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setStatusLoading(false);
    }
  }, [fnBase]);

  // Check status on load
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle OAuth callback code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);

    const exchangeCode = async () => {
      setConnecting(true);
      try {
        const redirectUri = `${window.location.origin}/ops/settings`;
        const res = await fetch(
          `${fnBase}?action=callback&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`
        );
        const data = await res.json();

        if (data.success) {
          toast({ title: "Jobber Connected!", description: "Your Jobber account is now linked." });
          await checkStatus();
        } else {
          toast({ title: "Connection Failed", description: data.error || "Could not connect Jobber.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Connection Failed", description: "Network error during token exchange.", variant: "destructive" });
      } finally {
        setConnecting(false);
      }
    };

    exchangeCode();
  }, [fnBase, toast, checkStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/ops/settings`;
      const res = await fetch(`${fnBase}?action=authorize&redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.error || "Could not start OAuth.", variant: "destructive" });
        setConnecting(false);
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${fnBase}?action=refresh`);
      const data = await res.json();

      if (data.success) {
        toast({ title: "Token Refreshed", description: "Jobber access token renewed." });
        await checkStatus();
      } else {
        toast({ title: "Refresh Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Refresh Failed", description: "Network error.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    // TODO: Replace with real jobber-sync edge function call
    setTimeout(() => {
      setSyncing(false);
      toast({ title: "Sync complete", description: "Mock data refreshed successfully." });
    }, 2000);
  };

  const statusBadge = statusLoading ? (
    <Badge variant="outline" className="font-body text-xs">Loading...</Badge>
  ) : status?.connected ? (
    status.expired ? (
      <Badge variant="outline" className="font-body text-xs text-amber-600 border-amber-300 bg-amber-50">Token Expired</Badge>
    ) : (
      <Badge variant="outline" className="font-body text-xs text-emerald-600 border-emerald-300 bg-emerald-50">Connected</Badge>
    )
  ) : (
    <Badge variant="outline" className="font-body text-xs text-amber-600 border-amber-300 bg-amber-50">Not Connected</Badge>
  );

  return (
    <OpsLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

        {/* Jobber Connection */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-body text-base flex items-center gap-2">
              Jobber Connection
              {statusBadge}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-body text-sm text-muted-foreground">
              {status?.connected
                ? "Your Jobber account is connected. You can sync jobs, clients, and schedule data."
                : "Connect your Jobber account to sync jobs, clients, and schedule data automatically."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {!status?.connected ? (
                <Button className="font-body" onClick={handleConnect} disabled={connecting || statusLoading}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {connecting ? "Connecting..." : "Connect Jobber Account"}
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="font-body" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  {status.expired && (
                    <Button variant="outline" className="font-body" onClick={handleRefreshToken} disabled={syncing}>
                      Refresh Token
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
              <Clock className="w-3 h-3" />
              {status?.connected
                ? `Token expires: ${status.expires_at ? new Date(status.expires_at).toLocaleString() : "Unknown"}`
                : "Not connected yet"}
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

        {/* Setup checklist */}
        {isAdmin && !status?.connected && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-body text-base">Jobber Integration Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 font-body text-sm text-muted-foreground list-decimal list-inside">
                <li className="line-through text-emerald-600">Create a Jobber Developer App</li>
                <li className="line-through text-emerald-600">Add <strong>JOBBER_CLIENT_ID</strong> secret</li>
                <li className="line-through text-emerald-600">Add <strong>JOBBER_CLIENT_SECRET</strong> secret</li>
                <li>Set redirect URI to: <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{window.location.origin}/ops/settings</code></li>
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
