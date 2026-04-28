import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Upload, Download, Trash2, ShieldCheck, FileText, ClipboardList,
  CalendarClock, Search,
} from "lucide-react";
import { format, isBefore, addDays } from "date-fns";

type Category = "insurance" | "tax" | "form";

interface DocRow {
  id: string;
  business_id: string;
  document_category: Category;
  document_name: string;
  document_subtype: string | null;
  related_employee_id: string | null;
  related_employee_name: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_mime_type: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
}

const CONFIG: Record<Category, {
  title: string;
  description: string;
  icon: typeof ShieldCheck;
  subtypeLabel: string;
  subtypeOptions: string[];
  showExpiration: boolean;
}> = {
  insurance: {
    title: "Insurance",
    description: "Certificates of insurance, liability policies, workers' comp.",
    icon: ShieldCheck,
    subtypeLabel: "Policy Type",
    subtypeOptions: ["General Liability", "Workers Comp", "Auto", "Umbrella", "COI", "Other"],
    showExpiration: true,
  },
  tax: {
    title: "Tax Info",
    description: "W-9s, 1099s, and tax-related documents per team member.",
    icon: FileText,
    subtypeLabel: "Document Type",
    subtypeOptions: ["W-9", "W-2", "1099", "EIN Letter", "State Tax", "Other"],
    showExpiration: false,
  },
  form: {
    title: "Forms",
    description: "Contracts, waivers, equipment agreements, and general documents.",
    icon: ClipboardList,
    subtypeLabel: "Form Type",
    subtypeOptions: ["Contract", "Waiver", "Equipment Agreement", "Onboarding", "Handbook", "Other"],
    showExpiration: true,
  },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ContentProps {
  category: Category;
}

function DocumentsContent({ category }: ContentProps) {
  const auth = usePlatformAuth();
  const { toast } = useToast();
  const cfg = CONFIG[category];
  const Icon = cfg.icon;

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [subtypeFilter, setSubtypeFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);

  // form state
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [subtype, setSubtype] = useState<string>(cfg.subtypeOptions[0]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const businessId = auth.selectedBusinessId;

  const fetchDocs = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_documents")
      .select("*")
      .eq("business_id", businessId)
      .eq("document_category", category)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load documents", description: error.message, variant: "destructive" });
    } else {
      setDocs((data || []) as DocRow[]);
    }
    setLoading(false);
  }, [businessId, category, toast]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from("employees").select("id, name").order("name");
    setEmployees((data || []) as Employee[]);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const resetForm = () => {
    setFile(null);
    setDocName("");
    setSubtype(cfg.subtypeOptions[0]);
    setEmployeeId("");
    setExpirationDate("");
    setNotes("");
  };

  const handleUpload = async () => {
    if (!businessId) return;
    if (!file) { toast({ title: "Select a file", variant: "destructive" }); return; }
    if (!docName.trim()) { toast({ title: "Document name required", variant: "destructive" }); return; }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${businessId}/${category}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("platform-documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const emp = employees.find(e => e.id === employeeId);
      const { error: insErr } = await supabase.from("platform_documents").insert({
        business_id: businessId,
        document_category: category,
        document_name: docName.trim(),
        document_subtype: subtype || null,
        related_employee_id: employeeId || null,
        related_employee_name: emp?.name || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_mime_type: file.type || null,
        expiration_date: cfg.showExpiration && expirationDate ? expirationDate : null,
        notes: notes.trim() || null,
        uploaded_by: auth.userId,
      });
      if (insErr) {
        await supabase.storage.from("platform-documents").remove([path]);
        throw insErr;
      }

      toast({ title: "Document uploaded" });
      resetForm();
      setShowAdd(false);
      fetchDocs();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: DocRow) => {
    const { data, error } = await supabase.storage
      .from("platform-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (doc: DocRow) => {
    if (!confirm(`Delete "${doc.document_name}"?`)) return;
    const { error: sErr } = await supabase.storage.from("platform-documents").remove([doc.file_path]);
    if (sErr) {
      toast({ title: "Storage delete failed", description: sErr.message, variant: "destructive" });
    }
    const { error } = await supabase.from("platform_documents").delete().eq("id", doc.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    fetchDocs();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(d => {
      if (employeeFilter !== "all") {
        if (employeeFilter === "_none" ? d.related_employee_id : d.related_employee_id !== employeeFilter) return false;
      }
      if (subtypeFilter !== "all" && d.document_subtype !== subtypeFilter) return false;
      if (!q) return true;
      return (
        d.document_name.toLowerCase().includes(q) ||
        (d.related_employee_name?.toLowerCase().includes(q) ?? false) ||
        (d.document_subtype?.toLowerCase().includes(q) ?? false) ||
        (d.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [docs, search, employeeFilter, subtypeFilter]);

  const expirationBadge = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground/60">—</span>;
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const soon = isBefore(d, addDays(now, 30));
    const expired = isBefore(d, now);
    return (
      <Badge
        variant="outline"
        className={
          expired
            ? "border-destructive/40 text-destructive bg-destructive/10"
            : soon
            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
            : "border-border text-muted-foreground"
        }
      >
        <CalendarClock className="w-3 h-3 mr-1" />
        {format(d, "MMM d, yyyy")}
        {expired ? " · expired" : soon ? " · soon" : ""}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">{cfg.title}</h1>
            <p className="font-body text-xs text-muted-foreground">{cfg.description}</p>
          </div>
        </div>
        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="font-body min-h-[44px]">
              <Plus className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Upload {cfg.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="font-body text-xs">File</Label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="font-body"
                />
                {file && (
                  <p className="font-body text-[11px] text-muted-foreground mt-1">
                    {file.name} · {formatBytes(file.size)}
                  </p>
                )}
              </div>
              <div>
                <Label className="font-body text-xs">Document Name</Label>
                <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. 2026 General Liability COI" />
              </div>
              <div>
                <Label className="font-body text-xs">{cfg.subtypeLabel}</Label>
                <select
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm"
                >
                  {cfg.subtypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <Label className="font-body text-xs">Related Employee (optional)</Label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm"
                >
                  <option value="">— Company-wide —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              {cfg.showExpiration && (
                <div>
                  <Label className="font-body text-xs">Expiration Date (optional)</Label>
                  <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                </div>
              )}
              <div>
                <Label className="font-body text-xs">Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="w-full font-body min-h-[44px]">
                <Upload className="w-4 h-4 mr-1.5" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card/60 border-border backdrop-blur-sm">
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, employee, notes..."
              className="pl-8 font-body text-sm"
            />
          </div>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm"
          >
            <option value="all">All employees</option>
            <option value="_none">Company-wide only</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm"
          >
            <option value="all">All {cfg.subtypeLabel.toLowerCase()}s</option>
            {cfg.subtypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/60 border-border backdrop-blur-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground font-body py-12 text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Icon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-body text-sm text-muted-foreground">
                {docs.length === 0 ? `No ${cfg.title.toLowerCase()} documents yet.` : "No documents match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-body text-[11px] uppercase tracking-wide">Document</TableHead>
                    <TableHead className="font-body text-[11px] uppercase tracking-wide">{cfg.subtypeLabel}</TableHead>
                    <TableHead className="font-body text-[11px] uppercase tracking-wide">Employee</TableHead>
                    <TableHead className="font-body text-[11px] uppercase tracking-wide">Uploaded</TableHead>
                    {cfg.showExpiration && (
                      <TableHead className="font-body text-[11px] uppercase tracking-wide">Expires</TableHead>
                    )}
                    <TableHead className="font-body text-[11px] uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(doc => (
                    <TableRow key={doc.id} className="border-border">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-body text-sm font-medium text-foreground">{doc.document_name}</span>
                          <span className="font-body text-[11px] text-muted-foreground truncate max-w-[280px]">
                            {doc.file_name} · {formatBytes(doc.file_size)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.document_subtype ? (
                          <Badge variant="secondary" className="font-body text-xs">{doc.document_subtype}</Badge>
                        ) : <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="font-body text-sm text-foreground">
                          {doc.related_employee_name || <span className="text-muted-foreground/60">Company-wide</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-body text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      {cfg.showExpiration && (
                        <TableCell>{expirationBadge(doc.expiration_date)}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(doc)}
                            className="h-9 w-9 p-0"
                            aria-label="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(doc)}
                            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlatformDocuments() {
  const params = useParams<{ category?: string }>();
  const cat = (params.category as Category) || "insurance";
  const valid: Category = cat === "tax" || cat === "form" ? cat : "insurance";
  return (
    <PlatformLayout>
      <DocumentsContent category={valid} />
    </PlatformLayout>
  );
}