import { useState, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings, Palette, Hash, CreditCard, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Zap, Globe, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

            {/* Numbering */}
            <NumberingSection businessId={selectedBusinessId} />

            {/* Integrations */}
            <SettingsSection title="Integrations" icon={Zap}>
              <JobberConnectionStatus />
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

function JobberConnectionStatus() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("jobber_tokens").select("id").limit(1).then(({ data }) => {
      setHasToken(!!(data && data.length > 0));
    });
    // Get last sync
    supabase.from("sync_logs").select("completed_at").order("started_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].completed_at) {
          setLastSync(data[0].completed_at);
        }
      });
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("jobber-sync");
      if (error) throw error;
      toast({ title: "Sync complete", description: "Clients, jobs, and properties updated." });
      // Refresh last sync time
      const { data } = await supabase.from("sync_logs").select("completed_at").order("started_at", { ascending: false }).limit(1);
      if (data && data.length > 0 && data[0].completed_at) setLastSync(data[0].completed_at);
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message || "Unknown error", variant: "destructive" });
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-body text-sm text-foreground">Jobber</span>
        {hasToken === null ? (
          <span className="ml-auto text-[10px] font-body text-muted-foreground">Checking...</span>
        ) : hasToken ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-body text-primary">
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-body text-destructive">
            <XCircle className="w-3 h-3" /> Not connected
          </span>
        )}
      </div>
      {lastSync && (
        <p className="font-body text-[10px] text-muted-foreground">
          Last synced: {format(new Date(lastSync), "MMM d, h:mm a")}
        </p>
      )}
      {hasToken && (
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
    const { error } = await supabase
      .from("payment_provider_accounts")
      .update({ [field]: !current })
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
