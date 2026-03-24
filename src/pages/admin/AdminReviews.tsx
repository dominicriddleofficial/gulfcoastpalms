import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Star } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newReview, setNewReview] = useState({ customer_name: "", review_date: "", review_source: "google", employee_name: "", rating: 5, review_text: "" });
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      supabase.from("reviews").select("*").order("review_date", { ascending: false }),
      supabase.from("employees").select("*"),
    ]).then(([r, e]) => {
      setReviews(r.data || []);
      setEmployees(e.data || []);
      setLoading(false);
    });
  }, []);

  const sources = useMemo(() => [...new Set(reviews.map((r) => r.review_source).filter(Boolean))], [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (sourceFilter !== "all" && r.review_source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.customer_name?.toLowerCase().includes(q) || r.employee_name?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reviews, search, sourceFilter]);

  const addReview = async () => {
    if (!newReview.customer_name.trim()) return;
    const now = new Date(newReview.review_date || new Date());
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const { error } = await supabase.from("reviews").insert({
      ...newReview,
      review_date: newReview.review_date || format(new Date(), "yyyy-MM-dd"),
      week_bucket: format(weekStart, "yyyy-'W'ww"),
      month_bucket: format(monthStart, "yyyy-MM"),
    });
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    toast({ title: "Review added" });
    setShowAdd(false);
    setNewReview({ customer_name: "", review_date: "", review_source: "google", employee_name: "", rating: 5, review_text: "" });
    const { data } = await supabase.from("reviews").select("*").order("review_date", { ascending: false });
    setReviews(data || []);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Reviews</h1>
            <p className="font-body text-sm text-muted-foreground">{reviews.length} reviews tracked</p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="font-body"><Plus className="w-4 h-4 mr-1" /> Add Review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Review</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="font-body">Customer Name</Label><Input value={newReview.customer_name} onChange={(e) => setNewReview({ ...newReview, customer_name: e.target.value })} /></div>
                <div><Label className="font-body">Date</Label><Input type="date" value={newReview.review_date} onChange={(e) => setNewReview({ ...newReview, review_date: e.target.value })} /></div>
                <div>
                  <Label className="font-body">Source</Label>
                  <select value={newReview.review_source} onChange={(e) => setNewReview({ ...newReview, review_source: e.target.value })} className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="yelp">Yelp</option>
                    <option value="nextdoor">Nextdoor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label className="font-body">Employee Credited</Label>
                  <select value={newReview.employee_name} onChange={(e) => setNewReview({ ...newReview, employee_name: e.target.value })} className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
                    <option value="">Select employee...</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                  </select>
                </div>
                <div><Label className="font-body">Rating</Label><Input type="number" min={1} max={5} value={newReview.rating} onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })} /></div>
                <div><Label className="font-body">Review Text</Label><Input value={newReview.review_text} onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })} /></div>
                <Button onClick={addReview} className="w-full font-body">Add Review</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-body" />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
            <option value="all">All Sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">Loading...</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-body">Customer</TableHead>
                  <TableHead className="font-body">Date</TableHead>
                  <TableHead className="font-body hidden md:table-cell">Source</TableHead>
                  <TableHead className="font-body hidden md:table-cell">Employee</TableHead>
                  <TableHead className="font-body">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground font-body py-8">No reviews yet.</TableCell></TableRow>
                ) : filtered.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-body font-medium">{review.customer_name}</TableCell>
                    <TableCell className="font-body text-sm">{review.review_date ? format(new Date(review.review_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell capitalize">{review.review_source || "—"}</TableCell>
                    <TableCell className="font-body text-sm hidden md:table-cell">{review.employee_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating || 0 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
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
