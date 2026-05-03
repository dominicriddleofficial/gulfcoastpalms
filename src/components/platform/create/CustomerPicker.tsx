import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Check } from "lucide-react";

export interface CustomerLite {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
}

interface Props {
  businessId: string | null;
  value: CustomerLite | null;
  onChange: (c: CustomerLite | null) => void;
  onCreateNew: () => void;
}

export default function CustomerPicker({ businessId, value, onChange, onCreateNew }: Props) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<CustomerLite[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!businessId || !open) return;
    const t = setTimeout(async () => {
      let q = supabase
        .from("platform_customers")
        .select("id, display_name, phone, email")
        .eq("business_id", businessId)
        .order("display_name")
        .limit(20);
      if (query.trim()) {
        q = q.or(`display_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
      }
      const { data } = await q;
      setList((data as CustomerLite[]) || []);
    }, 150);
    return () => clearTimeout(t);
  }, [query, businessId, open]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-card">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{value.display_name}</p>
          <p className="text-xs text-muted-foreground truncate">{value.phone || value.email || "—"}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Change</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          autoFocus={false}
          placeholder="Search customers..."
          className="pl-9"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="rounded-md border border-border bg-card max-h-56 overflow-y-auto divide-y divide-border">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-muted-foreground opacity-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{c.display_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.phone || c.email || "—"}</p>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">No matches.</p>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="w-full text-left px-3 py-2 flex items-center gap-2 text-primary hover:bg-secondary/60 border-t border-border"
          >
            <UserPlus className="w-4 h-4" /> <span className="text-sm">New customer</span>
          </button>
        </div>
      )}
    </div>
  );
}