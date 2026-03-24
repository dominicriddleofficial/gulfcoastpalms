import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, RefreshCw, Bell, BellOff, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminRecurring() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("recurring_services").select("*").order("next_service_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  const toggleReminder = async (id: string, current: boolean) => {
    const { error } = await supabase.from("recurring_services").update({ reminder_needed: !current }).eq("id", id);
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, reminder_needed: !current } : i));
  };

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.customer_name?.toLowerCase().includes(q) || i.service_type?.toLowerCase().includes(q));
  }, [items, search]);

  const overdue = filtered.filter(i => i.next_service_date && new Date(i.next_service_date) < new Date());
  const upcoming = filtered.filter(i => i.next_service_date && new Date(i.next_service_date) >= new Date());
  const noDate = filtered.filter(i => !i.next_service_date);

  if (loading) return <AdminLayout><p className="text-center text-muted-foreground font-body py-12">Loading...</p></AdminLayout>;

  const renderItem = (item: any) => (
    <Card key={item.id} className={cn(item.next_service_date && new Date(item.next_service_date) < new Date() && "border-red-300")}>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-body font-semibold text-foreground truncate">{item.customer_name}</p>
          <p className="font-body text-xs text-muted-foreground">
            {item.service_type || "Palm Trimming"} · {item.service_interval || "6 months"}
            {item.is_repeat_customer && " · Repeat"}
          </p>
          <div className="flex gap-3 mt-1 font-body text-xs text-muted-foreground">
            {item.last_service_date && <span>Last: {format(new Date(item.last_service_date), "MMM d, yyyy")}</span>}
            {item.next_service_date && <span className={cn(new Date(item.next_service_date) < new Date() && "text-red-600 font-semibold")}>
              Next: {format(new Date(item.next_service_date), "MMM d, yyyy")}
            </span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.is_repeat_customer && <Badge className="bg-green-100 text-green-800 font-body text-[10px]">Repeat</Badge>}
          <Button variant="ghost" size="sm" onClick={() => toggleReminder(item.id, item.reminder_needed)}>
            {item.reminder_needed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Recurring</h1>
            <p className="font-body text-sm text-muted-foreground">{items.length} tracked services · {overdue.length} overdue</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-body" />
        </div>

        {overdue.length > 0 && (
          <div>
            <h2 className="font-body text-sm font-semibold text-red-600 mb-2">Overdue ({overdue.length})</h2>
            <div className="space-y-2">{overdue.map(renderItem)}</div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <h2 className="font-body text-sm font-semibold text-foreground mb-2">Upcoming ({upcoming.length})</h2>
            <div className="space-y-2">{upcoming.map(renderItem)}</div>
          </div>
        )}

        {noDate.length > 0 && (
          <div>
            <h2 className="font-body text-sm font-semibold text-muted-foreground mb-2">No Date Set ({noDate.length})</h2>
            <div className="space-y-2">{noDate.map(renderItem)}</div>
          </div>
        )}

        {filtered.length === 0 && <p className="text-center text-muted-foreground font-body py-12">No recurring services tracked yet. Import jobs or add them manually.</p>}
      </div>
    </AdminLayout>
  );
}
