import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "platform_selected_business";

interface BusinessContextValue {
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string | null) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedBusinessId, setSelectedBusinessIdRaw] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setSelectedBusinessId = useCallback((id: string | null) => {
    setSelectedBusinessIdRaw((prev) => {
      // Workspace actually changed — wipe ALL cached query data so no
      // dashboard/list/detail can leak data from the previous workspace.
      // React Query will refetch every active query against the new business_id.
      if (prev !== id) {
        try {
          queryClient.clear();
        } catch {}
      }
      return id;
    });
    try {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
      }
    } catch {}
  }, [queryClient]);

  return (
    <BusinessContext.Provider value={{ selectedBusinessId, setSelectedBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessContext must be used within BusinessProvider");
  return ctx;
}
