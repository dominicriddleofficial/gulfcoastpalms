import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const QUESTIONS: { key: string; label: string }[] = [
  { key: "q1", label: "All new leads responded to same day" },
  { key: "q2", label: "All calls returned (voicemail if no answer)" },
  { key: "q3", label: "All Messenger messages replied" },
  { key: "q4", label: "All texts replied (SimpleTexting + SMS)" },
  { key: "q5", label: "No customers waiting on a response" },
  { key: "q6", label: "No follow-ups left sitting" },
  { key: "q7", label: "Tomorrow's jobs confirmed with customers" },
  { key: "q8", label: "Asked today's customers for a review" },
  { key: "q9", label: "Reached out to previous customers to book this year" },
];

function todayCT(): string {
  const now = new Date();
  const ct = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  return format(ct, "yyyy-MM-dd");
}

interface EodRow {
  id: string;
  business_id: string;
  report_date: string;
  submitted_at: string;
  answers: Record<string, boolean>;
  notes: string | null;
}

export default function PlatformEODReport() {
  const { selectedBusinessId, userId } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const qc = useQueryClient();
  const today = todayCT();

  const { data: todayReport, isLoading } = useQuery({
    queryKey: ["eod-report", selectedBusinessId, today],
    queryFn: async (): Promise<EodRow | null> => {
      if (!selectedBusinessId) return null;
      const { data } = await supabase
        .from("eod_reports")
        .select("*")
        .eq("business_id", selectedBusinessId)
        .eq("report_date", today)
        .maybeSingle();
      return (data as EodRow | null) ?? null;
    },
    enabled: !!selectedBusinessId,
  });

  const { data: history } = useQuery({
    queryKey: ["eod-report-history", selectedBusinessId],
    queryFn: async (): Promise<EodRow[]> => {
      if (!selectedBusinessId) return [];
      const { data } = await supabase
        .from("eod_reports")
        .select("*")
        .eq("business_id", selectedBusinessId)
        .order("report_date", { ascending: false })
        .limit(30);
      return (data as EodRow[]) ?? [];
    },
    enabled: !!selectedBusinessId,
  });

  const [answers, setAnswers] = useState<Record<string, boolean | null>>(() => {
    const init: Record<string, boolean | null> = {};
    for (const q of QUESTIONS) init[q.key] = null;
    return init;
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Preload from today's report if present
  useMemo(() => {
    if (todayReport) {
      setAnswers({ ...todayReport.answers });
      setNotes(todayReport.notes ?? "");
    }
  }, [todayReport]);

  const alreadySubmitted = Boolean(todayReport);

  const submit = async () => {
    if (!selectedBusinessId) return;
    for (const q of QUESTIONS) {
      if (answers[q.key] === null) {
        toast.error(`Please answer: ${q.label}`);
        return;
      }
    }
    setSaving(true);
    const cleanAnswers: Record<string, boolean> = {};
    for (const q of QUESTIONS) cleanAnswers[q.key] = Boolean(answers[q.key]);

    const { error } = await supabase.from("eod_reports").upsert(
      {
        business_id: selectedBusinessId,
        report_date: today,
        submitted_by: userId,
        submitted_at: new Date().toISOString(),
        answers: cleanAnswers,
        notes: notes.trim() || null,
      },
      { onConflict: "business_id,report_date" },
    );
    setSaving(false);
    if (error) {
      toast.error("Could not submit report", { description: error.message });
      return;
    }
    toast.success("EOD report submitted");
    qc.invalidateQueries({ queryKey: ["eod-report", selectedBusinessId, today] });
    qc.invalidateQueries({ queryKey: ["eod-report-history", selectedBusinessId] });
  };

  return (
    <PlatformLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              End of Day Report
            </h1>
          </div>
          <p className="mt-1 font-body text-[14px] text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")} · {alreadySubmitted ? "Submitted" : "Not yet submitted"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {QUESTIONS.map((q, idx) => {
            const val = answers[q.key];
            return (
              <div key={q.key} className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-b-0">
                <p className="font-body text-[15px] text-foreground flex-1">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                  {q.label}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: true }))}
                    className={cn(
                      "min-w-[70px] px-4 py-2 rounded-xl font-body font-bold text-[13px] uppercase tracking-wide transition-all",
                      val === true
                        ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60",
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: false }))}
                    className={cn(
                      "min-w-[70px] px-4 py-2 rounded-xl font-body font-bold text-[13px] uppercase tracking-wide transition-all",
                      val === false
                        ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/50"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60",
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <label className="block font-body text-[12px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Notes (explain any No)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes on what carried over, blockers, wins, etc."
              className="bg-background/60 border-border text-foreground"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full min-h-[54px] rounded-2xl bg-primary text-primary-foreground font-body font-bold text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Submitting…" : alreadySubmitted ? "Update report" : "Submit report"}
          </button>
        </div>

        {isOwner && history && history.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold text-foreground mb-3">History</h2>
            <div className="space-y-2">
              {history.map((r) => {
                const answersMap = r.answers as Record<string, boolean>;
                const nos = QUESTIONS.filter((q) => answersMap[q.key] === false);
                const allYes = nos.length === 0;
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    {allYes ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[14px] font-semibold text-foreground">
                        {format(new Date(r.report_date + "T12:00:00"), "EEE, MMM d")}
                        {" · "}
                        {allYes ? (
                          <span className="text-emerald-400">All Yes</span>
                        ) : (
                          <span className="text-red-400">
                            {nos.length} {nos.length === 1 ? "No" : "Nos"}
                          </span>
                        )}
                      </p>
                      {!allYes && (
                        <p className="mt-1 font-body text-[12px] text-muted-foreground">
                          {nos.map((n) => n.label).join(" · ")}
                        </p>
                      )}
                      {r.notes && (
                        <p className="mt-1 font-body text-[13px] text-foreground/80 whitespace-pre-wrap">
                          {r.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}