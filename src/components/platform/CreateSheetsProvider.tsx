/**
 * Lightweight provider — modal sheets removed. Creation flows now navigate to
 * full-page editors at /platform/{entity}s/new. We keep `notifyCreated` /
 * `createdTick` so list pages can refresh after a save, and a `navigateToCreate`
 * helper so call sites still pass prefill via router state.
 */
import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export type CreateKind = "job" | "customer" | "quote" | "invoice" | "lead";

export interface JobPrefillState {
  customer?: { id: string; display_name: string; phone: string | null; email: string | null } | null;
  title?: string;
  description?: string;
  total?: number | null;
  fromQuoteId?: string;
  fromQuoteNumber?: string;
  address?: string;
  internalNotes?: string;
  scheduledDate?: string;
}
export interface InvoicePrefillState {
  customer?: { id: string; display_name: string; phone: string | null; email: string | null } | null;
  items?: Array<{ description: string; quantity: number; unit_price: number }>;
  fromJobId?: string;
}

interface CreateSheetsContextValue {
  /** Navigates to /platform/{kind}s/new, optionally with prefill in router state */
  open: (kind: CreateKind, prefill?: JobPrefillState | InvoicePrefillState) => void;
  /** Bumps every time a record is created so list pages can refetch */
  createdTick: number;
  notifyCreated: () => void;
}

const Ctx = createContext<CreateSheetsContextValue | null>(null);

export function useCreateSheets() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCreateSheets must be used inside CreateSheetsProvider");
  return v;
}

const ROUTE_FOR: Record<CreateKind, string> = {
  job: "/platform/jobs/new",
  customer: "/platform/customers/new",
  quote: "/platform/quotes/new",
  invoice: "/platform/invoices/new",
  lead: "/platform/leads/new",
};

export function CreateSheetsProvider({ children }: { children: ReactNode }) {
  const [createdTick, setCreatedTick] = useState(0);
  const navigate = useNavigate();

  const open = useCallback((kind: CreateKind, prefill?: JobPrefillState | InvoicePrefillState) => {
    navigate(ROUTE_FOR[kind], prefill ? { state: { prefill } } : undefined);
  }, [navigate]);
  const notifyCreated = useCallback(() => setCreatedTick((t) => t + 1), []);

  return (
    <Ctx.Provider value={{ open, createdTick, notifyCreated }}>
      {children}
    </Ctx.Provider>
  );
}