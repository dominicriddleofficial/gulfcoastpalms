import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/hooks/usePlatformInvoices";
import { getAmountDueNow, getInvoiceDisplayState } from "./InvoiceStatusBadge";
import {
  CreditCard, Send, Link2, Banknote, History, ExternalLink,
  Smartphone, ChevronRight, X, CheckCircle, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { launchTapToPay, type TapToPayParams } from "@/lib/tap-to-pay";

interface Props {
  invoice: {
    id: string;
    invoice_number: string;
    total: number | null;
    balance_due: number | null;
    amount_paid: number | null;
    deposit_required: boolean | null;
    deposit_paid: boolean | null;
    deposit_amount: number | null;
    status: string;
  };
  onRecordPayment: (amount: number, method: string, notes: string, isDeposit: boolean) => void;
  onOpenPaymentPage: () => void;
  onCopyPaymentLink: () => void;
  onSendPaymentLink?: () => void;
  onViewHistory?: () => void;
  businessId?: string;
  customerId?: string;
}

type FlowStep = "menu" | "collect" | "record" | "confirm";

/**
 * Returns the opinionated primary action label and description based on invoice state.
 */
function getPrimaryAction(invoice: Props["invoice"]): {
  label: string;
  description: string;
  isPaid: boolean;
} {
  const displayState = getInvoiceDisplayState(invoice);

  if (displayState === "paid") {
    return { label: "View Payment History", description: "This invoice is paid in full.", isPaid: true };
  }
  if (displayState === "deposit_due") {
    const amt = Number(invoice.deposit_amount || 0);
    return { label: `Collect Deposit — $${amt.toLocaleString()}`, description: "Deposit is required before work begins.", isPaid: false };
  }
  if (displayState === "partial" || displayState === "deposit_paid") {
    const balance = Number(invoice.balance_due ?? invoice.total ?? 0);
    return { label: `Collect Remaining — $${balance.toLocaleString()}`, description: "Partial payment received. Collect the remaining balance.", isPaid: false };
  }
  // Default: unpaid / sent / viewed / overdue / draft
  const { amount } = getAmountDueNow(invoice);
  return { label: `Collect Payment — $${amount.toLocaleString()}`, description: "Full payment is due.", isPaid: false };
}

export default function PaymentActionPanel({
  invoice, onRecordPayment, onOpenPaymentPage, onCopyPaymentLink, onSendPaymentLink, onViewHistory, businessId, customerId,
}: Props) {
  const [step, setStep] = useState<FlowStep>("menu");
  const { amount: suggestedAmount, label: suggestedLabel } = getAmountDueNow(invoice);
  const [payAmount, setPayAmount] = useState(String(suggestedAmount));
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [isDeposit, setIsDeposit] = useState(!!invoice.deposit_required && !invoice.deposit_paid);
  const { toast } = useToast();

  const balance = Number(invoice.balance_due ?? invoice.total ?? 0);
  const primary = getPrimaryAction(invoice);

  if (step === "collect") {
    return (
      <CollectMenu
        onBack={() => setStep("menu")}
        onOnline={onOpenPaymentPage}
        onSendLink={onSendPaymentLink || onCopyPaymentLink}
        onRecord={() => setStep("record")}
      />
    );
  }

  if (step === "record") {
    return (
      <RecordPaymentForm
        suggestedAmount={suggestedAmount}
        suggestedLabel={suggestedLabel}
        maxAmount={balance}
        depositRequired={!!invoice.deposit_required && !invoice.deposit_paid}
        depositAmount={Number(invoice.deposit_amount || 0)}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        payNotes={payNotes}
        setPayNotes={setPayNotes}
        isDeposit={isDeposit}
        setIsDeposit={setIsDeposit}
        onBack={() => setStep("collect")}
        onConfirm={() => setStep("confirm")}
      />
    );
  }

  if (step === "confirm") {
    const amt = Number(payAmount) || 0;
    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#f59e0b]" />
          <h3 className="font-display text-sm font-bold text-foreground">Confirm Payment</h3>
        </div>
        <div className="bg-secondary/60 rounded-lg p-4 space-y-2">
          <ConfirmRow label="Amount" value={`$${amt.toLocaleString()}`} />
          <ConfirmRow label="Method" value={PAYMENT_METHODS.find(m => m.value === payMethod)?.label || payMethod} />
          <ConfirmRow label="Type" value={isDeposit ? "Deposit Payment" : "Invoice Payment"} />
          {payNotes && <ConfirmRow label="Notes" value={payNotes} />}
        </div>
        <p className="font-body text-[11px] text-muted-foreground">
          Use this only for cash, check, Zelle, bank transfer, or other offline payments. Online Stripe payments update automatically.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1 h-11 font-body font-semibold" onClick={() => {
            onRecordPayment(amt, payMethod, payNotes, isDeposit);
            setStep("menu");
          }}>
            <CheckCircle className="w-4 h-4 mr-1.5" /> Confirm Payment
          </Button>
          <Button variant="outline" className="font-body" onClick={() => setStep("record")}>Back</Button>
        </div>
      </div>
    );
  }

  // ──── MENU (default) — Opinionated primary action ────
  return (
    <div className="space-y-2">
      <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider mb-3">
        {primary.isPaid ? "Payment Complete" : "What to Do Next"}
      </h3>

      {/* Opinionated helper text */}
      <p className="font-body text-[11px] text-muted-foreground leading-snug mb-2">{primary.description}</p>

      {/* PRIMARY: Context-aware dominant button */}
      {primary.isPaid ? (
        <Button
          variant="outline"
          className="w-full h-12 font-body font-semibold text-sm justify-between border-[#22c55e]/30 text-[#22c55e]"
          onClick={onViewHistory || (() => {})}
        >
          <span className="flex items-center gap-2">
            <History className="w-4.5 h-4.5" /> View Payment History
          </span>
          <ChevronRight className="w-4 h-4 opacity-70" />
        </Button>
      ) : (
        <Button
          className="w-full h-12 font-body font-semibold text-sm justify-between"
          onClick={() => setStep("collect")}
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-4.5 h-4.5" /> {primary.label}
          </span>
          <ChevronRight className="w-4 h-4 opacity-70" />
        </Button>
      )}

      {/* Secondary: Send Payment Link */}
      {!primary.isPaid && (
        <>
          <Button
            variant="outline"
            className="w-full h-10 font-body font-medium text-sm justify-between border-primary/20 hover:border-primary/40"
            onClick={onSendPaymentLink || onCopyPaymentLink}
          >
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Send Payment Link
            </span>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </Button>

          {/* Tertiary row */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 h-9 font-body text-xs" onClick={onCopyPaymentLink}>
              <Link2 className="w-3.5 h-3.5 mr-1" /> Copy Link
            </Button>
            <Button variant="secondary" size="sm" className="flex-1 h-9 font-body text-xs" onClick={() => setStep("record")}>
              <Banknote className="w-3.5 h-3.5 mr-1" /> Record Offline
            </Button>
          </div>

          {/* Tap to Pay — deep link */}
          <TapToPayButton
            businessId={businessId || ""}
            invoiceId={invoice.id}
            customerId={customerId || ""}
            amount={suggestedAmount}
          />
        </>
      )}

      {/* View History */}
      {!primary.isPaid && onViewHistory && (
        <Button variant="ghost" size="sm" className="w-full h-8 font-body text-xs text-muted-foreground" onClick={onViewHistory}>
          <History className="w-3.5 h-3.5 mr-1" /> View Payment History
        </Button>
      )}
    </div>
  );
}

