import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("display_name");
    setClients(data || []);
    setLoading(false);
  };

  const cities = useMemo(() => [...new Set(clients.map((c) => c.service_city).filter(Boolean))].sort(), [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (cityFilter !== "all" && c.service_city !== cityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.display_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.service_street?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clients, search, cityFilter]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Clients</h1>
          <p className="font-body text-sm text-muted-foreground">{clients.length} total clients</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground font-body py-12">No clients found. Upload a Jobber CSV to get started.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((client) => {
              const isExpanded = expandedId === client.id;
              return (
                <Card key={client.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : client.id)}>
                      <div className="min-w-0 flex-1">
                        <p className="font-body font-semibold truncate">{client.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {client.service_city || "No city"} {client.phone && `· ${client.phone}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {client.total_jobs > 0 && <Badge variant="secondary" className="font-body text-xs">{client.total_jobs} jobs</Badge>}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-body">
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <a href={`tel:${client.phone}`} className="text-primary hover:underline">{client.phone}</a>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.service_street && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{client.service_street}, {client.service_city} {client.service_state} {client.service_zip}</span>
                          </div>
                        )}
                        {client.lead_source && <p><span className="text-muted-foreground">Source:</span> {client.lead_source}</p>}
                        {client.total_revenue > 0 && <p><span className="text-muted-foreground">Revenue:</span> ${client.total_revenue}</p>}
                        {client.last_job_date && <p><span className="text-muted-foreground">Last Job:</span> {client.last_job_date}</p>}
                        {client.notes && <p className="col-span-2"><span className="text-muted-foreground">Notes:</span> {client.notes}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
