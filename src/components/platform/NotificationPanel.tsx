import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type PlatformNotification } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Bell, Target, FileText, DollarSign, RefreshCw, AlertTriangle,
  Star, AlertCircle, Inbox, Check, X as XIcon, Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, FileText, DollarSign, RefreshCw, AlertTriangle, Star, AlertCircle, Bell,
};

// Type/priority-driven tinted tile treatment.
function tintForNotification(n: PlatformNotification): { bg: string; fg: string; ring: string; pulse: boolean } {
  const type = (n.type || "").toLowerCase();
  const icon = (n.icon || "").toLowerCase();
  // Payments — amber
  if (type.includes("payment") || type.includes("invoice_paid") || icon === "dollarsign") {
    return { bg: "rgba(245,158,11,0.14)", fg: "#fbbf24", ring: "rgba(245,158,11,0.30)", pulse: false };
  }
  // Leads — green with pulse
  if (type.includes("lead") || icon === "target") {
    return { bg: "rgba(var(--biz-accent-rgb),0.14)", fg: "var(--accent-color)", ring: "rgba(var(--biz-accent-rgb),0.30)", pulse: true };
  }
  // EOD / report — blue
  if (type.includes("eod") || type.includes("report") || type.includes("recurring")) {
    return { bg: "rgba(59,130,246,0.14)", fg: "#60a5fa", ring: "rgba(59,130,246,0.30)", pulse: false };
  }
  // Urgent / warnings — red
  if (n.priority === "urgent" || type.includes("alert") || icon === "alerttriangle" || icon === "alertcircle") {
    return { bg: "rgba(239,68,68,0.14)", fg: "#f87171", ring: "rgba(239,68,68,0.30)", pulse: false };
  }
  // System / default — gray
  return { bg: "rgba(255,255,255,0.06)", fg: "#e5e7eb", ring: "rgba(255,255,255,0.14)", pulse: false };
}

