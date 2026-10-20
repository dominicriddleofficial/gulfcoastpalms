import { useEffect, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, format } from "date-fns";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { prefetchDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { CalendarDays } from "lucide-react";
import TodaySection from "@/components/platform/dashboard/TodaySection";
import ReliabilitySection from "@/components/platform/dashboard/ReliabilitySection";
import HeadlineSection from "@/components/platform/dashboard/HeadlineSection";
import UnpaidJobsTile from "@/components/platform/dashboard/UnpaidJobsTile";
import YearlyClientsTile from "@/components/platform/dashboard/YearlyClientsTile";
// Lazy-load the recharts-backed chart so the ~382KB chart chunk doesn't
// block the KPI cards from painting on dashboard open.
const ScheduledValueChart = lazy(
  () => import("@/components/platform/dashboard/ScheduledValueChart"),
);

function ScheduledValueChartSkeleton() {
  return (
    <div
      aria-hidden
      className="command-panel command-skeleton w-full"
      style={{ height: 430 }}
    />
  );
}

export default function PlatformDashboard() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const qc = useQueryClient();

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);

  // Warm the dashboard's week-range cache so HeadlineSection / ScheduledValueChart
  // hit a populated React Query cache instead of refetching on mount. Must match
  // the weekStartsOn used by those components (Monday).
  useEffect(() => {
    if (!selectedBusinessId) return;
    const now = new Date();
    prefetchDashboardScheduledJobs(qc, {
      businessId: selectedBusinessId,
      startDate: startOfWeek(now, { weekStartsOn: 1 }),
      endDate: endOfWeek(now, { weekStartsOn: 1 }),
    });
  }, [qc, selectedBusinessId]);

  return (
    <PlatformLayout>
      <div className="command-dashboard">
          <header className="command-heading">
            <div>
              <p className="command-eyebrow">Operations overview</p>
              <h1>Command Center</h1>
              <p className="command-subtitle">
                {selectedBiz?.public_brand_name ?? "All Businesses"} · Your business at a glance
              </p>
            </div>
            <div className="command-date">
              <CalendarDays className="h-3.5 w-3.5" />
              <time dateTime={format(new Date(), "yyyy-MM-dd")}>{format(new Date(), "EEE, MMM d, yyyy")}</time>
            </div>
          </header>

          <HeadlineSection />
          <div className="command-attention">
            <UnpaidJobsTile />
            <YearlyClientsTile />
          </div>
          <Suspense fallback={<ScheduledValueChartSkeleton />}>
            <ScheduledValueChart />
          </Suspense>
          <TodaySection />
          <ReliabilitySection />
      </div>
    </PlatformLayout>
  );
}