/* ─── Tap to Pay Status Indicator ─── */
function TapToPayStatus() {
  // In a real implementation, this would check:
  // 1. Is this a supported mobile device?
  // 2. Is the Stripe Terminal backend configured?
  // 3. Does the business have a terminal location?
  // For now, show honest readiness status.
  const isNativeMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const backendReady = true; // We have the edge functions deployed

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/40 border border-border">
      <Smartphone className="w-4 h-4 text-muted-foreground/60" />
      <div className="flex-1">
        <p className="font-body text-xs font-medium text-muted-foreground">Tap to Pay</p>
        <p className="font-body text-[10px] text-muted-foreground/70">
          {backendReady && !isNativeMobile
            ? "Backend ready — requires mobile app"
            : backendReady && isNativeMobile
            ? "Backend ready — mobile setup pending"
            : "Not configured"}
        </p>
      </div>
      <span className={cn(
        "font-body text-[10px] px-2 py-0.5 rounded-full border",
        backendReady
          ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
          : "bg-muted text-muted-foreground border-border"
      )}>
        {backendReady ? "Setup Pending" : "Not Ready"}
      </span>
    </div>
  );
}

/* ─── Collect Menu ─── */
function CollectMenu({ onBack, onOnline, onSendLink, onRecord }: {
  onBack: () => void; onOnline: () => void; onSendLink: () => void; onRecord: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-foreground">Collect Payment</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}><X className="w-4 h-4" /></Button>
      </div>
      <p className="font-body text-xs text-muted-foreground">Choose how to collect this payment:</p>

      <CollectOption
        icon={ExternalLink}
        title="Customer Pays Online Now"
        desc="Open the hosted payment page for card, Apple Pay, or Link."
        onClick={onOnline}
      />
      <CollectOption
        icon={Send}
        title="Send Payment Link"
        desc="Send a link so the customer can pay from their phone."
        onClick={onSendLink}
      />
      <CollectOption
        icon={Banknote}
        title="Record Cash / Check / Manual"
        desc="Use this only if payment happened outside the online flow."
        onClick={onRecord}
      />

      {/* Tap to Pay — honest status */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/30 border border-dashed border-border opacity-60">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-body text-xs font-medium text-muted-foreground">Tap to Pay</p>
          <p className="font-body text-[10px] text-muted-foreground/70">Requires supported device & mobile app</p>
        </div>
        <span className="font-body text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">Setup Pending</span>
      </div>
    </div>
  );
}

function CollectOption({ icon: Icon, title, desc, onClick }: {
  icon: any; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border hover:border-primary/20 transition-all"
    >
      <Icon className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="font-body text-sm font-semibold text-foreground">{title}</p>
        <p className="font-body text-[11px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </button>
  );
}

/* ─── Record Payment Form ─── */
function RecordPaymentForm({
  suggestedAmount, suggestedLabel, maxAmount, depositRequired, depositAmount,
  payAmount, setPayAmount, payMethod, setPayMethod, payNotes, setPayNotes,
  isDeposit, setIsDeposit, onBack, onConfirm,
}: {
  suggestedAmount: number; suggestedLabel: string; maxAmount: number;
  depositRequired: boolean; depositAmount: number;
  payAmount: string; setPayAmount: (v: string) => void;
  payMethod: string; setPayMethod: (v: string) => void;
  payNotes: string; setPayNotes: (v: string) => void;
  isDeposit: boolean; setIsDeposit: (v: boolean) => void;
  onBack: () => void; onConfirm: () => void;
}) {
  const amt = Number(payAmount) || 0;
  const isValid = amt > 0 && amt <= maxAmount;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-foreground">Record Offline Payment</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}><X className="w-4 h-4" /></Button>
      </div>

      <p className="font-body text-[11px] text-muted-foreground leading-snug">
        Use this only for cash, check, Zelle, bank transfer, or other offline payments.
      </p>

      {/* Quick amount suggestions */}
      <div className="flex gap-2">
        {depositRequired && depositAmount > 0 && (
          <Button
            variant={isDeposit ? "default" : "outline"}
            size="sm"
            className="font-body text-xs"
            onClick={() => { setPayAmount(String(depositAmount)); setIsDeposit(true); }}
          >
            Deposit ${depositAmount.toLocaleString()}
          </Button>
        )}
        <Button
          variant={!isDeposit ? "default" : "outline"}
          size="sm"
          className="font-body text-xs"
          onClick={() => { setPayAmount(String(maxAmount)); setIsDeposit(false); }}
        >
          Full Balance ${maxAmount.toLocaleString()}
        </Button>
      </div>

      <div>
        <label className="font-body text-xs font-medium text-foreground mb-1.5 block">Amount</label>
        <Input
          type="number"
          value={payAmount}
          onChange={e => setPayAmount(e.target.value)}
          className="bg-background border-border font-body text-base font-semibold h-11"
          min={0}
          max={maxAmount}
        />
        {amt > maxAmount && (
          <p className="font-body text-[11px] text-destructive mt-1">Cannot exceed remaining balance of ${maxAmount.toLocaleString()}</p>
        )}
      </div>

      <div>
        <label className="font-body text-xs font-medium text-foreground mb-1.5 block">Payment Method</label>
        <Select value={payMethod} onValueChange={setPayMethod}>
          <SelectTrigger className="bg-background border-border font-body text-sm h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.filter(m => m.value !== "card").map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="font-body text-xs font-medium text-foreground mb-1.5 block">Notes / Reference Number</label>
        <Input
          value={payNotes}
          onChange={e => setPayNotes(e.target.value)}
          placeholder="Check #, Zelle confirmation, etc."
          className="bg-background border-border font-body text-sm h-10"
        />
      </div>

      <Button className="w-full h-11 font-body font-semibold" disabled={!isValid} onClick={onConfirm}>
        Review Payment
      </Button>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-body text-xs text-muted-foreground">{label}</span>
      <span className="font-body text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
