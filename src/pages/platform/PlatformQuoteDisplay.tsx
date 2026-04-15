import { useParams } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import ViewQuote from "../quote/ViewQuote";
import { Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_QUOTE = {
  number: "GCP-Q-0042",
  date: "April 14, 2026",
  customer: {
    name: "James & Rachel Whitfield",
    address: "312 Emerald Coast Pkwy, Destin, FL 32541",
    phone: "(850) 555-1234",
    email: "jwhitfield@email.com",
  },
  jobTitle: "Full Landscape Renovation",
  jobDescription:
    "Complete front & backyard redesign including palm installation, sod, mulch beds, and irrigation tie-in.",
  lineItems: [
    { description: "Medjool Date Palm – 12 ft (installed)", qty: 3, unitPrice: 1800 },
    { description: "Sylvester Palm – 10 ft (installed)", qty: 2, unitPrice: 1100 },
    { description: "St. Augustine Sod – per pallet", qty: 8, unitPrice: 275 },
    { description: "Mulch & Bed Prep – 1,200 sq ft", qty: 1, unitPrice: 960 },
    { description: "Irrigation Tie-In & Testing", qty: 1, unitPrice: 650 },
  ],
  taxRate: 7.5,
};

const subtotal = DEMO_QUOTE.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
const tax = subtotal * (DEMO_QUOTE.taxRate / 100);
const grandTotal = subtotal + tax;

const milestones = [
  { label: "Deposit to Schedule — 20%", amount: grandTotal * 0.2, status: "paid" as const, date: "Apr 10, 2026" },
  { label: "Day of Install — 40%", amount: grandTotal * 0.4, status: "next" as const, date: null },
  { label: "On Completion — 40%", amount: grandTotal * 0.4, status: "upcoming" as const, date: null },
];

const paidTotal = milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.amount, 0);
const progressPct = (paidTotal / grandTotal) * 100;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PlatformQuoteDisplay() {
  const { quoteId, shortcode } = useParams();

  if (quoteId && shortcode) {
    return <ViewQuote />;
  }

  return (
    <PlatformLayout>
      <div
        className="min-h-[calc(100vh-80px)] -m-4 md:-m-6 flex items-start justify-center px-3 py-8 md:py-14"
        style={{ background: "#09090b" }}
      >
        <div className="relative w-full max-w-2xl">
          <div
            className="absolute inset-0 -inset-x-20 -inset-y-24 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(34,197,94,0.14) 0%, transparent 70%)",
            }}
          />

          <div className="relative rounded-2xl overflow-hidden" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
            <div className="p-5 md:p-7 border-b" style={{ borderColor: "#1e1e1e" }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <span className="text-[#22c55e] font-bold text-xs tracking-tight">GCP</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-white">{DEMO_QUOTE.number}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>{DEMO_QUOTE.date}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-white font-semibold text-[15px]">{DEMO_QUOTE.customer.name}</p>
                <p className="text-xs" style={{ color: "#a1a1aa" }}>{DEMO_QUOTE.customer.address}</p>
                <p className="text-xs" style={{ color: "#a1a1aa" }}>
                  {DEMO_QUOTE.customer.phone} · {DEMO_QUOTE.customer.email}
                </p>
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1e1e1e" }}>
                <p className="text-white font-semibold text-sm">{DEMO_QUOTE.jobTitle}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#a1a1aa" }}>
                  {DEMO_QUOTE.jobDescription}
                </p>
              </div>
            </div>

            <div className="p-5 md:p-7">
              <div
                className="grid grid-cols-[1fr_48px_80px_80px] gap-2 pb-2 mb-1 text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "#a1a1aa", borderBottom: "1px solid #1e1e1e" }}
              >
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
              </div>

              {DEMO_QUOTE.lineItems.map((li, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_48px_80px_80px] gap-2 py-3 items-center"
                  style={{ borderBottom: i < DEMO_QUOTE.lineItems.length - 1 ? "1px solid #1a1a1a" : "none" }}
                >
                  <span className="text-white text-sm leading-snug">{li.description}</span>
                  <span className="text-center text-sm" style={{ color: "#a1a1aa" }}>{li.qty}</span>
                  <span className="text-right text-sm" style={{ color: "#a1a1aa" }}>${fmt(li.unitPrice)}</span>
                  <span className="text-right text-sm text-white font-medium">${fmt(li.qty * li.unitPrice)}</span>
                </div>
              ))}

              <div className="mt-5 pt-4 space-y-2" style={{ borderTop: "1px solid #1e1e1e" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#a1a1aa" }}>Subtotal</span>
                  <span className="text-white">${fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#a1a1aa" }}>Tax ({DEMO_QUOTE.taxRate}%)</span>
                  <span className="text-white">${fmt(tax)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2" style={{ borderTop: "1px solid #1e1e1e" }}>
                  <span className="text-sm font-semibold text-white">Grand Total</span>
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: "#22c55e" }}>
                    ${fmt(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 md:px-7 pb-6 md:pb-8">
              <div className="rounded-xl overflow-hidden" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
                <div className="h-1.5 w-full" style={{ background: "#1e1e1e" }}>
                  <div className="h-full rounded-r-full transition-all duration-700" style={{ width: `${progressPct}%`, background: "#22c55e" }} />
                </div>

                <div className="p-4 space-y-0">
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className={cn("flex items-center gap-3 py-3.5 px-2 rounded-lg", i < milestones.length - 1 && "border-b")}
                      style={{ borderColor: "#1a1a1a" }}
                    >
                      <div className="shrink-0">
                        {m.status === "paid" ? (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                            <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center" style={{ borderColor: m.status === "next" ? "#22c55e" : "#333" }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-tight truncate">{m.label}</p>
                        <p className="text-base font-bold mt-0.5" style={{ color: m.status === "paid" ? "#22c55e" : "#fff" }}>
                          ${fmt(m.amount)}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {m.status === "paid" && (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                              Paid
                            </span>
                            <span className="text-[10px] mt-0.5" style={{ color: "#a1a1aa" }}>{m.date}</span>
                          </div>
                        )}
                        {m.status === "next" && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>
                              Next Payment
                            </span>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-[0_0_16px_rgba(34,197,94,0.25)]" style={{ background: "#22c55e", color: "#000" }}>
                              <Send className="w-3 h-3" /> Send Payment
                            </button>
                          </div>
                        )}
                        {m.status === "upcoming" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(161,161,170,0.1)", color: "#71717a" }}>
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}