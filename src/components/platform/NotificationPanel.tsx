import { useState } from "react";
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
  Star, AlertCircle, Inbox, Check, X as XIcon,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, FileText, DollarSign, RefreshCw, AlertTriangle, Star, AlertCircle, Bell,
};

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
  const priorityColor =
    n.priority === "urgent" ? "text-destructive" :
    n.priority === "high" ? "text-primary" :
    "text-muted-foreground";

  return (
    <div
      onClick={() => onClick(n)}
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/40 border-l-2",
        n.is_read ? "border-transparent" : "border-primary bg-primary/[0.03]"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
        n.is_read ? "bg-secondary/60" : "bg-primary/10"
      )}>
        <Icon className={cn("w-4 h-4", priorityColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-body text-[13px] leading-tight tracking-tight",
            n.is_read ? "text-foreground/80 font-medium" : "text-foreground font-semibold"
          )}>
            {n.title}
          </p>
          <span className="font-body text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
            {relativeTime(n.created_at)}
          </span>
        </div>
        {n.body && (
          <p className="font-body text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
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
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">Notifications</h3>
          {unreadCount > 0 && (
            <p className="font-body text-[11px] text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="h-7 text-[11px] font-body text-muted-foreground hover:text-primary"
          >
            <Check className="w-3 h-3 mr-1" /> Mark all read
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-[60vh] lg:max-h-96">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-body text-[12px] text-muted-foreground leading-relaxed">
              No notifications yet. You'll see updates here when leads come in, quotes are approved, payments are received, and more.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map((n) => (
              <NotificationItem key={n.id} n={n} onClick={onItemClick} onArchive={onArchive} />
            ))}
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

  const handleItemClick = async (n: PlatformNotification) => {
    if (!n.is_read) await markAsRead(n.id);
    setOpen(false);
    if (n.link_url) navigate(n.link_url);
  };

  const badgeText = unreadCount === 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  const trigger = (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/50 relative"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="w-4 h-4" />
      {badgeText && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-display font-bold flex items-center justify-center leading-none">
          {badgeText}
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="top" className="h-[85vh] p-0 flex flex-col">
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
      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
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
