import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { usePlatformLeads, LEAD_STATUSES } from "@/hooks/usePlatformLeads";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Phone, Mail, Clock, ArrowRight, MessageSquare,
  Calendar, Tag, AlertTriangle, User, Globe,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { PlatformLead } from "@/hooks/usePlatformLeads";

function LeadStatusBadge({ status }: { status: string }) {
  const s = LEAD_STATUSES.find(ls => ls.value === status);
  if (!s) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
      style={{ backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </span>
  );
}

function UrgencyDot({ createdAt, status }: { createdAt: string; status: string }) {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  const isNew = status === "new";
  if (isNew) {
    return (
      <span className="relative inline-flex w-2.5 h-2.5" title="New lead">
        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
      </span>
    );
  }
  if (mins > 60) return <span className="w-2 h-2 rounded-full bg-destructive inline-block" title="Over 1 hour old" />;
  if (mins > 15) return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" title="Over 15 min" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />;
}

export default function PlatformLeads() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const {
    leads, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, updateLeadStatus, refetch,
  } = usePlatformLeads(selectedBusinessId);

  const [selectedLead, setSelectedLead] = useState<PlatformLead | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const getBizInfo = (bizId: string) => businesses.find(b => b.id === bizId);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
            <p className="font-body text-sm text-muted-foreground">
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4" /> New Lead
          </Button>
        </div>

        {/* Status pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap transition-all border",
              statusFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            )}
          >
            All ({leads.length})
          </button>
          {LEAD_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap transition-all border",
                statusFilter === s.value
                  ? "border-primary/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
              style={statusFilter === s.value ? { backgroundColor: s.color + "20", color: s.color, borderColor: s.color + "40" } : {}}
            >
              {s.label} ({statusCounts[s.value] || 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border h-10"
          />
        </div>

        {/* Leads list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="font-body text-muted-foreground">No leads found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map(lead => {
              const biz = getBizInfo(lead.business_id);
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <UrgencyDot createdAt={lead.created_at} />
                        <span className="font-body text-sm font-medium text-foreground truncate">
                          {lead.inquiry_name}
                        </span>
                        {biz && <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
                        {lead.inquiry_phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.inquiry_phone}</span>
                        )}
                        {lead.inquiry_email && (
                          <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{lead.inquiry_email}</span>
                        )}
                        {lead.requested_service && (
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{lead.requested_service}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/70 font-body">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                        {lead.source_name && (
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" />{lead.source_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <LeadStatusBadge status={lead.lead_status} />
                      {lead.urgency_level === "urgent" && (
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead Detail Drawer */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <LeadDetail
              lead={selectedLead}
              biz={getBizInfo(selectedLead.business_id)}
              onStatusChange={async (newStatus) => {
                const ok = await updateLeadStatus(selectedLead.id, newStatus);
                if (ok) setSelectedLead({ ...selectedLead, lead_status: newStatus });
              }}
              onClose={() => setSelectedLead(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Lead Drawer */}
      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          <CreateLeadForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onCreated={() => { setShowCreateForm(false); refetch(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function LeadDetail({ lead, biz, onStatusChange, onClose }: {
  lead: PlatformLead;
  biz: any;
  onStatusChange: (status: string) => void;
  onClose: () => void;
}) {
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    const { convertLeadToCustomer } = await import("@/lib/platform-conversions");
    const result = await convertLeadToCustomer(lead);
    setConverting(false);
    if (result.error) {
      alert("Conversion failed: " + result.error);
      return;
    }
    onStatusChange("won");
    onClose();
  };

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-2">
          {biz && <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />}
          <SheetTitle className="font-display text-lg text-foreground">{lead.inquiry_name}</SheetTitle>
        </div>
      </SheetHeader>

      {/* Status selector */}
      <div className="space-y-2">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Status</p>
        <Select value={lead.lead_status} onValueChange={onStatusChange}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {LEAD_STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact info */}
      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
        {lead.inquiry_phone && (
          <a href={`tel:${lead.inquiry_phone}`} className="flex items-center gap-2 text-sm text-primary font-body hover:underline">
            <Phone className="w-4 h-4" /> {lead.inquiry_phone}
          </a>
        )}
        {lead.inquiry_email && (
          <a href={`mailto:${lead.inquiry_email}`} className="flex items-center gap-2 text-sm text-primary font-body hover:underline">
            <Mail className="w-4 h-4" /> {lead.inquiry_email}
          </a>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Details</p>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Service" value={lead.requested_service} />
          <DetailItem label="Urgency" value={lead.urgency_level} />
          <DetailItem label="Source" value={lead.source_name} />
          <DetailItem label="Budget" value={lead.budget_range} />
          <DetailItem label="UTM Source" value={lead.utm_source} />
          <DetailItem label="UTM Medium" value={lead.utm_medium} />
        </div>
      </div>

      {lead.message && (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Message</p>
          <p className="font-body text-sm text-foreground bg-secondary rounded-lg p-3">{lead.message}</p>
        </div>
      )}

      {lead.lost_reason && (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Lost Reason</p>
          <p className="font-body text-sm text-destructive">{lead.lost_reason}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Timeline</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <Clock className="w-3 h-3" />
            Created {format(new Date(lead.created_at), "MMM d, yyyy h:mm a")}
          </div>
          {lead.next_follow_up_at && (
            <div className="flex items-center gap-2 text-xs font-body text-primary">
              <Calendar className="w-3 h-3" />
              Follow-up: {format(new Date(lead.next_follow_up_at), "MMM d, yyyy")}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 border-border"
          disabled={converting || lead.lead_status === "won"}
          onClick={handleConvert}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          {converting ? "Converting..." : lead.lead_status === "won" ? "Already Converted" : "Convert to Customer"}
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-border">
          <MessageSquare className="w-3.5 h-3.5" /> Add Note
        </Button>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-body text-sm text-foreground capitalize">{value}</p>
    </div>
  );
}

function CreateLeadForm({ businesses, selectedBusinessId, onCreated }: {
  businesses: any[];
  selectedBusinessId: string | null;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [bizId, setBizId] = useState(selectedBusinessId || businesses[0]?.id || "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("normal");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("platform_leads").insert({
      business_id: bizId,
      inquiry_name: name,
      inquiry_phone: phone || null,
      inquiry_email: email || null,
      requested_service: service || null,
      message: message || null,
      urgency_level: urgency,
      source_name: "manual",
      lead_status: "new",
    });
    setSubmitting(false);
    onCreated();
  };

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <SheetTitle className="font-display text-lg text-foreground">New Lead</SheetTitle>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {businesses.length > 1 && (
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Business</label>
            <Select value={bizId} onValueChange={setBizId}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {businesses.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="bg-secondary border-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-secondary border-border" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Requested Service</label>
          <Input value={service} onChange={e => setService(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Urgency</label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-md bg-secondary border border-border text-foreground font-body text-sm px-3 py-2 resize-none"
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting || !name}>
          {submitting ? "Creating..." : "Create Lead"}
        </Button>
      </form>
    </div>
  );
}
