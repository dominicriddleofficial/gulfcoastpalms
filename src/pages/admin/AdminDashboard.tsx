import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Search, LogOut, Phone, MessageSquare, CalendarIcon, Download,
  ChevronDown, ChevronUp, AlertTriangle, AlertCircle, CheckCircle,
  Clock, Users, TrendingUp, Filter,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

const STATUSES = ["new", "contacted", "quote sent", "won", "lost"] as const;

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  "quote sent": "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const AdminDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchLeads();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/login"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) { navigate("/admin/login"); }
  };

  const fetchLeads = async () => {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) { toast({ title: "Error loading leads", variant: "destructive" }); return; }
    setLeads(data || []);
    setLoading(false);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) { toast({ title: "Error updating lead", variant: "destructive" }); return; }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    toast({ title: "Lead updated" });
  };

  const markContacted = (id: string) => updateLead(id, { status: "contacted", last_contacted: new Date().toISOString() });

  const getUrgency = (lead: Lead) => {
    if (lead.status !== "new") return null;
    const mins = differenceInMinutes(new Date(), new Date(lead.created_at));
    if (mins >= 60) return "critical";
    if (mins >= 15) return "warning";
    return null;
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (serviceFilter !== "all" && l.service !== serviceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q));
      }
      return true;
    });
  }, [leads, statusFilter, sourceFilter, serviceFilter, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    won: leads.filter((l) => l.status === "won").length,
    urgent: leads.filter((l) => getUrgency(l) !== null).length,
  }), [leads]);

  const sources = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean))], [leads]);
  const services = useMemo(() => [...new Set(leads.map((l) => l.service).filter(Boolean))], [leads]);

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "Source", "Service", "Location", "Status", "Created"];
    const rows = filtered.map((l) => [l.name, l.phone, l.email, l.source, l.service, l.location, l.status, l.created_at]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-body">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Lead Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="font-body">
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="font-body">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
            { label: "New", value: stats.new, icon: Clock, color: "text-blue-600" },
            { label: "Contacted", value: stats.contacted, icon: Phone, color: "text-yellow-600" },
            { label: "Won", value: stats.won, icon: TrendingUp, color: "text-green-600" },
            { label: "Urgent", value: stats.urgent, icon: AlertTriangle, color: "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={cn("w-5 h-5", color)} />
                <div>
                  <p className="font-body text-xs text-muted-foreground">{label}</p>
                  <p className={cn("font-body text-xl font-bold", color)}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
              <option value="all">All Sources</option>
              {sources.map((s) => <option key={s} value={s!}>{s}</option>)}
            </select>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
              <option value="all">All Services</option>
              {services.map((s) => <option key={s} value={s!}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Lead Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground font-body py-12">No leads found.</p>
          )}
          {filtered.map((lead) => {
            const urgency = getUrgency(lead);
            const isExpanded = expandedId === lead.id;
            return (
              <Card key={lead.id} className={cn(
                urgency === "critical" && "border-red-400 bg-red-50/50",
                urgency === "warning" && "border-yellow-400 bg-yellow-50/50"
              )}>
                <CardContent className="p-4">
                  {/* Summary Row */}
                  <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {urgency === "critical" && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                      {urgency === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-body font-semibold text-foreground truncate">{lead.name}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "MMM d, h:mm a")}
                          {lead.service && ` · ${lead.service}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn("font-body text-xs", statusColors[lead.status])}>{lead.status}</Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-body">
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>
                            <a href={`sms:${lead.phone}`} className="text-muted-foreground hover:text-primary"><MessageSquare className="w-4 h-4" /></a>
                          </div>
                        )}
                        {lead.email && <p><span className="text-muted-foreground">Email:</span> {lead.email}</p>}
                        {lead.location && <p><span className="text-muted-foreground">Location:</span> {lead.location}</p>}
                        {lead.source && <p><span className="text-muted-foreground">Source:</span> {lead.source}</p>}
                        {lead.sqft && <p><span className="text-muted-foreground">Sqft:</span> {lead.sqft}</p>}
                      </div>
                      {lead.message && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-1">Message</p>
                          <p className="font-body text-sm bg-secondary p-3 rounded-lg">{lead.message}</p>
                        </div>
                      )}

                      {/* Status Pipeline */}
                      <div>
                        <p className="font-body text-xs text-muted-foreground mb-2">Status</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUSES.map((s) => (
                            <Button
                              key={s}
                              variant={lead.status === s ? "default" : "outline"}
                              size="sm"
                              className="font-body text-xs capitalize"
                              onClick={() => updateLead(lead.id, { status: s })}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <p className="font-body text-xs text-muted-foreground mb-2">Notes</p>
                        <Textarea
                          className="font-body text-sm"
                          rows={3}
                          value={editNotes[lead.id] ?? lead.notes ?? ""}
                          onChange={(e) => setEditNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                          placeholder="Add notes..."
                        />
                        {(editNotes[lead.id] !== undefined && editNotes[lead.id] !== (lead.notes ?? "")) && (
                          <Button size="sm" className="mt-2 font-body" onClick={() => updateLead(lead.id, { notes: editNotes[lead.id] })}>
                            Save Notes
                          </Button>
                        )}
                      </div>

                      {/* Follow-up Date */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="font-body text-xs">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              {lead.follow_up_date ? format(new Date(lead.follow_up_date), "MMM d, yyyy") : "Set Follow-up"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={lead.follow_up_date ? new Date(lead.follow_up_date) : undefined}
                              onSelect={(date) => date && updateLead(lead.id, { follow_up_date: format(date, "yyyy-MM-dd") })}
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>

                        {lead.status === "new" && (
                          <Button size="sm" className="font-body text-xs" onClick={() => markContacted(lead.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Mark Contacted
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
