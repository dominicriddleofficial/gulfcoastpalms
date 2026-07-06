import { useMemo, useState } from "react";
import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
  subDays,
  differenceInMinutes,
} from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Truck,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCSV } from "@/lib/finance";
import { parseDateOnlyLocal } from "@/lib/localDate";
import { useTimesheets, type TimesheetRow, type TimesheetStatus } from "@/hooks/useTimesheets";
import { TimesheetDetailSheet } from "./TimesheetDetailSheet";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type RangeMode = "day" | "week" | "pay";

const STATUS_META: Record<TimesheetStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-primary/15 text-primary" },
  clocked_out: { label: "Clocked Out", cls: "bg-secondary text-foreground/70" },
  needs_review: { label: "Needs Review", cls: "bg-amber-500/15 text-amber-400" },
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400" },
  exported: { label: "Exported", cls: "bg-blue-500/15 text-blue-400" },
  edited: { label: "Edited by Admin", cls: "bg-purple-500/15 text-purple-300" },
};

function fmtHours(min: number): string {
  return `${(min / 60).toFixed(1)}h`;
}

export function TimesheetsView({
  businessId,
  onClose,
}: {
  businessId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<RangeMode>("week");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (mode === "day") return { from: startOfDay(anchor), to: endOfDay(anchor) };
    if (mode === "week")
      return {
        from: startOfWeek(anchor, { weekStartsOn: 1 }),
        to: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    // pay period: 14-day window ending today
    return { from: subDays(startOfDay(anchor), 13), to: endOfDay(anchor) };
  }, [mode, anchor]);

  const { data: rows = [], isLoading, refetch } = useTimesheets({
    businessId,
    from: range.from,
    to: range.to,
    employeeId,
  });

  const employees = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.employee_user_id, r.employee_name ?? r.employee_email ?? "Unknown");
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = rows; // employee filter already applied at query level

  const totals = useMemo(() => {
    const acc = { total: 0, site: 0, drive: 0, idle: 0, jobs: 0 };
    for (const r of filtered) {
      acc.total += r.total_minutes;
      acc.site += r.job_site_minutes;
      acc.drive += r.drive_minutes;
      acc.idle += r.idle_minutes;
      acc.jobs += r.jobs_completed;
    }
    return acc;
  }, [filtered]);

  const shiftAnchor = (dir: 1 | -1) => {
    if (mode === "day") setAnchor((d) => addDays(d, dir));
    else if (mode === "week") setAnchor((d) => addDays(d, 7 * dir));
    else setAnchor((d) => addDays(d, 14 * dir));
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const data = filtered.map((r) => ({
      Date: r.schedule_date,
      Employee: r.employee_name ?? r.employee_email ?? r.employee_user_id,
      Vehicle: r.vehicle_name ?? "",
      "Clock In": format(new Date(r.clock_in_at), "yyyy-MM-dd HH:mm"),
      "Clock Out": r.clock_out_at
        ? format(new Date(r.clock_out_at), "yyyy-MM-dd HH:mm")
        : "",
      "Total Hours": (r.total_minutes / 60).toFixed(2),
      "Job-Site Hours": (r.job_site_minutes / 60).toFixed(2),
      "Drive Hours": (r.drive_minutes / 60).toFixed(2),
      "Idle Hours": (r.idle_minutes / 60).toFixed(2),
      "Jobs Completed": r.jobs_completed,
      Notes: r.notes_count,
      Status: STATUS_META[r.status].label,
      Overtime: r.overtime_flag ? "Yes" : "",
      "Approved By": r.approved_by ?? "",
      "Approved At": r.approved_at ?? "",
      "Admin Edits": r.edits_count,
    }));
    downloadCSV(
      `timesheets_${format(range.from, "yyyy-MM-dd")}_to_${format(range.to, "yyyy-MM-dd")}.csv`,
      data,
    );
    toast.success(`Exported ${filtered.length} timesheet${filtered.length === 1 ? "" : "s"}`);
  };

  const markPaid = async (row: TimesheetRow) => {
    const { error } = await supabase
      .from("platform_clock_sessions")
      .update({ exported_at: new Date().toISOString() })
      .eq("id", row.session_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as exported");
    qc.invalidateQueries({ queryKey: ["timesheets"] });
  };

  const approve = async (row: TimesheetRow) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("platform_clock_sessions")
      .update({
        approval_status: "approved",
        approved_by: u.user?.id ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", row.session_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Timesheet approved");
    qc.invalidateQueries({ queryKey: ["timesheets"] });
  };

  const rangeLabel =
    mode === "day"
      ? format(range.from, "EEE, MMM d, yyyy")
      : `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Crew
        </button>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div>
        <h2 className="font-display text-xl font-extrabold text-foreground">Timesheets</h2>
        <p className="font-body text-xs text-muted-foreground">
          Review, edit, approve and export crew clock sessions.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-1 bg-card border border-border rounded-xl p-1">
        {(["day", "week", "pay"] as RangeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "py-2 rounded-lg text-xs font-body font-bold uppercase tracking-wider transition-colors",
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "day" ? "Day" : m === "week" ? "Week" : "Pay Period"}
          </button>
        ))}
      </div>

      {/* Range nav */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-2 gap-2">
        <button
          onClick={() => shiftAnchor(-1)}
          className="p-2 rounded-lg hover:bg-secondary text-foreground/70"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAnchor(new Date())}
          className="flex-1 text-center font-display text-sm font-extrabold truncate"
        >
          {rangeLabel}
        </button>
        <button
          onClick={() => shiftAnchor(1)}
          className="p-2 rounded-lg hover:bg-secondary text-foreground/70"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Employee filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setEmployeeId(null)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-bold border",
            !employeeId
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All employees
        </button>
        {employees.map((e) => (
          <button
            key={e.id}
            onClick={() => setEmployeeId(e.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-bold border",
              employeeId === e.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Total", value: fmtHours(totals.total) },
          { label: "Job-Site", value: fmtHours(totals.site) },
          { label: "Drive", value: fmtHours(totals.drive) },
          { label: "Idle", value: fmtHours(totals.idle) },
          { label: "Jobs", value: String(totals.jobs) },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="font-display text-xl font-extrabold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 bg-card border border-border rounded-2xl">
          <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-body text-sm text-muted-foreground">
            No timesheets in this range.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <button
                key={r.session_id}
                onClick={() => setOpenSessionId(r.session_id)}
                className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-extrabold truncate">
                      {r.employee_name ?? r.employee_email ?? "Unknown"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground font-body">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(r.schedule_date), "EEE, MMM d")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(r.clock_in_at), "h:mm a")} –{" "}
                        {r.clock_out_at
                          ? format(new Date(r.clock_out_at), "h:mm a")
                          : "active"}
                      </span>
                      {r.vehicle_name && (
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {r.vehicle_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-body font-bold",
                        meta.cls,
                      )}
                    >
                      {meta.label}
                    </span>
                    {r.overtime_flag && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-body font-bold text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> OT
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[
                    { label: "Total", v: fmtHours(r.total_minutes) },
                    { label: "Site", v: fmtHours(r.job_site_minutes) },
                    { label: "Drive", v: fmtHours(r.drive_minutes) },
                    { label: "Idle", v: fmtHours(r.idle_minutes) },
                    { label: "Jobs", v: String(r.jobs_completed) },
                  ].map((c) => (
                    <div key={c.label} className="bg-secondary/30 rounded-lg py-1.5">
                      <p className="font-display text-sm font-extrabold tabular-nums">{c.v}</p>
                      <p className="font-body text-[9px] uppercase text-muted-foreground tracking-wider">
                        {c.label}
                      </p>
                    </div>
                  ))}
                </div>

                {(r.status === "clocked_out" || r.status === "needs_review" || r.status === "edited") && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        approve(r);
                      }}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                  </div>
                )}
                {r.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-9 gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      markPaid(r);
                    }}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Mark Paid / Exported
                  </Button>
                )}
              </button>
            );
          })}
        </div>
      )}

      <TimesheetDetailSheet
        sessionId={openSessionId}
        onClose={() => setOpenSessionId(null)}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["timesheets"] });
          refetch();
        }}
      />
    </div>
  );
}