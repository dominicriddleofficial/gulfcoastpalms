import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Briefcase, UserCheck, Star, Trophy,
  Upload, LogOut, Menu, X, FileText, ClipboardList, ChevronRight,
  TrendingUp, UsersRound, RefreshCw, AlertTriangle, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Leads", path: "/admin/leads", icon: ClipboardList },
  { label: "Clients", path: "/admin/clients", icon: Users },
  { label: "Jobs", path: "/admin/jobs", icon: Briefcase },
  { label: "Performance", path: "/admin/performance", icon: TrendingUp },
  { label: "Reviews", path: "/admin/reviews", icon: Star },
  { label: "Leaderboards", path: "/admin/leaderboards", icon: Trophy },
  { label: "Crews", path: "/admin/crews", icon: UsersRound },
  { label: "Recurring", path: "/admin/recurring", icon: RefreshCw },
  { label: "Job Issues", path: "/admin/job-issues", icon: AlertTriangle },
  { label: "Uploads", path: "/admin/uploads", icon: Upload },
  { label: "SOPs", path: "/admin/sop-acknowledgments", icon: FileText },
  { label: "Errors", path: "/admin/errors", icon: AlertTriangle },
  { label: "Admin", path: "/admin/settings", icon: Settings },
];

type UserRole = "admin" | "operations" | "team_leader" | "limited_staff" | "user";

const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin: NAV_ITEMS.map((i) => i.path),
  operations: ["/admin", "/admin/leads", "/admin/clients", "/admin/jobs", "/admin/performance", "/admin/reviews", "/admin/leaderboards", "/admin/crews", "/admin/recurring"],
  team_leader: ["/admin", "/admin/jobs", "/admin/reviews", "/admin/leaderboards", "/admin/crews"],
  limited_staff: ["/admin"],
  user: ["/admin"],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/login"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.length) { navigate("/admin/login"); return; }
    const role = roles[0].role as UserRole;
    setUserRole(role);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const allowedPaths = ROLE_ACCESS[userRole] || [];
  const visibleNav = NAV_ITEMS.filter((item) => allowedPaths.includes(item.path));

  if (loading) return <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Gulf Coast Palms</h2>
            <p className="font-body text-[10px] text-muted-foreground capitalize">{userRole.replace("_", " ")} Panel</p>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[13px] transition-colors",
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

        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start font-body text-muted-foreground text-xs" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold">Admin</h1>
        </header>
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
