import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfWeek, endOfWeek } from "date-fns";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { prefetchDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import TodaySection from "@/components/platform/dashboard/TodaySection";
import ReliabilitySection from "@/components/platform/dashboard/ReliabilitySection";
import QuickActionsBar from "@/components/platform/dashboard/QuickActionsBar";
import HeadlineSection from "@/components/platform/dashboard/HeadlineSection";
import ScheduledValueChart from "@/components/platform/dashboard/ScheduledValueChart";

export default function PlatformDashboard() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const qc = useQueryClient();

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);

  // Warm the Schedule page cache so tapping the bottom-nav Schedule tab is instant.
  // Matches PlatformSchedule's Sunday-Saturday week range.
  useEffect(() => {
    if (!selectedBusinessId) return;
    const now = new Date();
    prefetchDashboardScheduledJobs(qc, {
      businessId: selectedBusinessId,
      startDate: startOfWeek(now, { weekStartsOn: 0 }),
      endDate: endOfWeek(now, { weekStartsOn: 0 }),
    });
  }, [qc, selectedBusinessId]);

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
                  {selectedBiz?.public_brand_name ?? "All Businesses"} · Platform schedule
                </p>
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
