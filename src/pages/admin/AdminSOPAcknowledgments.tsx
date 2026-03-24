import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface SOPAck {
  id: string;
  sop_type: string;
  full_name: string;
  phone: string;
  email: string;
  sign_date: string;
  signature_data: string;
  created_at: string;
}

const AdminSOPAcknowledgments = () => {
  const navigate = useNavigate();
  const [acks, setAcks] = useState<SOPAck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      fetchAcks();
    };
    checkAuth();
  }, [navigate]);

  const fetchAcks = async () => {
    const { data, error } = await supabase
      .from("sop_acknowledgments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAcks(data);
    setLoading(false);
  };

  const filtered = acks.filter((a) => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || a.sop_type === filterType;
    return matchesSearch && matchesType;
  });

  const exportCSV = () => {
    const headers = ["Name", "SOP Type", "Email", "Phone", "Date Signed", "Submitted At"];
    const rows = filtered.map((a) => [
      a.full_name, a.sop_type, a.email, a.phone, a.sign_date,
      format(new Date(a.created_at), "MM/dd/yyyy HH:mm"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sop-acknowledgments.csv";
    link.click();
  };

  const sopTypes = [...new Set(acks.map((a) => a.sop_type))];

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin")} className="text-neutral-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            SOP Acknowledgments
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{acks.length}</p>
              <p className="text-sm text-neutral-500">Total Signed</p>
            </CardContent>
          </Card>
          {sopTypes.map((type) => (
            <Card key={type} className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {acks.filter((a) => a.sop_type === type).length}
                </p>
                <p className="text-sm text-neutral-500 capitalize">{type.replace("-", " ")}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-neutral-900 border-neutral-700 text-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white text-sm"
          >
            <option value="all">All SOPs</option>
            {sopTypes.map((t) => (
              <option key={t} value={t} className="capitalize">{t.replace("-", " ")}</option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCSV} className="border-neutral-700 text-neutral-300 hover:text-white">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {loading ? (
          <p className="text-neutral-500 text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-neutral-500 text-center py-12">No acknowledgments found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((ack) => (
              <Card key={ack.id} className="bg-neutral-900 border-neutral-800">
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedId(expandedId === ack.id ? null : ack.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-neutral-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-white">{ack.full_name}</p>
                        <p className="text-sm text-neutral-500">{ack.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 capitalize">
                        {ack.sop_type.replace("-", " ")}
                      </Badge>
                      <span className="text-sm text-neutral-500 hidden md:block">
                        {format(new Date(ack.created_at), "MMM d, yyyy")}
                      </span>
                      {expandedId === ack.id ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </button>
                  {expandedId === ack.id && (
                    <div className="border-t border-neutral-800 p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-neutral-500">Phone</p>
                          <p className="text-white">{ack.phone}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Date Signed</p>
                          <p className="text-white">{ack.sign_date}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Submitted</p>
                          <p className="text-white">{format(new Date(ack.created_at), "MMM d, yyyy h:mm a")}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-neutral-500 text-sm mb-2">Signature</p>
                        <div className="bg-white rounded-lg p-2 inline-block">
                          <img src={ack.signature_data} alt="Signature" className="h-20" />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSOPAcknowledgments;
