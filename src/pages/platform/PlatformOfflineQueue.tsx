import { useEffect, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudOff, RefreshCw, Trash2, Database, ServerCrash } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQueueStats } from "@/lib/offline/hooks";
import { processQueueOnce, retryFailedMutation } from "@/lib/offline/sync";
import { deleteMutation } from "@/lib/offline/queue";
import SyncStatusBadge from "@/components/platform/offline/SyncStatusBadge";
import { formatDistanceToNow } from "date-fns";

interface ServerReceipt {
  client_mutation_id: string;
  user_id: string | null;
  business_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export default function PlatformOfflineQueue() {
  const { mutations, pending, syncing, synced, failed, refresh } = useQueueStats();
  const [tab, setTab] = useState<"local" | "server">("local");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { data: serverReceipts } = useQuery({
    queryKey: ["mutation_idempotency"],
    enabled: tab === "server",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mutation_idempotency")
        .select("client_mutation_id,user_id,business_id,action_type,entity_type,entity_id,status,error,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ServerReceipt[];
    },
  });

  return (
    <PlatformLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <CloudOff className="w-6 h-6" /> Offline Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Inspect and retry crew actions that were captured offline. Local view shows this device's queue.
              Server view shows all mutation receipts written by any device.
            </p>
          </div>
          <Button onClick={() => void processQueueOnce()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Sync now
          </Button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
            <Stat label="Pending" value={pending} cls="text-muted-foreground" />
            <Stat label="Syncing" value={syncing} cls="text-primary" />
            <Stat label="Synced" value={synced} cls="text-emerald-300" />
            <Stat label="Failed" value={failed} cls="text-red-300" />
          </div>
        </Card>

        <div className="flex gap-2">
          <Button
            variant={tab === "local" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("local")}
          >
            <Database className="w-4 h-4 mr-1" /> Local device
          </Button>
          <Button
            variant={tab === "server" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("server")}
          >
            <ServerCrash className="w-4 h-4 mr-1" /> Server receipts
          </Button>
        </div>

        {tab === "local" && (
          <Card className="p-0 overflow-hidden">
            {mutations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No queued mutations on this device.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {mutations.map((m) => (
                  <div key={m.client_mutation_id} className="p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{m.action.replace(/_/g, " ")}</span>
                        <SyncStatusBadge status={m.status} />
                        <span className="text-[11px] text-muted-foreground">
                          job {m.job_id.slice(0, 8)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(m.created_at, { addSuffix: true })}
                        </span>
                        {m.attempts > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {m.attempts} attempt{m.attempts === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </div>
                      {m.last_error && (
                        <div className="text-xs text-red-300 mt-1 break-words">{m.last_error}</div>
                      )}
                      <div className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                        {m.client_mutation_id}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {m.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={async () => {
                            await retryFailedMutation(m.client_mutation_id);
                            toast.success("Retry queued");
                          }}
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={async () => {
                          await deleteMutation(m.client_mutation_id);
                          toast.success("Removed from queue");
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab === "server" && (
          <Card className="p-0 overflow-hidden">
            {!serverReceipts || serverReceipts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No server receipts yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {serverReceipts.map((r) => (
                  <div key={r.client_mutation_id} className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{r.action_type.replace(/_/g, " ")}</span>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "success"
                            ? "text-emerald-300 border-emerald-500/40"
                            : "text-red-300 border-red-500/40"
                        }
                      >
                        {r.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {r.entity_type} {r.entity_id?.slice(0, 8)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {r.error && (
                      <div className="text-xs text-red-300 mt-1 break-words">{r.error}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                      {r.client_mutation_id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}