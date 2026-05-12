import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import TodaySection from "@/components/platform/dashboard/TodaySection";
import ReliabilitySection from "@/components/platform/dashboard/ReliabilitySection";
import QuickActionsBar from "@/components/platform/dashboard/QuickActionsBar";
import HeadlineSection from "@/components/platform/dashboard/HeadlineSection";
import ScheduledValueChart from "@/components/platform/dashboard/ScheduledValueChart";

export default function PlatformDashboard() {
  const {
    selectedBusinessId,
    businesses,
    userId,
    loading: authLoading,
  } = usePlatformAuth();
  const queriesReady = !authLoading && !!userId && !!selectedBusinessId;

  const { data: lastSyncTime } = useQuery({
    queryKey: ["dashboard-last-sync"],
    enabled: queriesReady,
    queryFn: async () => {
      const { data } = await supabase
        .from("sync_logs")
        .select("completed_at")
        .eq("status", "success")
        .in("sync_type", ["full", "jobs", "visits"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.completed_at ?? null;
    },
  });

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);
  const syncInfo = (() => {
    if (!lastSyncTime) return { label: "waiting for first sync", stale: true };
    const diffMs = Date.now() - new Date(lastSyncTime).getTime();
    const mins = Math.round(diffMs / 60000);
    const stale = mins > 120;
    let label: string;
    if (mins < 1) label = "just now";
    else if (mins < 60) label = `${mins}m ago`;
    else if (mins < 48 * 60) label = `${Math.round(mins / 60)}h ago`;
    else label = `${Math.round(mins / 1440)}d ago`;
    return { label, stale };
  })();

  return (
    <PlatformLayout>
      <div
        className="platform-dashboard-bg -m-4 md:-m-6 p-4 md:p-6"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(var(--biz-accent-rgb), 0.28) 0%, rgba(var(--biz-accent-rgb), 0.08) 45%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 15% 40%, rgba(var(--biz-accent-rgb), 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 35% 25% at 85% 20%, rgba(var(--biz-accent-rgb), 0.10) 0%, transparent 55%),
            var(--biz-background-hex)
          `,
        }}
      >
        <div className="space-y-5 max-w-7xl mx-auto">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1
                className="font-display font-bold"
                style={{
                  fontSize: "28px",
                  letterSpacing: "-0.02em",
                  color: "#fff",
                }}
              >
                Command Center
              </h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {selectedBiz && (
                  <InlineBadge
                    shortcode={selectedBiz.shortcode}
                    color={selectedBiz.default_business_color}
                  />
                )}
                <p
                  className="font-body"
                  style={{ fontSize: "13px", color: "hsl(220 8% 50%)" }}
                >
                  {selectedBiz?.public_brand_name ?? "All Businesses"} · Last
                  synced {syncInfo.label}
                </p>
                {syncInfo.stale && (
                  <span
                    className="font-body uppercase rounded-md px-2 py-0.5"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      color: "#f59e0b",
                      background: "rgba(245,158,11,0.10)",
                      border: "1px solid rgba(245,158,11,0.35)",
                    }}
                  >
                    Sync stale
                  </span>
                )}
              </div>
            </div>
          </header>

          <HeadlineSection />
          <ScheduledValueChart />
          <TodaySection />
          <QuickActionsBar />
          <ReliabilitySection />
        </div>
      </div>
    </PlatformLayout>
  );
}
