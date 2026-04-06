import { useState, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings, Palette, Hash, CreditCard, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Zap, Globe,
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
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-body text-sm text-foreground">Online Payments</span>
                  <span className="ml-auto text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/15 text-primary">Ready</span>
                </div>
                <p className="font-body text-[11px] text-muted-foreground mt-1">
                  Stripe integration ready. Configure per-business payment accounts to enable customer checkout.
                </p>
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
                            <span className="font-body text-xs font-medium text-foreground capitalize">{log.module_name}</span>
                            <span className={cn(
                              "text-[10px] font-body px-1.5 py-0.5 rounded-full",
                              log.status === "completed" ? "bg-primary/15 text-primary" :
                              log.status === "failed" ? "bg-destructive/15 text-destructive" :
                              "bg-yellow-500/15 text-yellow-600"
                            )}>{log.status}</span>
                          </div>
                          <span className="font-body text-[10px] text-muted-foreground">
                            {format(new Date(log.started_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] font-body text-muted-foreground">
                          <span className="text-primary">+{log.records_created}</span>
                          <span className="text-yellow-600">~{log.records_updated}</span>
                          <span>⊘{log.records_skipped}</span>
                          {log.records_failed > 0 && <span className="text-destructive">✕{log.records_failed}</span>}
                        </div>
                        {log.error_summary && (
                          <p className="font-body text-[10px] text-destructive mt-1">{log.error_summary}</p>
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

  useEffect(() => {
    supabase.from("jobber_tokens").select("id").limit(1).then(({ data }) => {
      setHasToken(!!(data && data.length > 0));
    });
  }, []);

  return (
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
  );
}
