import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Phone, MessageSquare, Mail, Copy, MapPin, Navigation, Pencil, CheckCircle2, AlertTriangle,
  CalendarClock, History, Building2, Ban, KeyRound, Home, ChevronRight,
} from "lucide-react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import EditAddressDialog from "@/components/platform/EditAddressDialog";
import PropertyNotesForm from "@/components/platform/customers/PropertyNotesForm";
import RecurringContractForm from "@/components/platform/customers/RecurringContractForm";
import { useCustomerProfile, customerProfileKey, type ProfileProperty } from "@/hooks/useCustomerProfile";
import {
  parsePhone, mailtoHref, addressLines, fullAddress, appleMapsDirectionsUrl, copyText,
  summarize, summarizeByProperty, lastServiceText, usablePreference, formatBooking, DEFAULT_BUSINESS_TZ,
  type ServiceEvent, type ServiceSummary,
} from "@/lib/customers/customerDetail";
import { recordPath } from "@/lib/search/universalSearch";

export type DetailCustomer = {
  id: string;
  source: "jobber" | "platform";
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  jobber_id?: string;
  created_at: string;
};

const actionCls =
  "inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg border border-border bg-secondary/60 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const primaryActionCls =
  "inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

async function copyWithToast(text: string, what: string) {
  const ok = await copyText(text);
  toast(ok
    ? { title: `${what} copied` }
    : { title: `Couldn't copy ${what.toLowerCase()}`, description: "Press and hold the text to copy it instead.", variant: "destructive" });
}

