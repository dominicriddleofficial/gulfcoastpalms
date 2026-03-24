import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Download, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear, getWeek } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("job_date", { ascending: false });
    setJobs(data || []);
    setLoading(false);
  };

  const employees = useMemo(() => [...new Set(jobs.map(j => j.assigned_employee).filter(Boolean))].sort(), [jobs]);
  const cities = useMemo(() => [...new Set(jobs.map(j => j.city).filter(Boolean))].sort(), [jobs]);
  const services = useMemo(() => [...new Set(jobs.map(j => j.service_line).filter(Boolean))].sort(), [jobs]);

  const filtered = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => {
      if (employeeFilter !== "all" && j.assigned_employee !== employeeFilter) return false;
      if (cityFilter !== "all" && j.city !== cityFilter) return false;
      if (serviceFilter !== "all" && j.service_line !== serviceFilter) return false;
      if (periodFilter !== "all" && j.job_date) {
        const d = new Date(j.job_date);
        if (periodFilter === "today" && j.job_date !== format(now, "yyyy-MM-dd")) return false;
        if (periodFilter === "week" && d < startOfWeek(now, { weekStartsOn: 1 })) return false;
        if (periodFilter === "month" && d < startOfMonth(now)) return false;
        if (periodFilter === "year" && d < startOfYear(now)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return j.customer_name?.toLowerCase().includes(q) || j.service_line?.toLowerCase().includes(q) || j.city?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [jobs, search, employeeFilter, cityFilter, serviceFilter, periodFilter]);

  const totalRevenue = filtered.reduce((s, j) => s + (Number(j.revenue) || 0), 0);

  const exportCSV = () => {
    const headers = ["Customer", "Date", "Day", "Service", "City", "Employee", "Revenue", "Review", "Status"];
    const rows = filtered.map(j => [
      j.customer_name, j.job_date, j.job_date ? format(new Date(j.job_date), "EEEE") : "", j.service_line, j.city, j.assigned_employee,
      j.revenue, j.review_received ? "Yes" : "No", j.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(String(c || "")).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `jobs-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Jobs</h1>
            <p className="font-body text-sm text-muted-foreground">{jobs.length} total · Showing {filtered.length}</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="font-body">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <div><p className="font-body text-xs text-muted-foreground">Showing</p><p className="font-body text-lg font-bold">{filtered.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <div><p className="font-body text-xs text-muted-foreground">Revenue</p><p className="font-body text-lg font-bold">${totalRevenue.toLocaleString()}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <div><p className="font-body text-xs text-muted-foreground">Avg Value</p><p className="font-body text-lg font-bold">${filtered.length ? Math.round(totalRevenue / filtered.length) : 0}</p></div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Employees</option>
            {employees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Services</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground font-body py-12">No jobs found.</p>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-body">Customer</TableHead>
                  <TableHead className="font-body">Date</TableHead>
                  <TableHead className="font-body hidden md:table-cell">Day</TableHead>
                  <TableHead className="font-body hidden md:table-cell">Service</TableHead>
                  <TableHead className="font-body hidden md:table-cell">City</TableHead>
                  <TableHead className="font-body hidden lg:table-cell">Employee</TableHead>
                  <TableHead className="font-body">Revenue</TableHead>
                  <TableHead className="font-body">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-body font-medium">{job.customer_name}</TableCell>
                    <TableCell className="font-body text-sm">{job.job_date ? format(new Date(job.job_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{job.job_date ? format(new Date(job.job_date), "EEE") : "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{job.service_line || "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{job.city || "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden lg:table-cell">{job.assigned_employee || "—"}</TableCell>
                    <TableCell className="font-body text-sm">{job.revenue ? `$${Number(job.revenue).toLocaleString()}` : "—"}</TableCell>
                    <TableCell>
                      {job.review_received ? (
                        <Badge className="bg-green-100 text-green-800 font-body text-[10px]">Yes</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-body text-[10px]">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <p className="text-center font-body text-xs text-muted-foreground py-3">Showing 200 of {filtered.length} jobs. Use filters to narrow results.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
