import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { usePlatformCustomers, usePlatformProperties } from "@/hooks/usePlatformCustomers";
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
  Search, Plus, Phone, Mail, MapPin, Star, Shield, Calendar,
  Home, FileText, Briefcase, CreditCard, User,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformCustomer } from "@/hooks/usePlatformCustomers";

export default function PlatformCustomers() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const { customers, loading, searchQuery, setSearchQuery, refetch } = usePlatformCustomers(selectedBusinessId);
  const [selectedCustomer, setSelectedCustomer] = useState<PlatformCustomer | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
            <p className="font-body text-sm text-muted-foreground">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border h-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="font-body text-muted-foreground">No customers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map(cust => {
              const biz = getBiz(cust.business_id);
              return (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-body text-sm font-medium text-foreground truncate">{cust.display_name}</span>
                        {cust.vip_flag && <Star className="w-3.5 h-3.5 text-yellow-500" />}
                        {biz && <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
                        {cust.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cust.phone}</span>}
                        {cust.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{cust.email}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-body font-medium",
                        cust.customer_status === "active" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        {cust.customer_status}
                      </span>
                      {cust.do_not_contact_flag && <Shield className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Detail */}
      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && (
            <CustomerDetail customer={selectedCustomer} biz={getBiz(selectedCustomer.business_id)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Customer */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          <CreateCustomerForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onCreated={() => { setShowCreate(false); refetch(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function CustomerDetail({ customer, biz }: { customer: PlatformCustomer; biz: any }) {
  const { properties, loading: propsLoading } = usePlatformProperties(customer.business_id, customer.id);

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-2">
          {biz && <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />}
          <SheetTitle className="font-display text-lg text-foreground">{customer.display_name}</SheetTitle>
          {customer.vip_flag && <Star className="w-4 h-4 text-yellow-500" />}
        </div>
      </SheetHeader>

      {/* Contact */}
      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-primary font-body hover:underline">
            <Phone className="w-4 h-4" /> {customer.phone}
          </a>
        )}
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary font-body hover:underline">
            <Mail className="w-4 h-4" /> {customer.email}
          </a>
        )}
        {customer.company_name && (
          <p className="flex items-center gap-2 text-sm text-foreground font-body">
            <Briefcase className="w-4 h-4 text-muted-foreground" /> {customer.company_name}
          </p>
        )}
      </div>

      {/* Properties */}
      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Properties ({properties.length})</p>
        {propsLoading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : properties.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground/60">No properties yet</p>
        ) : (
          <div className="space-y-2">
            {properties.map(p => (
              <div key={p.id} className="bg-secondary rounded-lg p-3 space-y-1">
                <div className="flex items-start gap-2">
                  <Home className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    {p.property_label && <p className="font-body text-xs text-primary">{p.property_label}</p>}
                    <p className="font-body text-sm text-foreground">{p.address_1}</p>
                    <p className="font-body text-xs text-muted-foreground">{p.city}, {p.state} {p.zip}</p>
                    {p.gate_code && <p className="font-body text-[10px] text-muted-foreground mt-1">Gate: {p.gate_code}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related records */}
      {[
        { icon: FileText, label: "Quotes" },
        { icon: Briefcase, label: "Jobs" },
        { icon: CreditCard, label: "Invoices" },
      ].map(section => (
        <div key={section.label} className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <section.icon className="w-3 h-3" /> {section.label}
          </p>
          <p className="font-body text-xs text-muted-foreground/50 italic">No {section.label.toLowerCase()} linked yet</p>
        </div>
      ))}

      {customer.internal_notes && (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Internal Notes</p>
          <p className="font-body text-sm text-foreground bg-secondary rounded-lg p-3">{customer.internal_notes}</p>
        </div>
      )}

      <div className="text-xs font-body text-muted-foreground/50">
        Created {format(new Date(customer.created_at), "MMM d, yyyy")}
      </div>
    </div>
  );
}

function CreateCustomerForm({ businesses, selectedBusinessId, onCreated }: {
  businesses: any[];
  selectedBusinessId: string | null;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [bizId, setBizId] = useState(selectedBusinessId || businesses[0]?.id || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  // Property
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || company || "Unknown";

    const { data: cust, error } = await supabase.from("platform_customers").insert({
      business_id: bizId,
      display_name: displayName,
      first_name: firstName || null,
      last_name: lastName || null,
      company_name: company || null,
      phone: phone || null,
      email: email || null,
      source: "manual",
    }).select().single();

    if (!error && cust && address) {
      await supabase.from("platform_properties").insert({
        business_id: bizId,
        customer_id: cust.id,
        address_1: address,
        city: city || "Pensacola",
        state: "FL",
        zip: zip || "32501",
      });
    }

    setSubmitting(false);
    onCreated();
  };

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <SheetTitle className="font-display text-lg text-foreground">New Customer</SheetTitle>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {businesses.length > 1 && (
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Business</label>
            <Select value={bizId} onValueChange={setBizId}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {businesses.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">First Name</label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Last Name</label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Company (optional)</label>
          <Input value={company} onChange={e => setCompany(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-secondary border-border" />
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Property (optional)</p>
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-body text-xs text-muted-foreground">City</label>
              <Input value={city} onChange={e => setCity(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <label className="font-body text-xs text-muted-foreground">ZIP</label>
              <Input value={zip} onChange={e => setZip(e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting || (!firstName && !lastName && !company)}>
          {submitting ? "Creating..." : "Create Customer"}
        </Button>
      </form>
    </div>
  );
}
