import { useState, useEffect, useCallback } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, MessageSquare, Mail, Phone, FileText, ArrowUpRight, ArrowDownLeft,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CommLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  sent_at: string;
  created_at: string;
}

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  note: FileText,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "#2563eb",
  sms: "#8b5cf6",
  call: "var(--accent-color)",
  note: "#6b7280",
};

export default function PlatformComms() {
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("platform_comm_logs").select("*").order("sent_at", { ascending: false }).limit(100);
    if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
    const { data } = await q;
    setLogs((data as CommLog[]) || []);
    setLoading(false);
  }, [selectedBusinessId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Communications</h1>
            <p className="font-body text-xs text-muted-foreground">{logs.length} entries</p>
          </div>
          <Button size="sm" className="font-body text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Log Entry
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No communication logs yet</p>
            <p className="font-body text-xs text-muted-foreground/60 mt-1">Log emails, calls, SMS, and notes here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const Icon = CHANNEL_ICONS[log.channel] || FileText;
              const color = CHANNEL_COLORS[log.channel] || "#6b7280";
              return (
                <div key={log.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-body text-xs font-medium text-foreground capitalize">{log.channel}</span>
                      {log.direction === "inbound" ? (
                        <ArrowDownLeft className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className="font-body text-[10px] text-muted-foreground">
                        {format(new Date(log.sent_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {log.subject && <p className="font-body text-sm font-medium text-foreground truncate">{log.subject}</p>}
                    {log.body && <p className="font-body text-xs text-muted-foreground truncate mt-0.5">{log.body}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg">
          <CreateCommForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            userId={userId}
            onCreated={() => { setShowCreate(false); fetchLogs(); toast({ title: "Log entry added" }); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function CreateCommForm({ businesses, selectedBusinessId, userId, onCreated }: {
  businesses: any[]; selectedBusinessId: string | null; userId: string | null; onCreated: () => void;
}) {
  const [bizId, setBizId] = useState(selectedBusinessId || businesses[0]?.id || "");
  const [channel, setChannel] = useState("note");
  const [direction, setDirection] = useState("outbound");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!bizId) return;
    setSaving(true);
    await supabase.from("platform_comm_logs").insert({
      business_id: bizId,
      channel,
      direction,
      subject: subject || null,
      body: body || null,
      sent_by_user_id: userId,
      sent_at: new Date().toISOString(),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="space-y-4 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground">Log Communication</SheetTitle>
      </SheetHeader>
      {businesses.length > 1 && !selectedBusinessId && (
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Business</label>
          <Select value={bizId} onValueChange={setBizId}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Channel</label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="bg-card border-border text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Direction</label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="bg-card border-border text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Subject</label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-card border-border" />
      </div>
      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Body</label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} className="bg-card border-border min-h-[100px]" />
      </div>
      <Button className="w-full" onClick={submit} disabled={saving}>
        {saving ? "Saving..." : "Log Entry"}
      </Button>
    </div>
  );
}
