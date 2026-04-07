import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import BusinessSwitcher from "./BusinessSwitcher";
import QuickActionFAB from "./QuickActionFAB";
import UniversalSearch from "./UniversalSearch";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, FileText, Briefcase, CalendarDays, Receipt,
  CreditCard, MessageSquare, ClipboardList, Settings, LogOut, Menu, X,
  Bell, TrendingUp, Target, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", path: "/platform", icon: LayoutDashboard },
      { label: "Leads", path: "/platform/leads", icon: Target },
      { label: "Customers", path: "/platform/customers", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Quotes", path: "/platform/quotes", icon: FileText },
      { label: "Jobs", path: "/platform/jobs", icon: Briefcase },
      { label: "Schedule", path: "/platform/schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Invoices", path: "/platform/invoices", icon: Receipt },
      { label: "Payments", path: "/platform/payments", icon: CreditCard },
    ],
  },
  {
    label: "More",
    items: [
      { label: "Analytics", path: "/platform/analytics", icon: TrendingUp },
      { label: "Comms", path: "/platform/communications", icon: MessageSquare },
      { label: "Tasks", path: "/platform/tasks", icon: ClipboardList },
      { label: "Settings", path: "/platform/settings", icon: Settings },
    ],
  },
];

interface Props {
  children: React.ReactNode;
}

export default function PlatformLayout({ children }: Props) {
  const auth = usePlatformAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Derive current page title from nav
  const currentPage = NAV_SECTIONS.flatMap(s => s.items).find(i => i.path === location.pathname);
  const pageTitle = currentPage?.label || "Platform";

  // Business context label
  const selectedBiz = auth.businesses.find(b => b.id === auth.selectedBusinessId);
  const contextLabel = selectedBiz ? selectedBiz.public_brand_name : "All Businesses";

  if (auth.loading) {
    return (
      <div className="ops-theme min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-body text-sm text-muted-foreground">Loading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-theme min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-card/80 backdrop-blur-xl border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-primary font-display text-xs font-bold tracking-tight">FS</span>
              </div>
              <div>
                <h2 className="font-display text-[13px] font-semibold text-foreground leading-tight tracking-tight">Field Ops</h2>
                <p className="font-body text-[10px] text-muted-foreground tracking-wide">Operations Platform</p>
              </div>
            </div>
            <button className="lg:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <BusinessSwitcher
            businesses={auth.businesses}
            selectedBusinessId={auth.selectedBusinessId}
            onSelect={auth.setSelectedBusinessId}
            isOwner={auth.isOwner}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "w-[18px] h-[18px] transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                      )} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 text-primary/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-display text-[10px] font-bold">
                {auth.userEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="font-body text-[11px] text-muted-foreground truncate flex-1">{auth.userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start font-body text-muted-foreground text-xs hover:text-destructive hover:bg-destructive/5 transition-colors"
            onClick={auth.signOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-md px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-primary lg:hidden transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Page context */}
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[15px] font-semibold text-foreground tracking-tight">{pageTitle}</h1>
            <span className="text-border">·</span>
            <span className="font-body text-[12px] text-muted-foreground">{contextLabel}</span>
          </div>

          <div className="flex-1" />
          
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/50">
            <Search className="w-4 h-4" />
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/50 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {/* Debug panel — dev only */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-2 right-2 z-[100] bg-card border border-border rounded-lg p-3 text-[10px] font-mono text-muted-foreground max-w-xs shadow-lg opacity-60 hover:opacity-100 transition-opacity">
          <p className="text-primary font-bold mb-1">🔧 Biz Context Debug</p>
          <p>Route: {location.pathname}</p>
          <p>Selected: {auth.selectedBusinessId || "ALL"}</p>
          <p>Biz: {contextLabel}</p>
          <p>Persisted: {typeof window !== 'undefined' ? localStorage.getItem('platform_selected_business') || "null" : "ssr"}</p>
          <p>Access: {auth.businesses.map(b => b.shortcode).join(", ")}</p>
        </div>
      )}
    </div>
  );
}
