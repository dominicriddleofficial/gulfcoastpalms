import OpsLayout from "@/components/ops/OpsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOpsAuth } from "@/hooks/useOpsAuth";
import { RefreshCw, CheckCircle2, XCircle, Clock, Shield, ExternalLink, Wifi, AlertTriangle, FlaskConical } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type SyncLog = {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type ConnectionStatus = {
  connected: boolean;
  expired?: boolean;
  expires_at?: string;
  updated_at?: string;
};

type ModuleResult = {
  module: string;
  success: boolean;
  records: number;
  error?: string;
  timestamp: string;
  queryName: string;
  incremental: boolean;
  lastSuccessAt?: string | null;
  requestedCost?: number | null;
  actualCost?: number | null;
  currentlyAvailable?: number | null;
  restoreRate?: number | null;
};

const MODULES = [
  { key: "clients", label: "Clients" },
  { key: "properties", label: "Properties" },
  { key: "users", label: "Crew" },
  { key: "jobs", label: "Jobs" },
  { key: "visits", label: "Schedule" },
];

export default function OpsSettings() {
  const { isAdmin } = useOpsAuth();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncingModule, setSyncingModule] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSyncResults, setLastSyncResults] = useState<ModuleResult[]>([]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const fnBase = `${supabaseUrl}/functions/v1/jobber-oauth`;
  const syncFnUrl = `${supabaseUrl}/functions/v1/jobber-sync`;

  const parseJsonResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      if (!res.ok) throw new Error("Received an invalid response from the backend.");
      return {};
    }
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${fnBase}?action=status`);
      const data = await parseJsonResponse(res);
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setStatusLoading(false);
    }
  }, [fnBase]);

  const fetchSyncLogs = useCallback(async () => {
    const { data } = await supabase
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (data) setSyncLogs(data as unknown as SyncLog[]);
  }, []);

  useEffect(() => {
    checkStatus();
    fetchSyncLogs();
  }, [checkStatus, fetchSyncLogs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    window.history.replaceState({}, "", window.location.pathname);

    const exchangeCode = async () => {
      setConnecting(true);
      try {
        const redirectUri = `${window.location.origin}/ops/settings`;
        const res = await fetch(`${fnBase}?action=callback&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`);
        const data = await parseJsonResponse(res);

        if (data.success) {
          toast({ title: "Jobber Connected!", description: "Your Jobber account is now linked." });
          await checkStatus();
        } else {
          toast({ title: "Connection Failed", description: data.details || data.error || "Could not connect Jobber.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Connection Failed", description: error instanceof Error ? error.message : "Network error.", variant: "destructive" });
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
      const data = await parseJsonResponse(res);

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
      const data = await parseJsonResponse(res);

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

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(syncFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await parseJsonResponse(res);

      if (data.success) {
        toast({ title: "Connection OK", description: `Jobber responded successfully. Budget available: ${data.currentlyAvailable ?? "unknown"}.` });
      } else {
        toast({ title: "Connection Failed", description: data.error || "Could not reach Jobber API.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Test Failed", description: "Network error.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const runSyncAction = async (action: "full" | "test_query", moduleList?: string[]) => {
    const label = moduleList?.length ? moduleList.join(", ") : action === "full" ? "full" : "test";
    setSyncing(true);
    setSyncingModule(label);

    try {
      const res = await fetch(syncFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, modules: moduleList || [] }),
      });
      const data = await parseJsonResponse(res);

      if (data.modules) setLastSyncResults(data.modules);

      if (data.success) {
        toast({
          title: action === "test_query" ? "Query Test Passed" : "Sync Complete",
          description:
            action === "test_query"
              ? `Verified ${(data.modules as ModuleResult[])?.map((item) => item.module).join(", ") || "module"} against Jobber.`
              : `Synced ${data.records_synced} records across staged modules.`,
        });
      } else if (data.status === "partial") {
        const failed = (data.modules as ModuleResult[])?.filter((item) => !item.success).map((item) => item.module).join(", ");
        toast({ title: "Partial Sync", description: `Some modules failed: ${failed}.`, variant: "destructive" });
      } else {
        toast({ title: action === "test_query" ? "Query Test Failed" : "Sync Failed", description: data.modules?.[0]?.error || data.error || "Unknown error.", variant: "destructive" });
      }

      await fetchSyncLogs();
    } catch (error) {
      toast({ title: action === "test_query" ? "Query Test Failed" : "Sync Failed", description: error instanceof Error ? error.message : "Network error.", variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncingModule(null);
    }
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
                ? "Your Jobber account is connected. Sync now runs in staged, lower-cost modules."
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
                  <Button variant="outline" className="font-body" onClick={() => runSyncAction("full")} disabled={syncing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? `Running ${syncingModule || "sync"}...` : "Full Sync"}
                  </Button>
                  <Button variant="outline" className="font-body" onClick={handleTestConnection} disabled={testing || syncing}>
                    <Wifi className="w-4 h-4 mr-2" />
                    {testing ? "Testing..." : "Test Connection"}
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

        {status?.connected && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-body text-base">Sync Individual Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {MODULES.map((module) => (
                  <Button
                    key={module.key}
                    variant="outline"
                    size="sm"
                    className="font-body"
                    disabled={syncing}
                    onClick={() => runSyncAction("full", [module.key])}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing && syncingModule === module.key ? "animate-spin" : ""}`} />
                    Sync {module.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="font-body text-xs text-muted-foreground">Test each module query without writing data.</p>
                <div className="flex flex-wrap gap-2">
                  {MODULES.map((module) => (
                    <Button
                      key={`test-${module.key}`}
                      variant="ghost"
                      size="sm"
                      className="font-body"
                      disabled={syncing}
                      onClick={() => runSyncAction("test_query", [module.key])}
                    >
                      <FlaskConical className="w-3 h-3 mr-1" />
                      Test {module.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {lastSyncResults.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-body text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Sync Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lastSyncResults.map((result) => (
                  <div key={`${result.module}-${result.timestamp}`} className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-sm font-medium capitalize text-foreground">{MODULES.find((item) => item.key === result.module)?.label || result.module}</span>
                          <Badge variant="secondary" className="font-body text-[10px]">
                            {result.incremental ? "Incremental" : "Full scan"}
                          </Badge>
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          {result.queryName} · requested {result.requestedCost ?? "?"} · actual {result.actualCost ?? "?"} · available {result.currentlyAvailable ?? "?"}
                        </p>
                        {result.lastSuccessAt && (
                          <p className="font-body text-xs text-muted-foreground">Last success: {new Date(result.lastSuccessAt).toLocaleString()}</p>
                        )}
                        {result.error && (
                          <p className="font-body text-xs text-red-600 mt-1 break-all">{result.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-body text-sm text-foreground">{result.records} records</span>
                      <p className="font-body text-xs text-muted-foreground">{new Date(result.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-body text-base">Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncLogs.length === 0 && (
                <p className="font-body text-sm text-muted-foreground">No syncs yet. Connect Jobber and click Sync Now.</p>
              )}
              {syncLogs.map((log) => (
                <div key={log.id}>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : log.status === "partial" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : log.status === "running" ? (
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-body text-sm text-foreground truncate">{log.sync_type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-body text-muted-foreground shrink-0">
                      <span>{log.records_synced ?? 0} records</span>
                      <span>{formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {log.error_message && log.status !== "success" && (
                    <p className="font-body text-xs text-red-600 pl-6 pb-2 break-all">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                ].map((item) => (
                  <div key={item.role} className="flex items-start gap-2 py-1.5">
                    <Badge variant="secondary" className="font-body text-xs shrink-0">{item.role}</Badge>
                    <span className="text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                <li>Click "Test Connection" to verify API access</li>
                <li>Run staged module syncs to populate cache safely</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </OpsLayout>
  );
}
