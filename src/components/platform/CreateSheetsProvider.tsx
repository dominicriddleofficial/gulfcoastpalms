import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import NewJobSheet from "./create/NewJobSheet";
import NewCustomerSheet from "./create/NewCustomerSheet";
import NewQuoteSheet from "./create/NewQuoteSheet";
import NewInvoiceSheet from "./create/NewInvoiceSheet";
import NewLeadSheet from "./create/NewLeadSheet";

export type CreateSheetKind = "job" | "customer" | "quote" | "invoice" | "lead" | null;

interface CreateSheetsContextValue {
  open: (kind: Exclude<CreateSheetKind, null>) => void;
  close: () => void;
  current: CreateSheetKind;
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
  const [createdTick, setCreatedTick] = useState(0);

  const open = useCallback((kind: Exclude<CreateSheetKind, null>) => setCurrent(kind), []);
  const close = useCallback(() => setCurrent(null), []);
  const notifyCreated = useCallback(() => setCreatedTick((t) => t + 1), []);

  return (
    <Ctx.Provider value={{ open, close, current, createdTick, notifyCreated }}>
      {children}
      <NewJobSheet open={current === "job"} onClose={close} />
      <NewCustomerSheet open={current === "customer"} onClose={close} />
      <NewQuoteSheet open={current === "quote"} onClose={close} />
      <NewInvoiceSheet open={current === "invoice"} onClose={close} />
      <NewLeadSheet open={current === "lead"} onClose={close} />
    </Ctx.Provider>
  );
}