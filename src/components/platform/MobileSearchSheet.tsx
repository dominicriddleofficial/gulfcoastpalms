import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import UniversalSearch from "./UniversalSearch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
}

/**
 * Shared full-width search sheet used by BOTH the mobile header search button
 * and the bottom-nav Search tab. Solid opaque surface, safe-area aware,
 * dynamic-viewport height so the iOS keyboard doesn't hide results.
 */
export default function MobileSearchSheet({ open, onOpenChange, businessId }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        aria-describedby={undefined}
        className="ops-theme z-[80] flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 overflow-hidden border-0 p-0 sm:h-auto sm:max-h-[85dvh] [&>button.absolute]:hidden"
        style={{ background: "#0b0f0c", paddingTop: "env(safe-area-inset-top)" }}
        data-testid="mobile-search-sheet"
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <SheetTitle className="font-display text-[15px] font-semibold tracking-tight" style={{ color: "#f3f4f6" }}>
            Search
          </SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/5"
            style={{ color: "#d1d5db" }}
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {open && (
            <UniversalSearch businessId={businessId} embedded autoOpen onNavigate={() => onOpenChange(false)} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
