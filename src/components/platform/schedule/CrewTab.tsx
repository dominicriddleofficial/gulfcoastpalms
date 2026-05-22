import { format, formatDistanceToNowStrict } from "date-fns";
import { Truck, MapPin, Clock, CheckCircle2, User as UserIcon, Users } from "lucide-react";
import { useCrewToday, type CrewMember } from "@/hooks/useCrewToday";
import { cn } from "@/lib/utils";

type Status =
  | "not_clocked_in"
  | "clocked_in"
  | "driving"
  | "on_site"
  | "job_in_progress"
  | "break_idle"
  | "clocked_out";

function deriveStatus(m: CrewMember): Status {
  if (m.clock_out_at) return "clocked_out";
  if (m.active_job_id) return "job_in_progress";
  if (m.last_speed && m.last_speed > 2.2) return "driving"; // ~5 mph in m/s
  if (m.last_gps_at) {
    const age = Date.now() - new Date(m.last_gps_at).getTime();
    if (age > 10 * 60_000) return "break_idle";
  }
  return "clocked_in";
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  not_clocked_in: { label: "Not Clocked In", cls: "bg-muted text-muted-foreground" },
  clocked_in:     { label: "Clocked In",     cls: "bg-primary/15 text-primary" },
  driving:        { label: "Driving",        cls: "bg-blue-500/15 text-blue-400" },
  on_site:        { label: "On Site",        cls: "bg-sky-500/15 text-sky-400" },
  job_in_progress:{ label: "Job In Progress",cls: "bg-orange-500/15 text-orange-400" },
  break_idle:     { label: "Break / Idle",   cls: "bg-amber-500/15 text-amber-400" },
  clocked_out:    { label: "Clocked Out",    cls: "bg-secondary text-foreground/70" },
};

export function CrewTab({
  businessId,
  date,
  scheduledJobCount,
  onViewOnMap,
}: {
  businessId: string | null;
  date: Date;
  scheduledJobCount: number;
  onViewOnMap?: (member: CrewMember) => void;
}) {
  const { data, isLoading } = useCrewToday(businessId, date);
  const members = data?.members ?? [];
  const summary = data?.summary;

  const jobsCompleted = summary?.jobsCompleted ?? 0;
  const jobsRemaining = Math.max(0, scheduledJobCount - jobsCompleted);

  const stats = [
    { label: "Clocked In",      value: summary?.clockedIn ?? 0,  icon: Users },
    { label: "Clocked Out",     value: summary?.clockedOut ?? 0, icon: UserIcon },
    { label: "Jobs Completed",  value: jobsCompleted,            icon: CheckCircle2 },
    { label: "Jobs Remaining",  value: jobsRemaining,            icon: Clock },
    { label: "Crew Hours",      value: summary?.totalHours ?? 0, icon: Clock },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <s.icon className="w-3.5 h-3.5" />
              <span className="font-body text-[10px] uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="font-display text-2xl font-extrabold text-foreground tabular-nums mt-0.5">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-10 bg-card border border-border rounded-2xl">
          <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-body text-sm text-muted-foreground">
            No crew clocked in for {format(date, "MMM d")}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const status = deriveStatus(m);
            const meta = STATUS_META[status];
            const minutes = m.clock_out_at
              ? m.total_minutes ?? 0
              : Math.round((Date.now() - new Date(m.clock_in_at).getTime()) / 60_000);
            const hours = (minutes / 60).toFixed(1);

            return (
              <div key={m.session_id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-extrabold text-foreground truncate">
                      {m.display_name ?? m.email ?? "Crew member"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-body">
                      {m.vehicle_name && (
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {m.vehicle_name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        In {format(new Date(m.clock_in_at), "h:mm a")}
                      </span>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-body font-bold", meta.cls)}>
                    {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-secondary/30 rounded-lg py-2">
                    <p className="font-display text-base font-extrabold tabular-nums">{hours}h</p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Hours</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg py-2">
                    <p className="font-display text-base font-extrabold tabular-nums">{m.completed_jobs}</p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Done</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg py-2">
                    <p className="font-body text-[11px] font-bold truncate px-1">
                      {m.last_gps_at
                        ? formatDistanceToNowStrict(new Date(m.last_gps_at), { addSuffix: true })
                        : "—"}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Last ping</p>
                  </div>
                </div>

                {m.last_lat !== null && m.last_lng !== null && (
                  <button
                    type="button"
                    onClick={() => onViewOnMap?.(m)}
                    className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-secondary/40 text-foreground font-body font-semibold text-sm hover:bg-secondary/70 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    View on Map
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CrewTab;