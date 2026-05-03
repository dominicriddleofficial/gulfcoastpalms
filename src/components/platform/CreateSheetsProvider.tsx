import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import NewJobSheet, { JobPrefill } from "./create/NewJobSheet";
import NewCustomerSheet from "./create/NewCustomerSheet";
import NewQuoteSheet from "./create/NewQuoteSheet";
import NewInvoiceSheet, { InvoicePrefill } from "./create/NewInvoiceSheet";
import NewLeadSheet from "./create/NewLeadSheet";

export type CreateSheetKind = "job" | "customer" | "quote" | "invoice" | "lead" | null;

export interface CreateSheetPrefill {
  job?: JobPrefill;
  invoice?: InvoicePrefill;
}

interface CreateSheetsContextValue {
  open: (kind: Exclude<CreateSheetKind, null>, prefill?: CreateSheetPrefill[keyof CreateSheetPrefill]) => void;
  close: () => void;
  current: CreateSheetKind;
  prefill: CreateSheetPrefill;
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

export function CreateSheetsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<CreateSheetKind>(null);
  const [prefill, setPrefill] = useState<CreateSheetPrefill>({});
  const [createdTick, setCreatedTick] = useState(0);

  const open = useCallback((kind: Exclude<CreateSheetKind, null>, data?: CreateSheetPrefill[keyof CreateSheetPrefill]) => {
    setPrefill(data ? { [kind]: data } as CreateSheetPrefill : {});
    setCurrent(kind);
  }, []);
  const close = useCallback(() => { setCurrent(null); setPrefill({}); }, []);
  const notifyCreated = useCallback(() => setCreatedTick((t) => t + 1), []);

  return (
    <Ctx.Provider value={{ open, close, current, prefill, createdTick, notifyCreated }}>
      {children}
      <NewJobSheet open={current === "job"} onClose={close} prefill={prefill.job} />
      <NewCustomerSheet open={current === "customer"} onClose={close} />
      <NewQuoteSheet open={current === "quote"} onClose={close} />
      <NewInvoiceSheet open={current === "invoice"} onClose={close} prefill={prefill.invoice} />
      <NewLeadSheet open={current === "lead"} onClose={close} />
    </Ctx.Provider>
  );
}