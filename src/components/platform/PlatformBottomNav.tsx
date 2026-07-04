import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfWeek, endOfWeek } from "date-fns";
import { prefetchRoute } from "@/lib/route-prefetch";
import { prefetchDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Receipt, Search, MoreHorizontal,
  Target, Users, FileText, Briefcase, CreditCard, TrendingUp,
  MessageSquare, ClipboardList, Settings, LogOut, X,
  UserPlus, FileCheck2, Upload as UploadIcon, GraduationCap, BookOpen,
  ShieldCheck, FileSpreadsheet, Files,
  ClipboardCheck, Calculator,
  Activity, ShieldAlert, BookText, Rocket, TestTube, AlertCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import UniversalSearch from "./UniversalSearch";
import { useUserRole } from "@/hooks/useUserRole";

interface MoreItem {
  label: string;
  path: string;
  icon: typeof Target;
  external?: boolean;
  group?: string;
}

const buildMoreItems = (shortcode: string | undefined, hideAnalytics: boolean): MoreItem[] => [
  { label: "Leads", path: "/platform/leads", icon: Target },
  { label: "Customers", path: "/platform/customers", icon: Users },
  { label: "Quotes", path: "/platform/quotes", icon: FileText },
  { label: "Jobs", path: "/platform/jobs", icon: Briefcase },
  { label: "Payments", path: "/platform/payments", icon: CreditCard },
  ...(hideAnalytics ? [] : [{ label: "Unpaid Jobs", path: "/platform/unpaid", icon: AlertCircle } as MoreItem]),
  ...(hideAnalytics ? [] : [{ label: "Analytics", path: "/platform/analytics", icon: TrendingUp } as MoreItem]),
  { label: "Comms", path: "/platform/communications", icon: MessageSquare },
  { label: "Tasks", path: "/platform/tasks", icon: ClipboardList },
  ...(shortcode === "PPS"
    ? [
        { label: "Job Checklists", path: "/platform/job-checklists", icon: ClipboardCheck } as MoreItem,
        { label: "Job Pricing", path: "/platform/job-pricing", icon: Calculator } as MoreItem,
      ]
    : []),
  { label: "Settings", path: "/platform/settings", icon: Settings },
  ...(hideAnalytics ? [] : [{ label: "Backend Health", path: "/platform/backend-health", icon: Activity } as MoreItem]),
  ...(hideAnalytics ? [] : [{ label: "Reconciliation", path: "/platform/reconciliation", icon: ShieldAlert } as MoreItem]),
  ...(hideAnalytics ? [] : [{ label: "Release Checklist", path: "/platform/release", icon: Rocket } as MoreItem]),
  ...(hideAnalytics ? [] : [{ label: "QA Checklist", path: "/platform/qa-checklist", icon: TestTube } as MoreItem]),
    { label: "Docs & Runbooks", path: "/platform/docs", icon: BookText },
  { label: "Applicants", path: "/admin/applicants", icon: UserPlus, external: true, group: "Team & HR" },
  { label: "SOP Acknowledgements", path: "/admin/sop-acknowledgments", icon: FileCheck2, external: true, group: "Team & HR" },
  { label: "Uploads", path: "/admin/uploads", icon: UploadIcon, external: true, group: "Team & HR" },
  { label: "Job Listings", path: "/careers/gulf-coast-palms", icon: GraduationCap, external: true, group: "Team & HR" },
  { label: "Team SOPs", path: "/employee/gulf-coast-palms/sop/team-leader", icon: BookOpen, external: true, group: "Team & HR" },
  { label: "Insurance", path: "/platform/documents/insurance", icon: ShieldCheck, group: "Documents" },
  { label: "Tax Info", path: "/platform/documents/tax", icon: FileSpreadsheet, group: "Documents" },
  { label: "Forms", path: "/platform/documents/forms", icon: Files, group: "Documents" },
];

interface Props {
  businessId: string | null;
  onSignOut: () => void;
  workspaceShortcode?: string;
}

export default function PlatformBottomNav({ businessId, onSignOut, workspaceShortcode }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useUserRole();
  const qc = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const hideAnalytics = !!role && role !== "owner";
  const moreItems = buildMoreItems(workspaceShortcode, hideAnalytics);
  const morePaths = moreItems.map(i => i.path);

  const path = location.pathname;
  const isDashboard = path === "/platform";
  const isSchedule = path === "/platform/schedule";
  const isInvoices = path === "/platform/invoices";
  const isMore = morePaths.includes(path);

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

  const warmRoute = (to: string) => {
    prefetchRoute(to);
    if (to === "/platform/schedule" && businessId) {
      const now = new Date();
      prefetchDashboardScheduledJobs(qc, {
        businessId,
        startDate: startOfWeek(now, { weekStartsOn: 0 }),
        endDate: endOfWeek(now, { weekStartsOn: 0 }),
      });
    }
  };

            if (item.type === "link") {
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className="flex-1 flex"
                  onPointerDown={() => warmRoute(item.to)}
                  onTouchStart={() => warmRoute(item.to)}
                >
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
            {(() => {
              const groups = new Map<string, MoreItem[]>();
              const ungrouped: MoreItem[] = [];
              for (const it of moreItems) {
                if (it.group) {
                  const arr = groups.get(it.group) ?? [];
                  arr.push(it);
                  groups.set(it.group, arr);
                } else {
                  ungrouped.push(it);
                }
              }
              const renderItem = (item: MoreItem) => {
                const Icon = item.icon;
                const isActive = path === item.path;
                const className = cn(
                  "w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-lg font-body text-[14px] font-medium transition-colors text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                );
                const inner = (
                  <>
                    <Icon className={cn("w-[20px] h-[20px]", isActive ? "text-primary" : "text-muted-foreground/70")} />
                    <span className="flex-1">{item.label}</span>
                  </>
                );
                if (item.external) {
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={className}
                    >
                      {inner}
                    </a>
                  );
                }
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMoreOpen(false); }}
                    className={className}
                  >
                    {inner}
                  </button>
                );
              };
              return (
                <>
                  {ungrouped.map(renderItem)}
                  {Array.from(groups.entries()).map(([g, items]) => (
                    <div key={g} className="mt-2">
                      <p className="px-3 mt-2 mb-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/50">
                        {g}
                      </p>
                      {items.map(renderItem)}
                    </div>
                  ))}
                </>
              );
            })()}
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
            <UniversalSearch businessId={businessId} autoOpen embedded />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
