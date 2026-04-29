import { useState, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Settings, Palette, Hash, CreditCard, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Zap, Globe, Smartphone, Package, Plus, Trash2, Edit, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { format } from "date-fns";
import TeamMembersSection from "@/components/platform/settings/TeamMembersSection";

interface BizSettings {
  id: string;
  business_id: string;
  default_business_color: string | null;
  default_tax_rate: number | null;
  default_invoice_terms: string | null;
  default_quote_expiration_days: number | null;
  default_deposit_type: string | null;
  default_deposit_value: number | null;
  payments_enabled: boolean | null;
  automation_enabled: boolean | null;
}

interface SyncLog {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  records_synced: number;
  status: string;
  error_message: string | null;
}

export default function PlatformSettings() {
  type PaymentProviderAccountUpdate = Database["public"]["Tables"]["payment_provider_accounts"]["Update"];

  const { selectedBusinessId, businesses, isOwner } = usePlatformAuth();
  const [settings, setSettings] = useState<BizSettings | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [selectedBusinessId]);

  const fetchSettings = async () => {
    setLoading(true);
    if (selectedBusinessId) {
      const { data } = await supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", selectedBusinessId)
        .maybeSingle();
      setSettings(data as BizSettings | null);
    } else {
      setSettings(null);
    }

    const { data: logs } = await supabase
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    setSyncLogs((logs as SyncLog[]) || []);
    setLoading(false);
  };

  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="font-body text-xs text-muted-foreground">
            {selectedBiz ? selectedBiz.public_brand_name : "Platform"} configuration
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Settings */}
            {selectedBusinessId && settings && (
              <SettingsSection title="Business Settings" icon={Palette}>
                <div className="grid grid-cols-2 gap-3">
                  <SettingItem label="Brand Color" value={settings.default_business_color || "#22c55e"} />
                  <SettingItem label="Tax Rate" value={`${settings.default_tax_rate || 0}%`} />
                  <SettingItem label="Invoice Terms" value={settings.default_invoice_terms || "Due on receipt"} />
                  <SettingItem label="Quote Expiration" value={`${settings.default_quote_expiration_days || 30} days`} />
                  <SettingItem label="Deposit Type" value={settings.default_deposit_type || "percentage"} />
                  <SettingItem label="Deposit Value" value={`${settings.default_deposit_value || 50}${settings.default_deposit_type === "percentage" ? "%" : ""}`} />
                  <SettingItem label="Payments" value={settings.payments_enabled ? "Enabled" : "Disabled"} />
                  <SettingItem label="Automation" value={settings.automation_enabled ? "Enabled" : "Disabled"} />
                </div>
              </SettingsSection>
            )}

            {/* Saved Items */}
            {selectedBusinessId && (
              <SavedItemsSection businessId={selectedBusinessId} />
            )}

            {/* Numbering */}
            <NumberingSection businessId={selectedBusinessId} />

            {/* Notification Preferences */}
            <NotificationPreferencesSection />

            {/* Team Members (owner-only — handled inside the component) */}
            <TeamMembersSection />

            {/* Integrations */}
            <SettingsSection title="Integrations" icon={Zap}>
              <JobberConnectionStatus businessId={selectedBusinessId} />
              <div className="mt-3 pt-3 border-t border-border">
                <OnlinePaymentsConfig businessId={selectedBusinessId} businesses={businesses} />
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <TapToPayReadiness businessId={selectedBusinessId} businesses={businesses} />
              </div>
            </SettingsSection>

            {/* Sync Diagnostics */}
            {isOwner && (
              <SettingsSection title="Sync Diagnostics" icon={RefreshCw}>
                {syncLogs.length === 0 ? (
                  <p className="font-body text-xs text-muted-foreground py-4 text-center">No sync runs recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {syncLogs.map(log => (
                      <div key={log.id} className="bg-secondary/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-body text-xs font-medium text-foreground capitalize">{log.sync_type}</span>
                            <span className={cn(
                              "text-[10px] font-body px-1.5 py-0.5 rounded-full",
                              log.status === "completed" ? "bg-primary/15 text-primary" :
                              log.status === "failed" ? "bg-destructive/15 text-destructive" :
                              "bg-accent/15 text-accent"
                            )}>{log.status}</span>
                          </div>
                          <span className="font-body text-[10px] text-muted-foreground">
                            {format(new Date(log.started_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] font-body text-muted-foreground">
                          <span className="text-primary">synced: {log.records_synced}</span>
                        </div>
                        {log.error_message && (
                          <p className="font-body text-[10px] text-destructive mt-1">{log.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SettingsSection>
            )}

            {/* Business list for owner */}
            {isOwner && !selectedBusinessId && (
              <SettingsSection title="Businesses" icon={Globe}>
                <div className="space-y-2">
                  {businesses.map(b => (
                    <div key={b.id} className="bg-secondary/50 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.default_business_color || "#22c55e" }} />
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">{b.public_brand_name}</p>
                        <p className="font-body text-[10px] text-muted-foreground font-mono">{b.shortcode}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="platform-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2.5">
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-body text-sm text-foreground">{value}</p>
    </div>
  );
}

const NOTIFICATION_TYPES = [
  { type: "new_lead", label: "New leads", description: "When a new lead form is submitted" },
  { type: "quote_approved", label: "Quote approved", description: "When a customer approves a quote" },
  { type: "payment_received", label: "Payment received", description: "When an invoice is paid" },
  { type: "invoice_overdue", label: "Invoice overdue", description: "When an invoice passes its due date" },
  { type: "sync_completed", label: "Jobber sync complete", description: "Daily sync confirmations" },
  { type: "sync_failed", label: "Jobber sync failed", description: "Sync errors that need attention" },
  { type: "review_received", label: "New Google reviews", description: "When a new review is posted" },
];

function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { setLoadingPrefs(false); return; }
      setUserId(uid);
      const { data } = await supabase
        .from("platform_notification_preferences" as any)
        .select("notification_type, enabled")
        .eq("user_id", uid);
      const map: Record<string, boolean> = {};
      NOTIFICATION_TYPES.forEach(t => { map[t.type] = true; });
      (data as any[] | null)?.forEach((row: any) => { map[row.notification_type] = row.enabled; });
      setPrefs(map);
      setLoadingPrefs(false);
    })();
  }, []);

  const toggle = async (type: string, enabled: boolean) => {
    if (!userId) return;
    setPrefs(p => ({ ...p, [type]: enabled }));
    const { error } = await supabase
      .from("platform_notification_preferences" as any)
      .upsert({ user_id: userId, notification_type: type, enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id,notification_type" });
    if (error) {
      sonnerToast.error("Couldn't save preference");
      setPrefs(p => ({ ...p, [type]: !enabled }));
    }
  };

  return (
    <SettingsSection title="Notifications" icon={Bell}>
      {loadingPrefs ? (
        <div className="py-4 text-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-2">
          {NOTIFICATION_TYPES.map(t => (
            <div key={t.type} className="flex items-start justify-between gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-foreground font-medium">{t.label}</p>
                <p className="font-body text-[11px] text-muted-foreground">{t.description}</p>
              </div>
              <Switch
                checked={prefs[t.type] ?? true}
                onCheckedChange={(v) => toggle(t.type, v)}
              />
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

function NumberingSection({ businessId }: { businessId: string | null }) {
  const [sequences, setSequences] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      let q = supabase.from("numbering_sequences").select("*").order("record_type");
      if (businessId) q = q.eq("business_id", businessId);
      const { data } = await q;
      setSequences(data || []);
    };
    fetch();
  }, [businessId]);

  if (sequences.length === 0) return null;

  return (
    <SettingsSection title="Numbering Sequences" icon={Hash}>
      <div className="grid grid-cols-2 gap-2">
        {sequences.map(s => (
          <div key={s.id} className="bg-secondary/50 rounded-lg p-2.5">
            <p className="font-body text-[10px] text-muted-foreground capitalize">{s.record_type}</p>
            <p className="font-body text-sm text-foreground font-mono">
              {s.prefix}-{String(s.next_number).padStart(s.padding_length || 6, "0")}
            </p>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

function JobberConnectionStatus({ businessId }: { businessId: string | null }) {
  const [tokenInfo, setTokenInfo] = useState<{ exists: boolean; expiresAt: string | null; createdAt: string | null; isExpired: boolean } | null>(null);
  const [lastSyncLog, setLastSyncLog] = useState<{ status: string; completed_at: string | null; error_message: string | null; records_synced: number } | null>(null);
  const [dataCounts, setDataCounts] = useState<{ clients: number; jobs: number; properties: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResponse, setSyncResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDiagnostics = async () => {
    // Token status
    const { data: tokens } = await supabase.from("jobber_tokens").select("id, expires_at, created_at").limit(1);
    if (tokens && tokens.length > 0) {
      const t = tokens[0];
      const isExpired = t.expires_at ? new Date(t.expires_at) < new Date() : true;
      setTokenInfo({ exists: true, expiresAt: t.expires_at, createdAt: t.created_at, isExpired });
    } else {
      setTokenInfo({ exists: false, expiresAt: null, createdAt: null, isExpired: false });
    }

    // Last sync
    const { data: logs } = await supabase.from("sync_logs")
      .select("status, completed_at, error_message, records_synced")
      .order("started_at", { ascending: false }).limit(1);
    setLastSyncLog(logs?.[0] || null);

    // Data counts — scoped to active business so the diagnostic numbers
    // match what the rest of the platform shows for that workspace.
    const filterBiz = <T extends { eq: (k: string, v: string) => T }>(q: T) =>
      businessId ? q.eq("business_id", businessId) : q;
    const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
      filterBiz(supabase.from("jobber_clients").select("id", { count: "exact", head: true })),
      filterBiz(supabase.from("jobber_jobs").select("id", { count: "exact", head: true })),
      filterBiz(supabase.from("jobber_properties").select("id", { count: "exact", head: true })),
    ]);
    setDataCounts({ clients: c1 || 0, jobs: c2 || 0, properties: c3 || 0 });
  };

  useEffect(() => { loadDiagnostics(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [businessId]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("jobber-sync", {
        body: { businessId },
      });
      if (error) throw error;
      setSyncResponse(JSON.stringify(data, null, 2));
      toast({ title: "Sync complete", description: `${data?.records_synced || 0} records synced.` });
      await loadDiagnostics();
    } catch (err: any) {
      setSyncResponse(`Error: ${err.message || "Unknown error"}`);
      toast({ title: "Sync failed", description: err.message || "Unknown error", variant: "destructive" });
    }
    setSyncing(false);
  };

  // Determine state: A (not connected), B (connected ok), C (error/expired)
  const stateA = tokenInfo && !tokenInfo.exists;
  const stateC = tokenInfo?.exists && (tokenInfo.isExpired || lastSyncLog?.status === "failed");
  const stateB = tokenInfo?.exists && !stateC;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-body text-sm font-medium text-foreground">Jobber</span>
        {tokenInfo === null ? (
          <span className="ml-auto text-[10px] font-body text-muted-foreground">Checking...</span>
        ) : stateA ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-body text-destructive">
            <XCircle className="w-3 h-3" /> Not connected
          </span>
        ) : stateC ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-body text-[#f59e0b]">
            <AlertTriangle className="w-3 h-3" /> Needs attention
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-body text-primary">
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        )}
      </div>

      {/* State A - Not connected */}
      {stateA && (
        <p className="font-body text-[11px] text-muted-foreground">
          Jobber is not connected. Connect via OAuth to sync clients, jobs, and schedule data.
        </p>
      )}

      {/* State C - Error/Expired */}
      {stateC && (
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg p-2.5">
          <p className="font-body text-[11px] text-[#f59e0b] font-medium mb-1">
            {tokenInfo?.isExpired ? "⚠️ Jobber token has expired." : "⚠️ Last sync failed."}
          </p>
          {lastSyncLog?.error_message && (
            <p className="font-body text-[10px] text-destructive">{lastSyncLog.error_message}</p>
          )}
        </div>
      )}

      {/* Token details */}
      {tokenInfo?.exists && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/50 rounded-lg p-2">
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Token Created</p>
            <p className="font-body text-[11px] text-foreground">{tokenInfo.createdAt ? format(new Date(tokenInfo.createdAt), "MMM d, h:mm a") : "—"}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-2">
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Token Expires</p>
            <p className={cn("font-body text-[11px]", tokenInfo.isExpired ? "text-destructive" : "text-foreground")}>
              {tokenInfo.expiresAt ? format(new Date(tokenInfo.expiresAt), "MMM d, h:mm a") : "—"}
              {tokenInfo.isExpired && " (expired)"}
            </p>
          </div>
        </div>
      )}

      {/* Last sync */}
      {lastSyncLog && (
        <div className="bg-secondary/50 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Last Sync</p>
            <span className={cn(
              "text-[10px] font-body px-1.5 py-0.5 rounded-full",
              lastSyncLog.status === "success" ? "bg-primary/15 text-primary" :
              lastSyncLog.status === "failed" ? "bg-destructive/15 text-destructive" :
              "bg-[#f59e0b]/15 text-[#f59e0b]"
            )}>{lastSyncLog.status}</span>
          </div>
          <p className="font-body text-[11px] text-foreground">
            {lastSyncLog.completed_at ? format(new Date(lastSyncLog.completed_at), "MMM d, yyyy · h:mm a") : "In progress…"}
          </p>
          <p className="font-body text-[10px] text-primary mt-0.5">{lastSyncLog.records_synced} records synced</p>
          {lastSyncLog.error_message && (
            <p className="font-body text-[10px] text-destructive mt-1">{lastSyncLog.error_message}</p>
          )}
        </div>
      )}

      {/* Data counts */}
      {dataCounts && (
        <div className="grid grid-cols-3 gap-2">
          {([["Clients", dataCounts.clients], ["Jobs", dataCounts.jobs], ["Properties", dataCounts.properties]] as const).map(([label, count]) => (
            <div key={label} className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="font-body text-lg font-bold text-foreground">{count}</p>
              <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sync button */}
      {tokenInfo?.exists && (
        <Button
          size="sm"
          className="font-body text-xs w-full"
          disabled={syncing}
          onClick={handleSyncNow}
        >
          {syncing ? (
            <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Syncing…</>
          ) : (
            <><RefreshCw className="w-3 h-3 mr-1.5" /> Sync Now</>
          )}
        </Button>
      )}

      {/* Raw sync response */}
      {syncResponse && (
        <details className="mt-2">
          <summary className="font-body text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
            View raw sync response
          </summary>
          <pre className="mt-1 bg-secondary/70 rounded-lg p-2 text-[10px] font-mono text-foreground overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {syncResponse}
          </pre>
        </details>
      )}
    </div>
  );
}

function OnlinePaymentsConfig({ businessId, businesses }: { businessId: string | null; businesses: any[] }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, [businessId]);

  const loadAccounts = async () => {
    setLoading(true);
    let q = supabase.from("payment_provider_accounts").select("*, businesses(public_brand_name, shortcode)");
    if (businessId) q = q.eq("business_id", businessId);
    const { data } = await q;
    setAccounts(data || []);
    setLoading(false);
  };

  const togglePayments = async (accountId: string, field: "online_payments_enabled" | "active", current: boolean) => {
    setSaving(true);
    const updates = { [field]: !current } as Database["public"]["Tables"]["payment_provider_accounts"]["Update"];
    const { error } = await supabase
      .from("payment_provider_accounts")
      .update(updates)
      .eq("id", accountId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Payment setting updated.` });
      loadAccounts();
    }
    setSaving(false);
  };

  const createAccount = async (bizId: string) => {
    setSaving(true);
    const biz = businesses.find(b => b.id === bizId);
    const { error } = await supabase.from("payment_provider_accounts").insert({
      business_id: bizId,
      provider_type: "stripe",
      display_name: `${biz?.public_brand_name || "Business"} Stripe`,
      online_payments_enabled: true,
      active: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Created", description: "Payment account configured." });
      loadAccounts();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <span className="font-body text-sm text-foreground">Online Payments</span>
        <span className="ml-auto text-[10px] font-body text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const configuredBizIds = accounts.map(a => a.business_id);
  const unconfigured = (businessId ? businesses.filter(b => b.id === businessId) : businesses)
    .filter(b => !configuredBizIds.includes(b.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-primary" />
        <span className="font-body text-sm font-medium text-foreground">Online Payments</span>
        {accounts.length > 0 && (
          <span className="ml-auto text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            {accounts.filter(a => a.active && a.online_payments_enabled).length} active
          </span>
        )}
      </div>

      {accounts.map(acc => (
        <div key={acc.id} className="bg-secondary/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm font-medium text-foreground">
                {(acc as any).businesses?.public_brand_name || acc.display_name}
              </p>
              <p className="font-body text-[10px] text-muted-foreground font-mono uppercase">
                {(acc as any).businesses?.shortcode || "—"} · {acc.provider_type}
              </p>
            </div>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              acc.active && acc.online_payments_enabled ? "bg-primary" : "bg-muted-foreground/40"
            )} />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={acc.online_payments_enabled ? "default" : "outline"}
              className="h-7 text-[11px] flex-1"
              disabled={saving}
              onClick={() => togglePayments(acc.id, "online_payments_enabled", acc.online_payments_enabled)}
            >
              {acc.online_payments_enabled ? "Checkout Enabled" : "Enable Checkout"}
            </Button>
            <Button
              size="sm"
              variant={acc.active ? "secondary" : "destructive"}
              className="h-7 text-[11px]"
              disabled={saving}
              onClick={() => togglePayments(acc.id, "active", acc.active)}
            >
              {acc.active ? "Active" : "Disabled"}
            </Button>
          </div>
        </div>
      ))}

      {unconfigured.map(biz => (
        <div key={biz.id} className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between border border-dashed border-border">
          <div>
            <p className="font-body text-sm text-foreground">{biz.public_brand_name}</p>
            <p className="font-body text-[10px] text-muted-foreground">No payment account configured</p>
          </div>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            disabled={saving}
            onClick={() => createAccount(biz.id)}
          >
            Configure
          </Button>
        </div>
      ))}

      {accounts.length === 0 && unconfigured.length === 0 && (
        <p className="font-body text-[11px] text-muted-foreground text-center py-2">
          Select a business to configure payments.
        </p>
      )}
    </div>
  );
}

function TapToPayReadiness({ businessId, businesses }: { businessId: string | null; businesses: any[] }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let sq = supabase.from("terminal_sessions").select("*, businesses(public_brand_name, shortcode)").order("created_at", { ascending: false }).limit(5);
      if (businessId) sq = sq.eq("business_id", businessId);
      const { data: s } = await sq;
      setSessions(s || []);

      let tq = supabase.from("tap_to_pay_transactions").select("*").order("created_at", { ascending: false }).limit(10);
      if (businessId) tq = tq.eq("business_id", businessId);
      const { data: t } = await tq;
      setTransactions(t || []);
      setLoading(false);
    };
    load();
  }, [businessId]);

  const targetBizzes = businessId ? businesses.filter(b => b.id === businessId) : businesses;

  const readinessItems = [
    { label: "Stripe Online Checkout", status: "ready" as const },
    { label: "Stripe Webhook Reconciliation", status: "ready" as const },
    { label: "Payment Records / Invoice Reconciliation", status: "ready" as const },
    { label: "Stripe Terminal Backend Schema", status: "ready" as const },
    { label: "Connection Token Endpoint", status: "ready" as const },
    { label: "PaymentIntent Server Flow (In-Person)", status: "ready" as const },
    { label: "Business-Aware Payment Routing", status: "ready" as const },
    { label: "Mobile / Native Client Layer", status: "pending" as const },
    { label: "iPhone Tap to Pay Entitlement", status: "pending" as const },
    { label: "Android Tap to Pay", status: "pending" as const },
    { label: "Staff-Facing Tap to Pay UX", status: "pending" as const },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Smartphone className="w-4 h-4 text-primary" />
        <span className="font-body text-sm font-medium text-foreground">Tap to Pay</span>
        <span className="ml-auto text-[10px] font-body px-2 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/20">
          Setup Pending
        </span>
      </div>

      <p className="font-body text-[11px] text-muted-foreground leading-snug">
        Backend endpoints are ready. A native mobile app (iOS/Android) is required to complete Tap to Pay setup.
      </p>

      {/* Per-business readiness */}
      {targetBizzes.map(biz => (
        <div key={biz.id} className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: biz.default_business_color || "#22c55e" }} />
            <p className="font-body text-xs font-medium text-foreground">{biz.public_brand_name}</p>
            <span className="ml-auto font-body text-[10px] text-[#f59e0b]">Mobile Setup Required</span>
          </div>
        </div>
      ))}

      {/* Readiness checklist */}
      <div className="space-y-1">
        <p className="font-body text-[10px] font-semibold text-foreground uppercase tracking-wider mb-1">Readiness Checklist</p>
        {readinessItems.map(item => (
          <div key={item.label} className="flex items-center gap-2 py-0.5">
            {item.status === "ready" ? (
              <CheckCircle className="w-3 h-3 text-[#22c55e] shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-[#f59e0b] shrink-0" />
            )}
            <span className="font-body text-[11px] text-foreground">{item.label}</span>
            <span className={cn(
              "ml-auto font-body text-[10px]",
              item.status === "ready" ? "text-[#22c55e]" : "text-[#f59e0b]"
            )}>
              {item.status === "ready" ? "Ready" : "Pending"}
            </span>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="font-body text-[10px] font-semibold text-foreground uppercase tracking-wider mb-1">Recent Tap to Pay Transactions</p>
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between py-1">
              <span className="font-body text-[11px] text-foreground">${Number(t.amount).toLocaleString()}</span>
              <span className={cn(
                "font-body text-[10px] px-1.5 py-0.5 rounded-full",
                t.status === "completed" ? "bg-[#22c55e]/15 text-[#22c55e]" :
                t.status === "failed" ? "bg-destructive/15 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>{t.status}</span>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="font-body text-[10px] text-muted-foreground text-center py-2">Loading...</p>}
    </div>
  );
}

/* ─── Saved Items Section ─── */
const GCP_DEFAULTS = [
  { name: "Palm Tree Trimming", default_price: 0 },
  { name: "Palm Tree Removal", default_price: 0 },
  { name: "Trunk Skinning", default_price: 0 },
  { name: "Diamond Cut", default_price: 0 },
  { name: "Haul Away / Debris Removal", default_price: 0 },
  { name: "Landscaping", default_price: 0 },
];

const PPS_DEFAULTS = [
  { name: "Garage Floor Coating — Flake", default_price: 0 },
  { name: "Garage Floor Coating — Metallic", default_price: 0 },
  { name: "Exterior House Wash", default_price: 0 },
  { name: "Pressure Washing", default_price: 0 },
  { name: "Roof Soft Wash", default_price: 0 },
  { name: "Junk Removal", default_price: 0 },
];

function SavedItemsSection({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<Array<{ id: string; name: string; default_price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_saved_items")
      .select("id, name, default_price")
      .eq("business_id", businessId)
      .order("name");
    
    if (data && data.length === 0) {
      // Auto-seed defaults
      const { data: biz } = await supabase
        .from("businesses")
        .select("shortcode")
        .eq("id", businessId)
        .single();
      const defaults = biz?.shortcode === "pps" ? PPS_DEFAULTS : GCP_DEFAULTS;
      const { data: seeded } = await supabase
        .from("platform_saved_items")
        .insert(defaults.map(d => ({ ...d, business_id: businessId })))
        .select("id, name, default_price");
      setItems((seeded as any[]) || []);
    } else {
      setItems((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [businessId]);

  const addItem = async () => {
    if (!newName.trim()) return;
    await supabase.from("platform_saved_items").insert({
      business_id: businessId,
      name: newName.trim(),
      default_price: Number(newPrice) || 0,
    });
    setNewName("");
    setNewPrice("");
    fetchItems();
    sonnerToast.success("Item added");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("platform_saved_items").delete().eq("id", id);
    fetchItems();
    sonnerToast.success("Item deleted");
  };

  const saveEdit = async (id: string) => {
    await supabase.from("platform_saved_items").update({
      name: editName.trim(),
      default_price: Number(editPrice) || 0,
    }).eq("id", id);
    setEditing(null);
    fetchItems();
    sonnerToast.success("Item updated");
  };

  return (
    <SettingsSection title="Saved Line Items" icon={Package}>
      {loading ? (
        <p className="font-body text-xs text-muted-foreground py-4 text-center">Loading…</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-secondary/50 rounded-lg p-2.5 flex items-center gap-2">
              {editing === item.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)}
                    className="flex-1 h-7 text-xs bg-card border-border" />
                  <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                    className="w-20 h-7 text-xs text-right bg-card border-border" placeholder="$0" />
                  <Button size="sm" className="h-7 text-[10px]" onClick={() => saveEdit(item.id)}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditing(null)}>✕</Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-foreground truncate">{item.name}</p>
                  </div>
                  <span className="font-body text-xs text-muted-foreground shrink-0">
                    {item.default_price > 0 ? `$${item.default_price}` : "Varies"}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => { setEditing(item.id); setEditName(item.name); setEditPrice(String(item.default_price)); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Add new */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="New item name" className="flex-1 h-8 text-xs bg-card border-border" />
            <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
              placeholder="$0" className="w-20 h-8 text-xs text-right bg-card border-border" />
            <Button size="sm" className="h-8 text-xs" onClick={addItem} disabled={!newName.trim()}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
