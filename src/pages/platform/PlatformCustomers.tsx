import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Phone, Mail, Home, User, MapPin, Plus, Pencil, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import CustomerDetailPanel from "@/components/platform/customers/detail/CustomerDetailPanel";
import { toast } from "@/hooks/use-toast";
import EditAddressDialog from "@/components/platform/EditAddressDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { platformCustomersKey, fetchPlatformCustomersList } from "@/hooks/usePlatformCustomersList";
import { useRecordDeepLink, type DeepLinkTarget } from "@/hooks/useRecordDeepLink";
import DeepLinkNotice from "@/components/platform/DeepLinkNotice";

/** Load one customer by id + source, scoped to the business (RLS still applies). */
export async function fetchCustomerRecord(t: DeepLinkTarget, businessId: string): Promise<UnifiedCustomer | null> {
  if (t.source === "jobber") {
    const { data, error } = await supabase.from("jobber_clients")
      .select("id, jobber_id, display_name, company_name, email, phone, secondary_phone, created_at, business_id")
      .eq("id", t.id).eq("business_id", businessId).maybeSingle();
    if (error) throw error;
    return data ? { first_name: null, last_name: null, ...data, display_name: data.display_name ?? "Customer", source: "jobber" } : null;
  }
  const { data, error } = await supabase.from("platform_customers")
    .select("id, business_id, display_name, company_name, email, phone, secondary_phone, created_at")
    .eq("id", t.id).eq("business_id", businessId).maybeSingle();
  if (error) throw error;
  return data ? { first_name: null, last_name: null, ...data, source: "platform" } : null;
}

type UnifiedCustomer = {
  id: string;
  source: "jobber" | "platform";
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  jobber_id?: string;
  business_id?: string;
  created_at: string;
  synced_at?: string;
};

type JobberProperty = {
  id: string;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  address_verified?: boolean | null;
};

export default function PlatformCustomers() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const customersQuery = useQuery({
    queryKey: platformCustomersKey(selectedBusinessId),
    queryFn: () => fetchPlatformCustomersList(selectedBusinessId),
    enabled: !!selectedBusinessId,
  });
  const customers: UnifiedCustomer[] = (customersQuery.data ?? []) as UnifiedCustomer[];
  const loading = !!selectedBusinessId && customersQuery.isLoading;

  const [focusPropertyId, setFocusPropertyId] = useState<string | null>(null);
  const deepLink = useRecordDeepLink<UnifiedCustomer>({
    businessId: selectedBusinessId,
    listLoading: loading,
    findInList: (t) => customers.find((c) => c.id === t.id && c.source === t.source),
    fetchOne: fetchCustomerRecord,
    identify: (c) => ({ id: c.id, businessId: c.business_id, source: c.source }),
    onOpen: (c, t) => { setFocusPropertyId(t.propertyId); setSelectedCustomer(c); },
    onClear: () => setSelectedCustomer(null),
  });
  const closeCustomer = () => { setSelectedCustomer(null); setFocusPropertyId(null); deepLink.clear(); };

  const invalidateCustomers = () =>
    qc.invalidateQueries({ queryKey: platformCustomersKey(selectedBusinessId) });

  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      [customer.display_name, customer.phone, customer.email, customer.company_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [customers, searchQuery]);

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);
  const platformCount = customers.filter(c => c.source === "platform").length;
  const jobberCount = customers.filter(c => c.source === "jobber").length;

  return (
    <PlatformLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
              {selectedBiz && <InlineBadge shortcode={selectedBiz.shortcode} color={selectedBiz.default_business_color} />}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {platformCount} added · {jobberCount} synced from Jobber
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </div>

        <DeepLinkNotice status={deepLink.status} label="customer" onDismiss={deepLink.clear} />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border h-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-card/40 border border-border rounded-xl">
            <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No customers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={`${customer.source}-${customer.id}`}
                onClick={() => setSelectedCustomer(customer)}
                className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      <span className="font-display font-medium text-foreground truncate">{customer.display_name}</span>
                      {customer.source === "jobber" ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/40 text-accent-foreground border border-accent">
                          Jobber
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                      {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
                      {customer.company_name && <span className="flex items-center gap-1"><Home className="w-3 h-3" />{customer.company_name}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && closeCustomer()}>
        <SheetContent className="ops-theme w-full max-w-full sm:max-w-2xl bg-background text-foreground border-border overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          {selectedCustomer && selectedBusinessId && <CustomerDetailPanel key={`${selectedBusinessId}-${selectedCustomer.source}-${selectedCustomer.id}`} customer={selectedCustomer} businessId={selectedBusinessId} focusPropertyId={focusPropertyId} />}
        </SheetContent>
      </Sheet>

      {/* New customer drawer */}
      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <CreateCustomerForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
              onCreated={() => { setShowCreateForm(false); invalidateCustomers(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function CreateCustomerForm({ businesses, selectedBusinessId, onCreated }: {
  businesses: any[];
  selectedBusinessId: string | null;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [bizId, setBizId] = useState<string>(selectedBusinessId || businesses[0]?.id || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState("phone");
  const [prefersCheck, setPrefersCheck] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizId) { toast({ title: "Select a business first", variant: "destructive" }); return; }
    const displayName = company.trim() || [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!displayName) { toast({ title: "Name or company required", variant: "destructive" }); return; }

    setSubmitting(true);
    const { error } = await supabase.from("platform_customers").insert({
      business_id: bizId,
      display_name: displayName,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      company_name: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      preferred_contact_method: contactMethod,
      customer_status: "active",
      source: "manual",
      prefers_check: prefersCheck,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Customer created" });
    onCreated();
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">New Customer</SheetTitle>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        {businesses.length > 1 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Business</label>
            <Select value={bizId} onValueChange={setBizId}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Company (optional)</label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Preferred Contact</label>
          <Select value={contactMethod} onValueChange={setContactMethod}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefersCheck}
            onChange={(e) => setPrefersCheck(e.target.checked)}
            className="mt-1 accent-primary w-4 h-4"
          />
          <span className="text-xs text-muted-foreground leading-snug">
            Prefers check / invoice by mail-in
            <span className="block text-[10px] opacity-70">New invoices default to check payment.</span>
          </span>
        </label>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create Customer"}
        </Button>
      </form>
    </>
  );
}
