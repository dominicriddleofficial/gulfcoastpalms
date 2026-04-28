import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, X, FileText, Briefcase, Users, Receipt, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  path: string;
  emoji: string;
}

const ACTIONS: QuickAction[] = [
  { label: "New Quote", path: "/platform/quotes", emoji: "📋" },
  { label: "New Job", path: "/platform/jobs", emoji: "🔧" },
  { label: "New Customer", path: "/platform/customers", emoji: "👤" },
  { label: "New Invoice", path: "/platform/invoices", emoji: "💵" },
  { label: "Log a Lead", path: "/platform/leads", emoji: "📞" },
];

interface Props {
  brandColor?: string;
}

export default function QuickActionFAB({ brandColor = "var(--button-bg)" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Only show on platform/* and admin/* routes
  const isPlatform = location.pathname.startsWith("/platform");
  const isAdmin = location.pathname.startsWith("/admin");
  if (!isPlatform && !isAdmin) return null;

  const handleAction = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1.5 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.path)}
              className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl bg-card border border-border shadow-lg hover:bg-secondary/60 transition-colors group"
            >
              <span className="text-base">{action.emoji}</span>
              <span className="font-body text-sm font-medium text-foreground whitespace-nowrap">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95",
          open && "rotate-45"
        )}
        style={{ backgroundColor: brandColor }}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        {open ? (
          <X className="w-6 h-6" style={{ color: "var(--button-text)" }} />
        ) : (
          <Plus className="w-6 h-6" style={{ color: "var(--button-text)" }} />
        )}
      </button>
    </div>
  );
}