function Section({ title, icon, children, aside }: { title: string; icon: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}{title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const TzContext = createContext<string>(DEFAULT_BUSINESS_TZ);

const fmtDate = (d: string | null) => {
  if (!d) return "Date not recorded";
  const dt = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return Number.isNaN(dt.getTime()) ? "—" : format(dt, "MMM d, yyyy");
};

function PhoneRow({ label, value, blocked }: { label: string; value: string; blocked: boolean }) {
  const p = parsePhone(value);
  if (!p) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-base font-medium text-foreground break-words">{p.display}</p>
        {!p.telHref && <p className="text-xs text-amber-500 mt-0.5">This number doesn't look complete, so calling and texting are off.</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {p.telHref && !blocked
          ? <a href={p.telHref} className={primaryActionCls} aria-label={`Call ${p.display}`}><Phone className="w-4 h-4" />Call</a>
          : <span className={`${actionCls} opacity-50`} aria-disabled="true"><Phone className="w-4 h-4" />Call</span>}
        {p.smsHref && !blocked
          ? <a href={p.smsHref} className={actionCls} aria-label={`Text ${p.display}`}><MessageSquare className="w-4 h-4" />Text</a>
          : <span className={`${actionCls} opacity-50`} aria-disabled="true"><MessageSquare className="w-4 h-4" />Text</span>}
        <button type="button" className={actionCls} onClick={() => copyWithToast(p.raw, "Phone number")} aria-label={`Copy ${p.display}`}>
          <Copy className="w-4 h-4" />Copy
        </button>
      </div>
    </div>
  );
}

function EmailRow({ email, blocked }: { email: string; blocked: boolean }) {
  const href = mailtoHref(email);
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</p>
        <p className="text-base font-medium text-foreground break-all">{email}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {href && !blocked
          ? <a href={href} className={actionCls}><Mail className="w-4 h-4" />Email</a>
          : <span className={`${actionCls} opacity-50`} aria-disabled="true"><Mail className="w-4 h-4" />Email</span>}
        <button type="button" className={actionCls} onClick={() => copyWithToast(email, "Email")}><Copy className="w-4 h-4" />Copy</button>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<ServiceEvent["status"], string> = {
  completed: "Completed", scheduled: "Scheduled", in_progress: "In progress", overdue: "Past due, not marked done",
};
const STATUS_CLS: Record<ServiceEvent["status"], string> = {
  completed: "text-primary", scheduled: "text-foreground", in_progress: "text-foreground", overdue: "text-amber-500",
};

function HistoryList({ events }: { events: ServiceEvent[] }) {
  const tz = useContext(TzContext);
  if (!events.length) return null;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {events.map((e) => (
        <li key={e.key}>
          <Link to={recordPath("job", e.jobId, e.jobSource)} className="flex items-center gap-3 px-3 min-h-11 py-2 hover:bg-secondary/60">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{e.label}</p>
              <p className={`text-xs ${STATUS_CLS[e.status]}`}>
                {STATUS_LABEL[e.status]} · {e.status === "completed" ? fmtDate(e.date) : formatBooking(e, tz)}{e.status === "completed" && e.dateKind === "scheduled" ? " (planned date)" : ""}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-2.5 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[13px] sm:text-sm font-semibold leading-snug text-foreground hyphens-none [overflow-wrap:break-word]">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground break-words">{sub}</p>}
    </div>
  );
}

function ServiceStats({ s, status, extra }: { s: ServiceSummary | null; status: "loading" | "error" | "ok"; extra?: ReactNode }) {
  const v = (x: string) => (status === "ok" ? x : status === "loading" ? "…" : "Unavailable");
  const tz = useContext(TzContext);
  const last = status === "ok" && s ? lastServiceText(s, fmtDate) : null;
  return (
    <>
      {extra}
      <Stat label="Completed visits" value={v(String(s?.completed ?? 0))} />
      <Stat label="Last service" value={last ? last.value : v("")} sub={last?.sub} />
      <Stat label="Next visit" value={v(s?.nextScheduled ? formatBooking(s.nextScheduled, tz) : "Not booked")} />
    </>
  );
}

function SummaryStats({ s, status }: { s: ServiceSummary | null; status: "loading" | "error" | "ok" }) {
  return <div className="grid grid-cols-3 gap-2"><ServiceStats s={s} status={status} /></div>;
}

function PropertyCard({
  p, index, focused, summary, historyStatus, canEdit, onEdit,
}: {
  p: ProfileProperty; index: number; focused: boolean; summary: ServiceSummary | null;
  historyStatus: "loading" | "error" | "ok"; canEdit: boolean; onEdit: () => void;
}) {
  const { line1, line2 } = addressLines(p);
  const full = fullAddress(p);
  const maps = appleMapsDirectionsUrl(p);
  return (
    <article
      id={`property-${p.id}`}
      data-focused={focused || undefined}
      ref={focused ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
      className={`rounded-xl border bg-card p-4 space-y-3 ${focused ? "border-primary ring-1 ring-primary" : "border-border"}`}
    >
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.label || `Property ${index + 1}`}</p>
          <p className="text-base font-medium text-foreground break-words">{line1 || "Street address missing"}</p>
          {line2 && <p className="text-sm text-muted-foreground break-words">{line2}</p>}
          {p.verified
            ? <p className="text-xs text-primary flex items-center gap-1 mt-1"><CheckCircle2 className="w-3.5 h-3.5" />Address verified</p>
            : <p className="text-xs text-amber-500 flex items-center gap-1 mt-1"><AlertTriangle className="w-3.5 h-3.5" />Address not verified</p>}
        </div>
        {canEdit && (
          <Button size="sm" variant="ghost" className="min-h-11 px-3 shrink-0" onClick={onEdit} aria-label="Edit address">
            <Pencil className="w-4 h-4 mr-1" />Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {maps
          ? <a href={maps} target="_blank" rel="noopener noreferrer" className={primaryActionCls}><Navigation className="w-4 h-4" />Directions</a>
          : <span className={`${actionCls} opacity-50`} aria-disabled="true" title="Needs a street address"><Navigation className="w-4 h-4" />No route</span>}
        <button type="button" className={actionCls} disabled={!full} onClick={() => full && copyWithToast(full, "Address")}>
          <Copy className="w-4 h-4" />Copy address
        </button>
      </div>
      {maps && <p className="text-[11px] text-muted-foreground">Opens Apple Maps with driving directions from where you are — tap Go to start.</p>}

      {(p.gateCode || p.accessNotes) && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1 text-sm">
          {p.gateCode && <p className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-muted-foreground" />Gate code: <span className="font-medium break-all">{p.gateCode}</span></p>}
          {p.accessNotes && <p className="text-muted-foreground whitespace-pre-wrap break-words">{p.accessNotes}</p>}
        </div>
      )}

      <SummaryStats s={summary} status={historyStatus} />
      {historyStatus === "ok" && summary && summary.recent.length > 0 && <HistoryList events={summary.recent} />}
    </article>
  );
}

function PaymentPreference({ customerId, businessId, canEdit }: { customerId: string; businessId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const key = ["customer-prefers-check", businessId, customerId] as const;
  const q = useQuery({
    queryKey: key,
    placeholderData: undefined,
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_customers").select("prefers_check")
        .eq("id", customerId).eq("business_id", businessId).maybeSingle();
      if (error) throw error;
      return !!data?.prefers_check;
    },
  });
  const [saving, setSaving] = useState(false);
  const toggle = async (value: boolean) => {
    setSaving(true);
    qc.setQueryData(key, value);
    const { data, error } = await supabase.from("platform_customers").update({ prefers_check: value })
      .eq("id", customerId).eq("business_id", businessId).select("prefers_check").maybeSingle();
    setSaving(false);
    if (error || !data) {
      qc.setQueryData(key, !value);
      toast({ title: "Could not update payment preference", description: error?.message ?? "You may not have permission.", variant: "destructive" });
    }
  };
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="text-sm">
        <p className="font-medium text-foreground">Prefers to pay by check</p>
        <p className="text-xs text-muted-foreground">
          {q.isError ? "Couldn't load this setting." : "New invoices default to check payment."}
        </p>
      </div>
      <Switch
        checked={!!q.data}
        disabled={!canEdit || q.isLoading || q.isError || saving}
        onCheckedChange={toggle}
        aria-label="Prefers check payment"
        className="mt-1"
      />
    </div>
  );
}

export default function CustomerDetailPanel({
  customer, businessId, focusPropertyId = null,
}: { customer: DetailCustomer; businessId: string; focusPropertyId?: string | null }) {
  const qc = useQueryClient();
  const { isStaff } = useUserRole();
  const profile = useCustomerProfile(customer.source, customer.id, businessId);
  const [editing, setEditing] = useState<ProfileProperty | null>(null);
  useEffect(() => setEditing(null), [customer.id, businessId]);

  const historyStatus: "loading" | "error" | "ok" = profile.isLoading ? "loading" : profile.isError ? "error" : "ok";
  const events = useMemo(() => profile.data?.events ?? [], [profile.data]);
  const overall = useMemo(() => (profile.data ? summarize(events) : null), [profile.data, events]);
  const byProperty = useMemo(() => summarizeByProperty(events), [events]);
  const properties = profile.data?.properties ?? [];
  const knownIds = new Set(properties.map((p) => p.id));
  const unlinked = events.filter((e) => !e.propertyId || !knownIds.has(e.propertyId));
  const unlinkedSummary = unlinked.length ? summarize(unlinked) : null;

  // Contact actions stay off until we know the customer's contact restrictions.
  const contactState: "loading" | "error" | "ambiguous" | "blocked" | "ok" =
    profile.isLoading ? "loading" : profile.isError || !profile.data ? "error"
      : profile.data.linkAmbiguous ? "ambiguous" : profile.data.prefs?.doNotContact ? "blocked" : "ok";
  const blocked = contactState !== "ok";
  const preferred = contactState === "ok" ? usablePreference(profile.data?.prefs?.preferredMethod, customer) : null;
  const hasContact = !!(customer.phone || customer.secondary_phone || customer.email);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6" data-testid="customer-detail-scroll">
      <SheetHeader className="text-left space-y-2 pr-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${customer.source === "jobber" ? "border-border bg-secondary text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary"}`}>
            {customer.source === "jobber" ? "Synced from Jobber" : "Added in app"}
          </span>
          <span className="text-xs text-muted-foreground">{customer.source === "jobber" ? "Imported from Jobber" : "Added to the app"} {fmtDate(customer.created_at)}</span>
        </div>
        <SheetTitle className="font-display text-2xl leading-tight break-words">{customer.display_name}</SheetTitle>
        {customer.company_name && customer.company_name !== customer.display_name && (
          <SheetDescription className="flex items-center gap-1.5 text-sm break-words"><Building2 className="w-4 h-4 shrink-0" />{customer.company_name}</SheetDescription>
        )}
      </SheetHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ServiceStats
          s={overall}
          status={historyStatus}
          extra={<Stat label="Properties" value={profile.isLoading ? "…" : profile.isError ? "Unavailable" : String(properties.length)} />}
        />
      </div>
      {profile.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-center justify-between gap-3">
          <span>Couldn't load properties and service history.</span>
          <Button size="sm" variant="outline" className="min-h-11" onClick={() => qc.invalidateQueries({ queryKey: customerProfileKey(businessId, customer.source, customer.id) })}>Retry</Button>
        </div>
      )}

      <Section title="Contact" icon={<Phone className="w-3.5 h-3.5" />}
        aside={preferred ? <span className="text-xs text-muted-foreground">{preferred}</span> : undefined}>
        {contactState === "loading" && hasContact && <p className="text-xs text-muted-foreground">Checking contact preferences… Call, text and email turn on in a moment.</p>}
        {(contactState === "error" || contactState === "ambiguous") && hasContact && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <span>{contactState === "error"
              ? "Couldn't check whether this customer can be contacted, so call, text and email are off. Use Retry above."
              : "This customer matches more than one record, so call, text and email are off until that's sorted out."} Copy still works.</span>
          </div>
        )}
        {contactState === "blocked" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
            <Ban className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <span>Marked <strong>do not contact</strong>. Call, text and email buttons are turned off.</span>
          </div>
        )}
        {!hasContact && <p className="text-sm text-muted-foreground">No phone number or email on file.</p>}
        <div className="grid gap-2 lg:grid-cols-2">
          {customer.phone && <PhoneRow label="Primary phone" value={customer.phone} blocked={blocked} />}
          {customer.secondary_phone && <PhoneRow label="Secondary phone" value={customer.secondary_phone} blocked={blocked} />}
          {customer.email && <EmailRow email={customer.email} blocked={blocked} />}
        </div>
      </Section>

      <Section title={`Properties${profile.data ? ` (${properties.length})` : ""}`} icon={<Home className="w-3.5 h-3.5" />}>
        {profile.isLoading
          ? <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-40 rounded-xl border border-border bg-card animate-pulse" />)}</div>
          : profile.data && properties.length === 0
            ? <p className="text-sm text-muted-foreground">No properties on file for this customer.</p>
            : (
              <div className="space-y-3">
                {properties.map((p, i) => (
                  <PropertyCard
                    key={p.id} p={p} index={i} focused={p.id === focusPropertyId}
                    summary={profile.data ? byProperty.get(p.id) ?? summarize([]) : null}
                    historyStatus={historyStatus} canEdit={isStaff} onEdit={() => setEditing(p)}
                  />
                ))}
              </div>
            )}
      </Section>

      {unlinkedSummary && (
        <Section title="Jobs without a property" icon={<History className="w-3.5 h-3.5" />}>
          <p className="text-xs text-muted-foreground">These jobs aren't tied to one of the addresses above.</p>
          <SummaryStats s={unlinkedSummary} status="ok" />
          <HistoryList events={unlinkedSummary.recent} />
        </Section>
      )}

      {historyStatus === "ok" && (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 shrink-0 mt-px" />
          Counts include only visits marked done in our records. Canceled and deleted jobs are left out; visits past their date but never marked done are shown as past due.
        </p>
      )}

      {customer.source === "platform" && (
        <Section title="Billing" icon={<Building2 className="w-3.5 h-3.5" />}>
          <PaymentPreference customerId={customer.id} businessId={businessId} canEdit={isStaff} />
        </Section>
      )}

      {customer.source === "jobber" && (
        <>
          <Section title="Crew notes for this customer" icon={<KeyRound className="w-3.5 h-3.5" />}>
            <p className="text-xs text-muted-foreground -mt-1">Shared across all of this customer's properties.</p>
            <div className="rounded-xl border border-border bg-card p-4">
              <PropertyNotesForm customerId={customer.id} businessId={businessId} />
            </div>
          </Section>
          <div className="rounded-xl border border-border bg-card p-4">
            <RecurringContractForm customerId={customer.id} businessId={businessId} />
          </div>
        </>
      )}

      {customer.jobber_id && <p className="text-[11px] text-muted-foreground">Jobber reference {customer.jobber_id}</p>}

      {editing && (
        <EditAddressDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          target={editing.kind}
          propertyId={editing.id}
          businessId={businessId}
          customerId={editing.kind === "platform_property" ? editing.ownerCustomerId : null}
          initial={{ address_1: editing.street1 || "", city: editing.city, state: editing.state, zip: editing.zip, verified: editing.verified }}
          onSaved={() => qc.invalidateQueries({ queryKey: customerProfileKey(businessId, customer.source, customer.id) })}
        />
      )}
    </div>
  );
}
