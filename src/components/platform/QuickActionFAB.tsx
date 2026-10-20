import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, X, FileText, Briefcase, UserPlus, Receipt, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { OFFLINE_WRITE_TOOLTIP } from "@/lib/offlineMode";

interface QuickAction { label: string; path: string; icon: typeof Plus; ownerOnly?: boolean; }

const ACTIONS: QuickAction[] = [
  { label: "New Quote",   path: "/platform/quotes/new",    icon: FileText },
  { label: "New Job",     path: "/platform/jobs/new",      icon: Briefcase },
  { label: "New Customer",path: "/platform/customers/new", icon: UserPlus },
  { label: "New Invoice", path: "/platform/invoices/new",  icon: Receipt, ownerOnly: true },
  { label: "Log a Lead",  path: "/platform/leads/new",     icon: Target },
];

interface Props {
  brandColor?: string;
}

export default function QuickActionFAB({ brandColor = "var(--button-bg)" }: Props) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, isCrew } = useUserRole();
  const { offline } = useOfflineMode();

  // Hide FAB whenever any Radix dialog/sheet is open (e.g. job detail sheet).
  useEffect(() => {
    const check = () => {
      const hasOpen = document.querySelector(
        '[role="dialog"][data-state="open"]',
      );
      setDialogOpen(Boolean(hasOpen));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => observer.disconnect();
  }, []);

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
  // Crew can't create any of these
  if (isCrew) return null;
  // Hide FAB on the creation pages themselves — no creating-while-creating
  if (/\/platform\/(invoices|quotes|jobs|customers|leads)\/new$/.test(location.pathname)) return null;
  // Hide FAB while a sheet/dialog is open so it doesn't float over content.
  if (dialogOpen) return null;

  const visibleActions = ACTIONS.filter(a => !a.ownerOnly || isOwner);

  const handleAction = (path: string) => {
    if (offline) return;
    setOpen(false);
    navigate(path);
  };

  return (
    <div
      ref={ref}
      className="fixed right-4 z-[60] flex flex-col-reverse items-end gap-2 bottom-[calc(env(safe-area-inset-bottom)+84px)] lg:bottom-6"
    >
      {open && !offline && (
        <div className="flex flex-col gap-1.5 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {visibleActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.path)}
              className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl bg-card border border-border shadow-lg hover:bg-secondary/60 transition-colors group"
            >
              <action.icon className="w-4 h-4 text-primary" />
              <span className="font-body text-sm font-medium text-foreground whitespace-nowrap">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => { if (!offline) setOpen(!open); }}
        disabled={offline}
        aria-disabled={offline}
        title={offline ? OFFLINE_WRITE_TOOLTIP : undefined}
        className={cn(
          "platform-fab w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95",
          open && "platform-fab-open",
          offline && "opacity-40 cursor-not-allowed hover:scale-100",
        )}
        style={{ backgroundColor: brandColor }}
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        {open ? (
          <X className="w-5 h-5" style={{ color: "var(--button-text)" }} />
        ) : (
          <Plus className="w-5 h-5" style={{ color: "var(--button-text)" }} />
        )}
      </button>
    </div>
  );
}
