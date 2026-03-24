import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { format } from "date-fns";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("job_date", { ascending: false });
    setJobs(data || []);
    setLoading(false);
  };

  const employees = useMemo(() => [...new Set(jobs.map((j) => j.assigned_employee).filter(Boolean))].sort(), [jobs]);
  const cities = useMemo(() => [...new Set(jobs.map((j) => j.city).filter(Boolean))].sort(), [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (employeeFilter !== "all" && j.assigned_employee !== employeeFilter) return false;
      if (cityFilter !== "all" && j.city !== cityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return j.customer_name?.toLowerCase().includes(q) || j.service_line?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [jobs, search, employeeFilter, cityFilter]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Jobs</h1>
          <p className="font-body text-sm text-muted-foreground">{jobs.length} total jobs tracked</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Employees</option>
            {employees.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground font-body py-12">No jobs found. Upload a Jobber CSV to import jobs.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-body">Customer</TableHead>
                  <TableHead className="font-body">Date</TableHead>
                  <TableHead className="font-body hidden md:table-cell">Service</TableHead>
                  <TableHead className="font-body hidden md:table-cell">City</TableHead>
                  <TableHead className="font-body hidden md:table-cell">Employee</TableHead>
                  <TableHead className="font-body">Revenue</TableHead>
                  <TableHead className="font-body">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-body font-medium">{job.customer_name}</TableCell>
                    <TableCell className="font-body text-sm">{job.job_date ? format(new Date(job.job_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{job.service_line || "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{job.city || "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{job.assigned_employee || "—"}</TableCell>
                    <TableCell className="font-body text-sm">{job.revenue ? `$${job.revenue}` : "—"}</TableCell>
                    <TableCell>
                      {job.review_received ? (
                        <Badge className="bg-green-100 text-green-800 font-body text-xs">Received</Badge>
                      ) : job.review_requested ? (
                        <Badge className="bg-yellow-100 text-yellow-800 font-body text-xs">Requested</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-body text-xs">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
