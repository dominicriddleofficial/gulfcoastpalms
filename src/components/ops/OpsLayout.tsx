import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOpsAuth, OpsRole } from "@/hooks/useOpsAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Calendar, CalendarDays, Users, Settings,
  LogOut, Menu, X, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/ops", icon: LayoutDashboard },
  { label: "Today", path: "/ops/today", icon: Calendar },
  { label: "Week", path: "/ops/week", icon: CalendarDays },
  { label: "Crew", path: "/ops/crew", icon: Users },
  { label: "Settings", path: "/ops/settings", icon: Settings },
];

const ROLE_ACCESS: Record<OpsRole, string[]> = {
  admin: NAV_ITEMS.map(i => i.path),
  manager: ["/ops", "/ops/today", "/ops/week", "/ops/crew"],
  operations: ["/ops", "/ops/today", "/ops/week", "/ops/crew"],
  team_leader: ["/ops", "/ops/today", "/ops/week", "/ops/crew"],
  limited_staff: ["/ops/today"],
  user: [],
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { loading, userRole, userEmail, signOut, isRookie } = useOpsAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const allowedPaths = ROLE_ACCESS[userRole] || [];
  const visibleNav = NAV_ITEMS.filter(item => allowedPaths.includes(item.path));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-body text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Rookies get a simplified single-page layout
  if (isRookie) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-sm font-bold">GC</span>
            </div>
            <span className="font-display text-base font-bold text-foreground">Today's Schedule</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
        <main className="p-4 max-w-3xl mx-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-56 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-xs font-bold">GCP</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-foreground leading-tight">Operations</h2>
              <p className="font-body text-[10px] text-muted-foreground capitalize">{userRole.replace("_", " ")}</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-body text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <p className="font-body text-[11px] text-muted-foreground truncate px-1">{userEmail}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start font-body text-muted-foreground text-xs" onClick={signOut}>
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 lg:hidden sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold flex-1">Operations</h1>
        </header>
        <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
