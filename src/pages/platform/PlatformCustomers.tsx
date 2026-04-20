import { useEffect, useMemo, useState } from "react";
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
  Search, Phone, Mail, Home, User, MapPin, Plus,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import PropertyNotesForm from "@/components/platform/customers/PropertyNotesForm";
import RecurringContractForm from "@/components/platform/customers/RecurringContractForm";
import { toast } from "@/hooks/use-toast";

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
};

export default function PlatformCustomers() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const [customers, setCustomers] = useState<UnifiedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    const [jobberRes, platformRes] = await Promise.all([
      supabase.from("jobber_clients")
        .select("id, jobber_id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at, synced_at")
        .order("display_name", { ascending: true }),
      supabase.from("platform_customers")
        .select("id, business_id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at")
        .order("display_name", { ascending: true }),
    ]);
    const jobberCustomers: UnifiedCustomer[] = (jobberRes.data || []).map((c: any) => ({ ...c, source: "jobber" as const }));
    const platformCustomers: UnifiedCustomer[] = (platformRes.data || []).map((c: any) => ({ ...c, source: "platform" as const }));
    setCustomers([...platformCustomers, ...jobberCustomers]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [selectedBusinessId]);

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
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selectedCustomer && <CustomerDetail customer={selectedCustomer} />}
        </SheetContent>
      </Sheet>

      {/* New customer drawer */}
      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <CreateCustomerForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onCreated={() => { setShowCreateForm(false); fetchCustomers(); }}
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
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create Customer"}
        </Button>
      </form>
    </>
  );
}

function CustomerDetail({ customer }: { customer: UnifiedCustomer }) {
  const { selectedBusinessId } = usePlatformAuth();
  const [properties, setProperties] = useState<JobberProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      if (customer.source === "jobber") {
        const { data } = await supabase
          .from("jobber_properties")
          .select("id, street1, street2, city, state, zip, country")
          .eq("client_id", customer.id)
          .order("created_at", { ascending: false });
        setProperties((data as JobberProperty[]) || []);
      } else {
        const { data } = await supabase
          .from("platform_properties")
          .select("id, address_1, address_2, city, state, zip, country")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false });
        setProperties(((data || []) as any[]).map(p => ({
          id: p.id, street1: p.address_1, street2: p.address_2,
          city: p.city, state: p.state, zip: p.zip, country: p.country,
        })));
      }
      setLoading(false);
    };
    fetchProperties();
  }, [customer.id, customer.source]);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display flex items-center gap-2 flex-wrap">
          {customer.display_name}
          {customer.source === "jobber" ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Jobber</span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Manual</span>
          )}
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
          {customer.phone && <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {customer.phone}</p>}
          {customer.secondary_phone && <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {customer.secondary_phone}</p>}
          {customer.email && <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {customer.email}</p>}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties ({properties.length})</h3>
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties yet</p>
          ) : (
            <div className="space-y-2">
              {properties.map((p) => (
                <div key={p.id} className="bg-secondary/40 border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{p.street1 || "No street"}</p>
                      {(p.city || p.state || p.zip) && <p className="text-xs text-muted-foreground">{[p.city, p.state, p.zip].filter(Boolean).join(", ")}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
          {customer.jobber_id && <p className="text-xs text-muted-foreground">Jobber ID: {customer.jobber_id}</p>}
          <p className="text-xs text-muted-foreground">Created {format(new Date(customer.created_at), "MMM d, yyyy")}</p>
        </div>

        {selectedBusinessId && customer.source === "jobber" && (
          <>
            <PropertyNotesForm customerId={customer.id} businessId={selectedBusinessId} />
            <RecurringContractForm customerId={customer.id} businessId={selectedBusinessId} />
          </>
        )}
      </div>
    </>
  );
}
