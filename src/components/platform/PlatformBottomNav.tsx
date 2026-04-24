import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Receipt, Search, MoreHorizontal,
  Target, Users, FileText, Briefcase, CreditCard, TrendingUp,
  MessageSquare, ClipboardList, Settings, LogOut, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import UniversalSearch from "./UniversalSearch";

const MORE_ITEMS = [
  { label: "Leads", path: "/platform/leads", icon: Target },
  { label: "Customers", path: "/platform/customers", icon: Users },
  { label: "Quotes", path: "/platform/quotes", icon: FileText },
  { label: "Jobs", path: "/platform/jobs", icon: Briefcase },
  { label: "Payments", path: "/platform/payments", icon: CreditCard },
  { label: "Analytics", path: "/platform/analytics", icon: TrendingUp },
  { label: "Comms", path: "/platform/communications", icon: MessageSquare },
  { label: "Tasks", path: "/platform/tasks", icon: ClipboardList },
  { label: "Settings", path: "/platform/settings", icon: Settings },
];

const MORE_PATHS = MORE_ITEMS.map(i => i.path);

interface Props {
  businessId: string | null;
  onSignOut: () => void;
}

export default function PlatformBottomNav({ businessId, onSignOut }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const path = location.pathname;
  const isDashboard = path === "/platform";
  const isSchedule = path === "/platform/schedule";
  const isInvoices = path === "/platform/invoices";
  const isMore = MORE_PATHS.includes(path);

  const navItems = [
    { key: "dashboard", label: "Home", icon: LayoutDashboard, active: isDashboard, to: "/platform" as const, type: "link" as const },
    { key: "schedule", label: "Schedule", icon: CalendarDays, active: isSchedule, to: "/platform/schedule" as const, type: "link" as const },
    { key: "invoices", label: "Invoices", icon: Receipt, active: isInvoices, to: "/platform/invoices" as const, type: "link" as const },
    { key: "search", label: "Search", icon: Search, active: searchOpen, type: "search" as const },
    { key: "more", label: "More", icon: MoreHorizontal, active: isMore || moreOpen, type: "more" as const },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <div className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full min-h-[48px] relative transition-transform active:scale-95"
              )}>
                {item.active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors duration-150",
                    item.active ? "text-primary" : "text-muted-foreground/70"
                  )}
                  fill={item.active ? "currentColor" : "none"}
                  fillOpacity={item.active ? 0.15 : 0}
                />
                <span className={cn(
                  "font-body text-[10px] font-medium uppercase tracking-wide transition-colors duration-150",
                  item.active ? "text-primary" : "text-muted-foreground/60"
                )}>
                  {item.label}
                </span>
              </div>
            );

            if (item.type === "link") {
              return (
                <Link key={item.key} to={item.to} className="flex-1 flex">
                  {content}
                </Link>
              );
            }
            if (item.type === "search") {
              return (
                <button
                  key={item.key}
                  onClick={() => setSearchOpen(true)}
                  className="flex-1 flex"
                  aria-label="Search"
                >
                  {content}
                </button>
              );
            }
            // more
            return (
              <button
                key={item.key}
                onClick={() => setMoreOpen(true)}
                className="flex-1 flex"
                aria-label="More"
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      {/* More bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="bg-card border-t border-border rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
        >
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
            <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">Menu</h3>
          </div>
          <div className="p-2">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = path === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMoreOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg font-body text-[14px] font-medium transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary/60"
                  )}
                >
                  <Icon className={cn(
                    "w-[20px] h-[20px]",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )} />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
            <div className="my-2 border-t border-border" />
            <button
              onClick={() => { setMoreOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg font-body text-[14px] font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <LogOut className="w-[20px] h-[20px]" />
              <span className="flex-1">Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Search modal (mobile) */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent
          side="top"
          className="bg-card border-b border-border p-4 h-auto max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">Search</h3>
            <button
              onClick={() => setSearchOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full">
            <UniversalSearch businessId={businessId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
