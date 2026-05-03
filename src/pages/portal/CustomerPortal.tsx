import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, FileText, Receipt, DollarSign, Calendar } from "lucide-react";

type Quote = { id: string; quote_number: string; status: string; total: number; valid_until: string | null; sent_at: string | null; business_id: string };
type Invoice = { id: string; invoice_number: string; status: string; total: number; balance_due: number; amount_paid: number; issue_date: string | null; due_date: string | null; business_id: string };
type Payment = { id: string; payment_number: string | null; amount: number; method: string | null; status: string; payment_date: string | null; invoice_id: string | null; is_refund: boolean };
type Job = { id: string; job_number: string; title: string | null; status: string; scheduled_start: string | null; scheduled_end: string | null; total: number; business_id: string };
type Business = { id: string; public_brand_name: string | null; shortcode: string | null; logo_url: string | null; support_email: string | null; support_phone: string | null };

type PortalData = {
  customer: { email: string; name: string | null; phone: string | null };
  businesses: Business[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  jobs: Job[];
};

const fmtMoney = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const variant: "default" | "secondary" | "outline" | "destructive" =
    s === "paid" || s === "approved" || s === "accepted" || s === "completed" ? "default"
    : s === "overdue" || s === "expired" || s === "declined" ? "destructive"
    : s === "draft" ? "outline" : "secondary";
  return <Badge variant={variant} className="capitalize">{status.replace(/_/g, " ")}</Badge>;
}

function RequestLink({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("customer-portal-request", {
        body: { email, origin: window.location.origin },
      });
      if (error) throw error;
      onSent(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-16">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Customer Portal</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Enter the email we have on file. We'll send you a secure sign-in link.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send sign-in link"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function Sent({ email }: { email: string }) {
  return (
    <Card className="max-w-md mx-auto mt-16">
      <CardHeader><CardTitle>Check your email</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          If <span className="text-foreground font-medium">{email}</span> is on file, you'll receive a sign-in link in a moment. The link expires in 30 minutes.
        </p>
      </CardContent>
    </Card>
  );
}

export default function CustomerPortal() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("customer-portal-data", { body: { token } });
        if (cancelled) return;
        if (error) throw error;
        if (res?.error) throw new Error(res.error);
        setData(res as PortalData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load portal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const bizMap = useMemo(() => {
    const m = new Map<string, Business>();
    data?.businesses.forEach((b) => m.set(b.id, b));
    return m;
  }, [data]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        {sentTo ? <Sent email={sentTo} /> : <RequestLink onSent={setSentTo} />}
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-background px-4 py-8">
      <Card className="max-w-md mx-auto mt-16">
        <CardHeader><CardTitle>Link expired</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Link to="/portal"><Button variant="outline" className="w-full">Request a new link</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
  if (!data) return null;

  const upcomingJobs = data.jobs.filter(j => j.status !== "completed");
  const completedJobs = data.jobs.filter(j => j.status === "completed");
  const outstandingInvoices = data.invoices.filter(i => Number(i.balance_due) > 0);
  const totalBalance = outstandingInvoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back{data.customer.name ? `, ${data.customer.name}` : ""}</h1>
            <p className="text-sm text-muted-foreground">{data.customer.email}</p>
          </div>
          {totalBalance > 0 && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total balance due</p>
              <p className="text-2xl font-semibold text-primary">{fmtMoney(totalBalance)}</p>
            </div>
          )}
        </header>

        {/* Upcoming jobs */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Upcoming jobs</CardTitle></CardHeader>
          <CardContent>
            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming jobs scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingJobs.map(j => (
                  <div key={j.id} className="flex items-center justify-between border border-border rounded-md px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{j.title || j.job_number}</p>
                      <p className="text-xs text-muted-foreground">{j.job_number} · {fmtDate(j.scheduled_start)}</p>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Invoices</CardTitle></CardHeader>
          <CardContent>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {data.invoices.map(i => {
                  const biz = bizMap.get(i.business_id);
                  const payHref = biz?.shortcode ? `/pay/${biz.shortcode.toLowerCase()}/${i.id}` : null;
                  return (
                    <div key={i.id} className="flex items-center justify-between border border-border rounded-md px-4 py-3 gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{i.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">Due {fmtDate(i.due_date)} · Total {fmtMoney(i.total)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmtMoney(i.balance_due)}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">balance</p>
                        </div>
                        <StatusBadge status={i.status} />
                        {payHref && Number(i.balance_due) > 0 && (
                          <Link to={payHref}><Button size="sm">Pay</Button></Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Quotes</CardTitle></CardHeader>
          <CardContent>
            {data.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes yet.</p>
            ) : (
              <div className="space-y-2">
                {data.quotes.map(q => {
                  const biz = bizMap.get(q.business_id);
                  const href = biz?.shortcode ? `/quote/${biz.shortcode.toLowerCase()}/${q.id}` : null;
                  return (
                    <div key={q.id} className="flex items-center justify-between border border-border rounded-md px-4 py-3 gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{q.quote_number}</p>
                        <p className="text-xs text-muted-foreground">{fmtMoney(q.total)} · valid until {fmtDate(q.valid_until)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={q.status} />
                        {href && <Link to={href}><Button size="sm" variant="outline">View</Button></Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Payment history</CardTitle></CardHeader>
          <CardContent>
            {data.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {data.payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between border border-border rounded-md px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{p.is_refund ? "Refund" : "Payment"} {p.payment_number ? `· ${p.payment_number}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(p.payment_date)} · {p.method || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${p.is_refund ? "text-destructive" : "text-primary"}`}>{p.is_refund ? "-" : ""}{fmtMoney(p.amount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {completedJobs.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Completed jobs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedJobs.map(j => (
                  <div key={j.id} className="flex items-center justify-between border border-border rounded-md px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{j.title || j.job_number}</p>
                      <p className="text-xs text-muted-foreground">{j.job_number} · {fmtDate(j.scheduled_start)}</p>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}