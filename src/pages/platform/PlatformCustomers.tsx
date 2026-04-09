import { useEffect, useMemo, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import PropertyNotesForm from "@/components/platform/customers/PropertyNotesForm";
import RecurringContractForm from "@/components/platform/customers/RecurringContractForm";

type JobberCustomer = {
  id: string;
  jobber_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  created_at: string;
  synced_at: string;
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
  const [customers, setCustomers] = useState<JobberCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<JobberCustomer | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("jobber_clients")
        .select("id, jobber_id, display_name, first_name, last_name, company_name, email, phone, secondary_phone, created_at, synced_at")
        .order("display_name", { ascending: true });
      setCustomers((data as JobberCustomer[]) || []);
      setLoading(false);
    };

    fetchCustomers();
  }, []);

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

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
              {selectedBiz && <InlineBadge shortcode={selectedBiz.shortcode} color={selectedBiz.default_business_color} />}
            </div>
            <p className="font-body text-sm text-muted-foreground">{customers.length} synced Jobber customers · read only</p>
          </div>
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
            <p className="font-body text-muted-foreground">No synced Jobber customers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-body text-sm font-medium text-foreground truncate">{customer.display_name}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-bold tracking-tight bg-primary/10 text-primary border border-primary/20">
                        Jobber
                      </span>
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

      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && <CustomerDetail customer={selectedCustomer} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function CustomerDetail({ customer }: { customer: JobberCustomer }) {
  const [properties, setProperties] = useState<JobberProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("jobber_properties")
        .select("id, street1, street2, city, state, zip, country")
        .eq("client_id", customer.id)
        .order("created_at", { ascending: false });
      setProperties((data as JobberProperty[]) || []);
      setLoading(false);
    };

    fetchProperties();
  }, [customer.id]);

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <SheetTitle className="font-display text-lg text-foreground">{customer.display_name}</SheetTitle>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-bold tracking-tight bg-primary/10 text-primary border border-primary/20">
            Jobber
          </span>
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
          <p className="font-body text-sm text-muted-foreground/60">No synced properties yet</p>
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

      <div className="space-y-2">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> Sync Details
        </p>
        <p className="font-body text-xs text-muted-foreground/70">Jobber ID: {customer.jobber_id}</p>
        <p className="font-body text-xs text-muted-foreground/70">First synced {format(new Date(customer.created_at), "MMM d, yyyy")}</p>
      </div>
    </div>
  );
}
