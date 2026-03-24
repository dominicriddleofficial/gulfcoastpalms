import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ISSUE_TYPES = ["callback", "property damage", "missed area", "quality complaint", "scheduling", "other"] as const;

export default function AdminJobIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", job_date: "", date_reported: format(new Date(), "yyyy-MM-dd"), issue_type: "callback", crew_involved: "", notes: "" });
  const { toast } = useToast();

  useEffect(() => { fetchIssues(); }, []);

  const fetchIssues = async () => {
    const { data } = await supabase.from("job_issues").select("*").order("date_reported", { ascending: false });
    setIssues(data || []);
    setLoading(false);
  };

  const addIssue = async () => {
    if (!form.customer_name) { toast({ title: "Customer name required", variant: "destructive" }); return; }
    const { error } = await supabase.from("job_issues").insert({
      customer_name: form.customer_name,
      job_date: form.job_date || null,
      date_reported: form.date_reported || null,
      issue_type: form.issue_type,
      crew_involved: form.crew_involved || null,
      notes: form.notes || null,
    });
    if (error) { toast({ title: "Error adding issue", variant: "destructive" }); return; }
    toast({ title: "Issue logged" });
    setDialogOpen(false);
    setForm({ customer_name: "", job_date: "", date_reported: format(new Date(), "yyyy-MM-dd"), issue_type: "callback", crew_involved: "", notes: "" });
    fetchIssues();
  };

  const toggleResolved = async (id: string, current: boolean) => {
    await supabase.from("job_issues").update({ resolved: !current }).eq("id", id);
    setIssues(prev => prev.map(i => i.id === id ? { ...i, resolved: !current } : i));
  };

  const filtered = useMemo(() => {
    return issues.filter(i => {
      if (filter === "open" && i.resolved) return false;
      if (filter === "resolved" && !i.resolved) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.customer_name?.toLowerCase().includes(q) || i.crew_involved?.toLowerCase().includes(q) || i.issue_type?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [issues, search, filter]);

  const stats = useMemo(() => ({
    total: issues.length,
    open: issues.filter(i => !i.resolved).length,
    resolved: issues.filter(i => i.resolved).length,
  }), [issues]);

  if (loading) return <AdminLayout><p className="text-center text-muted-foreground font-body py-12">Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Job Issues</h1>
            <p className="font-body text-sm text-muted-foreground">{stats.open} open · {stats.resolved} resolved</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-body"><Plus className="w-4 h-4 mr-1" /> Log Issue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Log Job Issue</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="font-body text-sm">Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="font-body" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-body text-sm">Job Date</Label><Input type="date" value={form.job_date} onChange={e => setForm(f => ({ ...f, job_date: e.target.value }))} className="font-body" /></div>
                  <div><Label className="font-body text-sm">Date Reported</Label><Input type="date" value={form.date_reported} onChange={e => setForm(f => ({ ...f, date_reported: e.target.value }))} className="font-body" /></div>
                </div>
                <div><Label className="font-body text-sm">Issue Type</Label>
                  <select value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))} className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
                    {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label className="font-body text-sm">Crew Involved</Label><Input value={form.crew_involved} onChange={e => setForm(f => ({ ...f, crew_involved: e.target.value }))} className="font-body" placeholder="Employee name" /></div>
                <div><Label className="font-body text-sm">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="font-body" rows={3} /></div>
                <Button onClick={addIssue} className="w-full font-body">Log Issue</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map(issue => (
            <Card key={issue.id} className={cn(!issue.resolved && "border-red-200")}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {issue.resolved ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    <p className="font-body font-semibold text-foreground truncate">{issue.customer_name}</p>
                    <Badge variant="secondary" className="font-body text-[10px] capitalize">{issue.issue_type}</Badge>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">
                    Reported {issue.date_reported ? format(new Date(issue.date_reported), "MMM d, yyyy") : "—"}
                    {issue.crew_involved && ` · Crew: ${issue.crew_involved}`}
                  </p>
                  {issue.notes && <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-2">{issue.notes}</p>}
                </div>
                <Button variant="outline" size="sm" className="font-body text-xs shrink-0" onClick={() => toggleResolved(issue.id, issue.resolved)}>
                  {issue.resolved ? "Reopen" : "Resolve"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground font-body py-12">No issues logged.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}
