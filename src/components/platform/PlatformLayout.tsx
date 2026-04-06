import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import BusinessSwitcher from "./BusinessSwitcher";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, FileText, Briefcase, CalendarDays, Receipt,
  CreditCard, MessageSquare, ClipboardList, Settings, LogOut, Menu, X,
  Search, Bell, TrendingUp, Target,
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
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display text-xs font-bold">FS</span>
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground leading-tight">Field Ops</h2>
                <p className="font-body text-[10px] text-muted-foreground">Multi-Business Platform</p>
              </div>
            </div>
            <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <BusinessSwitcher
            businesses={auth.businesses}
            selectedBusinessId={auth.selectedBusinessId}
            onSelect={auth.setSelectedBusinessId}
            isOwner={auth.isOwner}
          />
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 py-1 font-body text-[10px] uppercase tracking-wider text-muted-foreground/70">
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
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-sm transition-all",
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <p className="font-body text-[11px] text-muted-foreground truncate px-1">{auth.userEmail}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start font-body text-muted-foreground text-xs hover:text-primary" onClick={auth.signOut}>
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-primary lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="text-muted-foreground hover:text-primary">
            <Search className="w-5 h-5" />
          </button>
          <button className="text-muted-foreground hover:text-primary relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
          </button>
        </header>
        <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
