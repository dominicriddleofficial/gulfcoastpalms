import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, History, Wallet, Clock } from "lucide-react";
import { fmtUSD, downloadCSV, PAYROLL_PAYMENT_METHODS } from "@/lib/finance";

interface Member {
  id: string;
  full_name: string;
  role: string | null;
  pay_type: string;
  hourly_rate: number;
  flat_rate: number;
  classification: string;
  start_date: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
}

interface HoursRow {
  id: string;
  member_id: string;
  work_date: string;
  hours: number | null;
  flat_amount: number | null;
  notes: string | null;
  paid: boolean;
}

interface PaymentRow {
  id: string;
  member_id: string;
  pay_date: string;
  total_hours: number;
  rate_used: number;
  pay_type: string;
  total_amount: number;
  payment_method: string | null;
  notes: string | null;
}

export default function PayrollPanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [view, setView] = useState<"current" | "history">("current");
  const [members, setMembers] = useState<Member[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [m, h, p] = await Promise.all([
      supabase
        .from("finance_payroll_members")
        .select("*")
        .eq("business_id", businessId)
        .order("full_name"),
      supabase
        .from("finance_payroll_hours")
        .select("*")
        .eq("business_id", businessId)
        .eq("paid", false),
      supabase
        .from("finance_payroll_payments")
        .select("*")
        .eq("business_id", businessId)
        .order("pay_date", { ascending: false })
        .limit(200),
    ]);
    setMembers((m.data as Member[]) ?? []);
    setHours((h.data as HoursRow[]) ?? []);
    setPayments((p.data as PaymentRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const totals = useMemo(() => {
    const byMember = new Map<string, number>();
    for (const h of hours) {
      const m = members.find((x) => x.id === h.member_id);
      if (!m) continue;
      const amt =
        m.pay_type === "flat"
          ? Number(h.flat_amount ?? m.flat_rate ?? 0)
          : Number(h.hours ?? 0) * Number(m.hourly_rate ?? 0);
      byMember.set(h.member_id, (byMember.get(h.member_id) ?? 0) + amt);
    }
    const total = Array.from(byMember.values()).reduce((s, v) => s + v, 0);
    return { byMember, total };
  }, [hours, members]);

  const exportPayments = () => {
    const rows = payments.map((p) => {
      const m = members.find((x) => x.id === p.member_id);
      return {
        date: p.pay_date,
        team_member: m?.full_name ?? "",
        classification: m?.classification ?? "",
        hours: p.total_hours,
        rate: p.rate_used,
        total: p.total_amount,
        payment_method: p.payment_method ?? "",
        notes: p.notes ?? "",
      };
    });
    downloadCSV(`payroll-history-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-card/60">
          <button
            onClick={() => setView("current")}
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${
              view === "current" ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
          >
            Current Pay Period
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${
              view === "history" ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
          >
            Pay History
          </button>
        </div>
        <div className="flex gap-2">
          {view === "history" && (
            <Button size="sm" variant="outline" onClick={exportPayments}>
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add team member</DialogTitle>
              </DialogHeader>
              <AddMemberForm
                businessId={businessId}
                onSaved={() => {
                  setAddOpen(false);
                  void reload();
                  toast({ title: "Team member added" });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : view === "current" ? (
        <CurrentPeriodView
          businessId={businessId}
          members={members}
          hours={hours}
          totals={totals}
          onChange={reload}
        />
      ) : (
        <HistoryView members={members} payments={payments} />
      )}
    </div>
  );
}

function CurrentPeriodView({
  businessId,
  members,
  hours,
  totals,
  onChange,
}: {
  businessId: string;
  members: Member[];
  hours: HoursRow[];
  totals: { byMember: Map<string, number>; total: number };
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [hoursOpenFor, setHoursOpenFor] = useState<Member | null>(null);
  const [payOpenFor, setPayOpenFor] = useState<Member | null>(null);

  if (members.length === 0) {
    return (
      <Card className="p-6 text-center bg-card/60 border-border">
        <p className="text-sm text-muted-foreground">
          No team members yet. Add one to start tracking pay.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Total payroll this period
        </p>
        <p className="font-display text-2xl font-bold text-primary mt-0.5">
          {fmtUSD(totals.total)}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {members
          .filter((m) => m.active)
          .map((m) => {
            const myHours = hours.filter((h) => h.member_id === m.id);
            const totalHours = myHours.reduce((s, h) => s + Number(h.hours ?? 0), 0);
            const total = totals.byMember.get(m.id) ?? 0;
            return (
              <Card key={m.id} className="p-4 bg-card/70 border-border space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-foreground truncate">
                      {m.full_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {m.role ?? "—"} · {m.classification.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-1.5 py-0.5 rounded bg-secondary/60">
                    {m.pay_type}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Hours</p>
                    <p className="font-display text-sm font-semibold">{totalHours.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Rate</p>
                    <p className="font-display text-sm font-semibold">
                      {m.pay_type === "hourly" ? fmtUSD(m.hourly_rate) : fmtUSD(m.flat_rate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                    <p className="font-display text-sm font-bold text-primary">
                      {fmtUSD(total)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setHoursOpenFor(m)}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1" /> Add hours
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={total <= 0}
                    onClick={() => setPayOpenFor(m)}
                  >
                    <Wallet className="w-3.5 h-3.5 mr-1" /> Pay
                  </Button>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Add hours dialog */}
      <Dialog open={!!hoursOpenFor} onOpenChange={(o) => !o && setHoursOpenFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add hours — {hoursOpenFor?.full_name}</DialogTitle>
          </DialogHeader>
          {hoursOpenFor && (
            <AddHoursForm
              businessId={businessId}
              member={hoursOpenFor}
              onSaved={() => {
                setHoursOpenFor(null);
                onChange();
                toast({ title: "Hours logged" });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!payOpenFor} onOpenChange={(o) => !o && setPayOpenFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay — {payOpenFor?.full_name}</DialogTitle>
          </DialogHeader>
          {payOpenFor && (
            <PayMemberForm
              businessId={businessId}
              member={payOpenFor}
              total={totals.byMember.get(payOpenFor.id) ?? 0}
              hours={hours.filter((h) => h.member_id === payOpenFor.id)}
              onSaved={() => {
                setPayOpenFor(null);
                onChange();
                toast({ title: "Payment recorded" });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryView({
  members,
  payments,
}: {
  members: Member[];
  payments: PaymentRow[];
}) {
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const filtered = payments.filter((p) =>
    memberFilter === "all" ? true : p.member_id === memberFilter,
  );
  const total = filtered.reduce((s, p) => s + Number(p.total_amount), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          Total paid: <span className="text-foreground font-semibold">{fmtUSD(total)}</span>
        </span>
      </div>

      <Card className="bg-card/60 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Member</th>
                <th className="text-right px-3 py-2">Hours</th>
                <th className="text-right px-3 py-2">Rate</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Method</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const m = members.find((x) => x.id === p.member_id);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{p.pay_date}</td>
                    <td className="px-3 py-2">{m?.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{Number(p.total_hours).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">{fmtUSD(p.rate_used)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">
                      {fmtUSD(p.total_amount)}
                    </td>
                    <td className="px-3 py-2 capitalize">{p.payment_method ?? "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AddMemberForm({
  businessId,
  onSaved,
}: {
  businessId: string;
  onSaved: () => void;
}) {
  const [full_name, setName] = useState("");
  const [role, setRole] = useState("");
  const [pay_type, setPayType] = useState<"hourly" | "flat">("hourly");
  const [rate, setRate] = useState("");
  const [classification, setClassification] = useState<"w2" | "1099">("w2");
  const [start_date, setStartDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!full_name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("finance_payroll_members").insert({
      business_id: businessId,
      full_name: full_name.trim(),
      role: role || null,
      pay_type,
      classification,
      start_date: start_date || null,
      phone: phone || null,
      email: email || null,
      hourly_rate: pay_type === "hourly" ? Number(rate) || 0 : 0,
      flat_rate: pay_type === "flat" ? Number(rate) || 0 : 0,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <div className="space-y-3">
      <Field label="Name">
        <Input value={full_name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Role">
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Crew lead, etc." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pay type">
          <Select value={pay_type} onValueChange={(v) => setPayType(v as "hourly" | "flat")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="flat">Flat per job</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={pay_type === "hourly" ? "Hourly rate ($)" : "Flat rate ($)"}>
          <Input
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Classification">
          <Select value={classification} onValueChange={(v) => setClassification(v as "w2" | "1099")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="w2">W-2 Employee</SelectItem>
              <SelectItem value="1099">1099 Contractor</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Start date">
          <Input type="date" value={start_date} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <Button onClick={submit} disabled={saving || !full_name.trim()} className="w-full">
        {saving ? "Saving…" : "Add member"}
      </Button>
    </div>
  );
}

function AddHoursForm({
  businessId,
  member,
  onSaved,
}: {
  businessId: string;
  member: Member;
  onSaved: () => void;
}) {
  const [work_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hoursStr, setHours] = useState("");
  const [flatStr, setFlat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("finance_payroll_hours").insert({
      business_id: businessId,
      member_id: member.id,
      work_date,
      notes: notes || null,
      hours: member.pay_type === "hourly" ? Number(hoursStr) || 0 : null,
      flat_amount:
        member.pay_type === "flat"
          ? Number(flatStr) || Number(member.flat_rate) || 0
          : null,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <div className="space-y-3">
      <Field label="Date">
        <Input type="date" value={work_date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {member.pay_type === "flat" ? (
        <Field label="Flat amount ($)">
          <Input
            type="number"
            inputMode="decimal"
            value={flatStr}
            onChange={(e) => setFlat(e.target.value)}
            placeholder={String(member.flat_rate)}
          />
        </Field>
      ) : (
        <Field label="Hours">
          <Input
            type="number"
            inputMode="decimal"
            step="0.25"
            value={hoursStr}
            onChange={(e) => setHours(e.target.value)}
          />
        </Field>
      )}
      <Field label="Notes (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Navarre removal job"
        />
      </Field>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Log hours"}
      </Button>
    </div>
  );
}

function PayMemberForm({
  businessId,
  member,
  total,
  hours,
  onSaved,
}: {
  businessId: string;
  member: Member;
  total: number;
  hours: HoursRow[];
  onSaved: () => void;
}) {
  const [pay_date, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payment_method, setMethod] = useState<string>(PAYROLL_PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState("");
  const [amountStr, setAmount] = useState(total.toFixed(2));
  const [saving, setSaving] = useState(false);

  const totalHours = hours.reduce((s, h) => s + Number(h.hours ?? 0), 0);
  const dates = hours.map((h) => h.work_date).sort();
  const period_start = dates[0] ?? null;
  const period_end = dates[dates.length - 1] ?? null;

  const submit = async () => {
    setSaving(true);
    const finalAmount = Number(amountStr) || total;
    const { error: insErr } = await supabase.from("finance_payroll_payments").insert({
      business_id: businessId,
      member_id: member.id,
      pay_date,
      period_start,
      period_end,
      total_hours: totalHours,
      rate_used: member.pay_type === "hourly" ? member.hourly_rate : member.flat_rate,
      pay_type: member.pay_type,
      total_amount: finalAmount,
      payment_method,
      notes: notes || null,
    });
    if (!insErr && hours.length > 0) {
      const ids = hours.map((h) => h.id);
      await supabase
        .from("finance_payroll_hours")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .in("id", ids);
    }
    setSaving(false);
    if (!insErr) onSaved();
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-primary/5 border-primary/20 text-center">
        <p className="text-[11px] uppercase text-muted-foreground">Amount due</p>
        <p className="font-display text-2xl font-bold text-primary">{fmtUSD(total)}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {totalHours.toFixed(1)} hrs · {hours.length} entr{hours.length === 1 ? "y" : "ies"}
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pay date">
          <Input type="date" value={pay_date} onChange={(e) => setPayDate(e.target.value)} />
        </Field>
        <Field label="Amount ($)">
          <Input
            type="number"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Method">
        <Select value={payment_method} onValueChange={setMethod}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYROLL_PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Notes (optional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Mark as paid"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}