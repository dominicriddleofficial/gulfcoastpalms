import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "platform_selected_business";

interface BusinessContextValue {
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string | null) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [selectedBusinessId, setSelectedBusinessIdRaw] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setSelectedBusinessId = useCallback((id: string | null) => {
    setSelectedBusinessIdRaw(id);
    try {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
      }
    } catch {}
  }, []);

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
