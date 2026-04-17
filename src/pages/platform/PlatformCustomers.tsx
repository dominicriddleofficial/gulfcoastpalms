import { useEffect, useMemo, useState, useCallback } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Phone,
  Mail,
  Home,
  User,
  MapPin,
  Plus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import PropertyNotesForm from "@/components/platform/customers/PropertyNotesForm";
import RecurringContractForm from "@/components/platform/customers/RecurringContractForm";
import { toast } from "@/hooks/use-toast";

type UnifiedCustomer = {
  id: string;
  source: "jobber" | "platform";
  jobber_id?: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  created_at: string;
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
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);

    // Pull both Jobber-synced + manually-added customers in parallel
    const [{ data: jobberData }, { data: platformData }] = await Promise.all([
      supabase
        .from("jobber_clients")
        .select("id, jobber_id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at")
        .order("display_name", { ascending: true }),
      (() => {
        let q = supabase
          .from("platform_customers")
          .select("id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at, business_id")
          .order("display_name", { ascending: true });
        if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
        return q;
      })(),
    ]);

    const jobber: UnifiedCustomer[] = (jobberData || []).map((c: any) => ({
      id: c.id,
      source: "jobber",
      jobber_id: c.jobber_id,
      display_name: c.display_name,
      first_name: c.first_name,
      last_name: c.last_name,
      company_name: c.company_name,
      email: c.email,
      phone: c.phone,
      secondary_phone: c.secondary_phone,
      created_at: c.created_at,
    }));

    const platform: UnifiedCustomer[] = (platformData || []).map((c: any) => ({
      id: c.id,
      source: "platform",
      display_name: c.display_name,
      first_name: c.first_name,
      last_name: c.last_name,
      company_name: c.company_name,
      email: c.email,
      phone: c.phone,
      secondary_phone: c.secondary_phone,
      created_at: c.created_at,
    }));

    // Merge & sort alphabetically
    const merged = [...platform, ...jobber].sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );

    setCustomers(merged);
    setLoading(false);
  }, [selectedBusinessId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      [customer.display_name, customer.phone, customer.email, customer.company_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [customers, searchQuery]);

  const selectedBiz = businesses.find((business) => business.id === selectedBusinessId);

  const jobberCount = customers.filter((c) => c.source === "jobber").length;
  const platformCount = customers.filter((c) => c.source === "platform").length;

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
              {selectedBiz && <InlineBadge shortcode={selectedBiz.shortcode} color={selectedBiz.default_business_color} />}
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {customers.length} total · {jobberCount} from Jobber · {platformCount} added on platform
            </p>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            disabled={!selectedBusinessId}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10 bg-card border-border h-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="font-body text-muted-foreground">No customers found</p>
            <p className="font-body text-xs text-muted-foreground/70 mt-1">
              Click "New Customer" above to add your first one.
            </p>
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
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-body text-sm font-medium text-foreground truncate">{customer.display_name}</span>
                      {customer.source === "jobber" ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-bold tracking-tight bg-primary/10 text-primary border border-primary/20">
                          Jobber
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-bold tracking-tight bg-accent/30 text-foreground border border-border">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
                      {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                      {customer.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{customer.email}</span>}
                      {customer.company_name && <span>{customer.company_name}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Customer form */}
      <Sheet open={showNewForm} onOpenChange={setShowNewForm}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          <NewCustomerForm
            businessId={selectedBusinessId}
            onCreated={() => {
              setShowNewForm(false);
              fetchCustomers();
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Detail */}
      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && <CustomerDetail customer={selectedCustomer} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function NewCustomerForm({ businessId, onCreated }: { businessId: string | null; onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!businessId) {
      toast({ title: "No business selected", description: "Pick a business first." });
      return;
    }
    const display = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || companyName.trim();
    if (!display) {
      toast({ title: "Name required", description: "Enter a first/last name or company name." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("platform_customers").insert({
      business_id: businessId,
      display_name: display,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      company_name: companyName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      internal_notes: notes.trim() || null,
      source: "manual_entry",
      customer_status: "active",
    });
    setSaving(false);

    if (error) {
      toast({ title: "Could not create customer", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Customer added", description: `${display} is now in your customer list.` });
    onCreated();
  };

  return (
    <div className="space-y-5 pt-2">
      <SheetHeader>
        <SheetTitle className="font-display text-lg text-foreground">Add New Customer</SheetTitle>
        <p className="text-xs text-muted-foreground font-body">
          Manually create a customer record on this business. They'll show up alongside Jobber-synced customers.
        </p>
      </SheetHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">First name</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Last name</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="bg-secondary border-border" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Company (optional)</Label>
        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme HOA" className="bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(850) 555-0123" className="bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" className="bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Internal notes</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any context for the team…"
          className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : "Create Customer"}
      </Button>
    </div>
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
          .select("id, address_1, address_2, city, state, zip")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false });
        setProperties(
          ((data as any[]) || []).map((p) => ({
            id: p.id,
            street1: p.address_1,
            street2: p.address_2,
            city: p.city,
            state: p.state,
            zip: p.zip,
            country: null,
          }))
        );
      }
      setLoading(false);
    };

    fetchProperties();
  }, [customer.id, customer.source]);

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <SheetTitle className="font-display text-lg text-foreground">{customer.display_name}</SheetTitle>
          {customer.source === "jobber" ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-bold tracking-tight bg-primary/10 text-primary border border-primary/20">
              Jobber
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-bold tracking-tight bg-accent/30 text-foreground border border-border">
              Manual
            </span>
          )}
        </div>
      </SheetHeader>

      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-primary font-body hover:underline">
            <Phone className="w-4 h-4" /> {customer.phone}
          </a>
        )}
        {customer.secondary_phone && (
          <p className="flex items-center gap-2 text-sm text-foreground font-body">
            <Phone className="w-4 h-4 text-muted-foreground" /> {customer.secondary_phone}
          </p>
        )}
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary font-body hover:underline">
            <Mail className="w-4 h-4" /> {customer.email}
          </a>
        )}
      </div>

      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Properties ({properties.length})</p>
        {loading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : properties.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground/60">No properties yet</p>
        ) : (
          <div className="space-y-2">
            {properties.map((property) => (
              <div key={property.id} className="bg-secondary rounded-lg p-3 space-y-1">
                <div className="flex items-start gap-2">
                  <Home className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-body text-sm text-foreground">{property.street1 || "No street"}</p>
                    {(property.city || property.state || property.zip) && (
                      <p className="font-body text-xs text-muted-foreground">
                        {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {property.country && <p className="font-body text-[10px] text-muted-foreground mt-1">{property.country}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {customer.source === "jobber" && customer.jobber_id && (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Sync Details
          </p>
          <p className="font-body text-xs text-muted-foreground/70">Jobber ID: {customer.jobber_id}</p>
          <p className="font-body text-xs text-muted-foreground/70">First synced {format(new Date(customer.created_at), "MMM d, yyyy")}</p>
        </div>
      )}

      {/* Property Notes */}
      {selectedBusinessId && (
        <PropertyNotesForm customerId={customer.id} businessId={selectedBusinessId} />
      )}

      {/* Recurring Contracts */}
      {selectedBusinessId && (
        <RecurringContractForm customerId={customer.id} businessId={selectedBusinessId} />
      )}
    </div>
  );
}