function dateBucket(iso: string): "today" | "earlier" {
  const t = new Date(iso).getTime();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return t >= startToday ? "today" : "earlier";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationItem({
  n, onClick, onArchive,
}: {
  n: PlatformNotification;
  onClick: (n: PlatformNotification) => void;
  onArchive: (id: string) => void;
}) {
  const Icon = ICON_MAP[n.icon || "Bell"] || Bell;
  const tint = tintForNotification(n);

  return (
    <div
      onClick={() => onClick(n)}
      className={cn(
        "group relative flex items-start gap-3 mx-2 my-1 rounded-xl px-3 py-2.5 cursor-pointer transition-all active:scale-[0.98]",
        "motion-safe:animate-fade-in",
        n.is_read
          ? "opacity-70 hover:opacity-100"
          : "hover:brightness-110"
      )}
      style={{
        background: n.is_read ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)",
        border: n.is_read
          ? "1px solid rgba(255,255,255,0.04)"
          : "1px solid rgba(var(--biz-accent-rgb),0.22)",
        boxShadow: n.is_read
          ? "none"
          : "inset 3px 0 0 0 var(--accent-color), 0 0 16px -8px rgba(var(--biz-accent-rgb),0.25)",
      }}
    >
      <span
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 relative"
        style={{ background: tint.bg, boxShadow: `inset 0 0 0 1px ${tint.ring}` }}
      >
        <Icon className="w-4 h-4" style={{ color: tint.fg }} />
        {tint.pulse && !n.is_read && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full motion-safe:animate-ping"
            style={{ background: "var(--accent-color)" }}
          />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "font-body text-[13px] leading-snug tracking-tight",
              n.is_read ? "text-foreground/80 font-medium" : "text-foreground font-semibold"
            )}
          >
            {n.title}
          </p>
          <span className="font-body text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 shrink-0">
            {relativeTime(n.created_at)}
          </span>
        </div>
        {n.body && (
          <p className="font-body text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2">
            {n.body}
          </p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onArchive(n.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
        aria-label="Archive notification"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function PanelContent({
  notifications, unreadCount, loading, onItemClick, onMarkAllRead, onArchive,
}: {
  notifications: PlatformNotification[];
  unreadCount: number;
  loading: boolean;
  onItemClick: (n: PlatformNotification) => void;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
}) {
  const today = notifications.filter((n) => dateBucket(n.created_at) === "today");
  const earlier = notifications.filter((n) => dateBucket(n.created_at) === "earlier");
  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-display text-[13px] font-semibold text-foreground tracking-tight">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-display font-bold leading-none"
              style={{
                color: "var(--accent-color)",
                background: "rgba(var(--biz-accent-rgb),0.14)",
                border: "1px solid rgba(var(--biz-accent-rgb),0.30)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="h-7 text-[11px] font-body text-muted-foreground hover:bg-white/5"
            style={{ color: "var(--accent-color)" }}
          >
            <Check className="w-3 h-3 mr-1" /> Mark all read
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-[65vh] lg:max-h-[28rem]">
        {loading ? (
          <div className="p-2 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mx-2 flex items-start gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div
              className="mx-auto w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(var(--biz-accent-rgb),0.10)", border: "1px solid rgba(var(--biz-accent-rgb),0.20)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
            </div>
            <p className="font-display text-[13px] font-semibold text-foreground">You're all caught up.</p>
            <p className="font-body text-[11.5px] text-muted-foreground mt-1 leading-relaxed max-w-[240px] mx-auto">
              Leads, approvals, and payments will land here as they happen.
            </p>
          </div>
        ) : (
          <div className="py-2 space-y-3">
            {today.length > 0 && (
              <div>
                <p
                  className="px-4 pb-1 font-display font-semibold uppercase"
                  style={{ fontSize: "9.5px", letterSpacing: "0.14em", color: "hsl(220 8% 45%)" }}
                >
                  Today
                </p>
                {today.map((n) => (
                  <NotificationItem key={n.id} n={n} onClick={onItemClick} onArchive={onArchive} />
                ))}
              </div>
            )}
            {earlier.length > 0 && (
              <div>
                <p
                  className="px-4 pb-1 font-display font-semibold uppercase"
                  style={{ fontSize: "9.5px", letterSpacing: "0.14em", color: "hsl(220 8% 45%)" }}
                >
                  Earlier
                </p>
                {earlier.map((n) => (
                  <NotificationItem key={n.id} n={n} onClick={onItemClick} onArchive={onArchive} />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

export default function NotificationPanel() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, archive } = useNotifications();

  // Subtle ring pulse when a new notification arrives while the bell is idle.
  const prevUnread = useRef(unreadCount);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (unreadCount > prevUnread.current && !open) {
      setPulseKey((k) => k + 1);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, open]);

  const handleItemClick = async (n: PlatformNotification) => {
    if (!n.is_read) await markAsRead(n.id);
    setOpen(false);
    if (n.link_url) navigate(n.link_url);
  };

  const badgeText = unreadCount === 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  const trigger = (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/5 relative"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="w-4 h-4" />
      {badgeText && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-display font-bold flex items-center justify-center leading-none"
          style={{
            color: "var(--accent-color)",
            background: "rgba(var(--biz-accent-rgb),0.16)",
            border: "1px solid rgba(var(--biz-accent-rgb),0.45)",
            boxShadow: "0 0 10px -2px rgba(var(--biz-accent-rgb),0.55)",
          }}
        >
          {badgeText}
        </span>
      )}
      {badgeText && pulseKey > 0 && (
        <span
          key={pulseKey}
          className="absolute inset-0 rounded-lg pointer-events-none motion-safe:animate-ping"
          style={{ boxShadow: "0 0 0 2px rgba(var(--biz-accent-rgb),0.45)", animationDuration: "1.2s", animationIterationCount: 2 }}
          aria-hidden
        />
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="top"
          className="h-[85vh] p-0 flex flex-col motion-safe:animate-fade-in"
          style={{
            background: "rgba(14,17,15,0.98)",
            borderBottom: "1px solid rgba(var(--biz-accent-rgb),0.14)",
            backdropFilter: "blur(12px)",
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <PanelContent
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            onItemClick={handleItemClick}
            onMarkAllRead={markAllAsRead}
            onArchive={archive}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[400px] p-0 motion-safe:animate-fade-in"
        sideOffset={10}
        style={{
          background: "rgba(14,17,15,0.96)",
          border: "1px solid rgba(var(--biz-accent-rgb),0.14)",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <PanelContent
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onItemClick={handleItemClick}
          onMarkAllRead={markAllAsRead}
          onArchive={archive}
        />
      </PopoverContent>
    </Popover>
  );
}
