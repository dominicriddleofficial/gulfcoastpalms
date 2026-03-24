import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Search, LogOut, Phone, Mail, MapPin, Download,
  ChevronDown, ChevronUp, ArrowLeft, CheckCircle, XCircle,
  Users, Clock, FileText, Mic,
} from "lucide-react";

type Application = {
  id: string;
  full_name: string;
  age: number | null;
  phone: string;
  email: string | null;
  city: string | null;
  position: string;
  has_transportation: boolean;
  has_experience: string | null;
  work_experience: string | null;
  comfortable_outdoors: boolean;
  why_good_fit: string | null;
  resume_url: string | null;
  voice_note_url: string | null;
  best_contact_time: string | null;
  acknowledged: boolean;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["new", "reviewed", "interview", "hired", "rejected"] as const;

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  interview: "bg-purple-100 text-purple-800",
  hired: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const AdminApplicants = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchApps();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/login"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) navigate("/admin/login");
  };

  const fetchApps = async () => {
    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast({ title: "Error loading applications", variant: "destructive" }); return; }
    setApps((data as Application[]) || []);
    setLoading(false);
  };

  const updateApp = async (id: string, updates: Partial<Application>) => {
    const { error } = await supabase.from("job_applications").update(updates).eq("id", id);
    if (error) { toast({ title: "Error updating", variant: "destructive" }); return; }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    toast({ title: "Updated" });
  };

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("applications").createSignedUrl(path, 3600);
    return data?.signedUrl || "#";
  };

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (positionFilter !== "all" && a.position !== positionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.full_name.toLowerCase().includes(q) || a.phone.includes(q) || a.email?.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [apps, statusFilter, positionFilter, search]);

  const stats = useMemo(() => ({
    total: apps.length,
    new: apps.filter((a) => a.status === "new").length,
    interview: apps.filter((a) => a.status === "interview").length,
    hired: apps.filter((a) => a.status === "hired").length,
  }), [apps]);

  const exportCSV = () => {
    const headers = ["Name", "Age", "Phone", "Email", "City", "Position", "Transportation", "Status", "Applied"];
    const rows = filtered.map((a) => [a.full_name, a.age, a.phone, a.email, a.city, a.position, a.has_transportation ? "Yes" : "No", a.status, a.created_at]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(String(c || "")).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants-${format(new Date(), "yyyy-MM-dd")}.csv`;
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
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="font-body">
              <ArrowLeft className="w-4 h-4 mr-1" /> Leads
            </Button>
            <h1 className="font-display text-2xl font-bold text-foreground">Applicants</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="font-body">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="font-body">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
            { label: "New", value: stats.new, icon: Clock, color: "text-blue-600" },
            { label: "Interview", value: stats.interview, icon: Phone, color: "text-purple-600" },
            { label: "Hired", value: stats.hired, icon: CheckCircle, color: "text-green-600" },
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
            <Input placeholder="Search applicants..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
              <option value="all">All Positions</option>
              <option value="Team Leader">Team Leader</option>
              <option value="Groundsman">Groundsman</option>
              <option value="Open to Either">Open to Either</option>
            </select>
          </div>
        </div>

        {/* Applicant Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground font-body py-12">No applicants found.</p>
          )}
          {filtered.map((app) => {
            const isExpanded = expandedId === app.id;
            return (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-body font-semibold text-foreground truncate">{app.full_name}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {format(new Date(app.created_at), "MMM d, h:mm a")} · {app.position}
                        {app.city && ` · ${app.city}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn("font-body text-xs capitalize", statusColors[app.status])}>{app.status}</Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-body">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${app.phone}`} className="text-primary hover:underline">{app.phone}</a>
                        </div>
                        {app.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{app.email}</span>
                          </div>
                        )}
                        {app.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{app.city}</span>
                          </div>
                        )}
                        {app.age && <p><span className="text-muted-foreground">Age:</span> {app.age}</p>}
                        <p>
                          <span className="text-muted-foreground">Transportation:</span>{" "}
                          {app.has_transportation ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Outdoor work:</span>{" "}
                          {app.comfortable_outdoors ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}
                        </p>
                        {app.best_contact_time && <p><span className="text-muted-foreground">Best time:</span> {app.best_contact_time}</p>}
                      </div>

                      {/* Experience */}
                      {app.has_experience && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-1">Equipment/Labor Experience</p>
                          <p className="font-body text-sm bg-secondary p-3 rounded-lg">{app.has_experience}</p>
                        </div>
                      )}
                      {app.work_experience && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-1">Work Experience</p>
                          <p className="font-body text-sm bg-secondary p-3 rounded-lg">{app.work_experience}</p>
                        </div>
                      )}
                      {app.why_good_fit && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-1">Why They'd Be a Good Fit</p>
                          <p className="font-body text-sm bg-secondary p-3 rounded-lg">{app.why_good_fit}</p>
                        </div>
                      )}

                      {/* Files */}
                      {(app.resume_url || app.voice_note_url) && (
                        <div className="flex gap-3">
                          {app.resume_url && (
                            <Button variant="outline" size="sm" className="font-body text-xs" onClick={async () => {
                              const { data } = await supabase.storage.from("applications").createSignedUrl(app.resume_url!, 3600);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }}>
                              <FileText className="w-3 h-3 mr-1" /> Resume
                            </Button>
                          )}
                          {app.voice_note_url && (
                            <Button variant="outline" size="sm" className="font-body text-xs" onClick={async () => {
                              const { data } = await supabase.storage.from("applications").createSignedUrl(app.voice_note_url!, 3600);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }}>
                              <Mic className="w-3 h-3 mr-1" /> Voice Note
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <p className="font-body text-xs text-muted-foreground mb-2">Status</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUSES.map((s) => (
                            <Button
                              key={s}
                              variant={app.status === s ? "default" : "outline"}
                              size="sm"
                              className="font-body text-xs capitalize"
                              onClick={() => updateApp(app.id, { status: s })}
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
                          value={editNotes[app.id] ?? app.notes ?? ""}
                          onChange={(e) => setEditNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                          placeholder="Add notes about this applicant..."
                        />
                        {(editNotes[app.id] !== undefined && editNotes[app.id] !== (app.notes ?? "")) && (
                          <Button size="sm" className="mt-2 font-body" onClick={() => updateApp(app.id, { notes: editNotes[app.id] })}>
                            Save Notes
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

export default AdminApplicants;
