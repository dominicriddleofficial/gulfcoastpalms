import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { cloneElement } from "react";
import type { DashboardScheduledJob } from "@/hooks/useDashboardScheduledJobs";

const state = vi.hoisted(() => ({
  pending: false, error: false, priorError: false,
  jobs: [] as DashboardScheduledJob[],
  refetch: vi.fn(), periods: [] as Array<{ startDate: Date; endDate: Date }>,
}));
vi.mock("@/hooks/usePlatformAuth", () => ({ usePlatformAuth: () => ({ selectedBusinessId: "gcp" }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isOwner: true }) }));
vi.mock("@/hooks/useDashboardScheduledJobs", () => ({
  useDashboardScheduledJobs: (opts: { startDate: Date; endDate: Date }) => {
    state.periods.push(opts);
    const prior = opts.endDate < new Date("2026-10-20T00:00:00");
    const jobs = prior ? [] : state.jobs;
    return { jobs, isPending: state.pending, isError: prior ? state.priorError : state.error,
      summary: { jobCount: jobs.length, revenueTotal: jobs.reduce((sum, j) => sum + j.amount_counted, 0) }, refetch: state.refetch };
  },
}));
vi.mock("recharts", async importOriginal => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => cloneElement(children, { width: 600, height: 220 } as object) };
});
import ScheduledValueChart from "@/components/platform/dashboard/ScheduledValueChart";

const job = (id: string, date: string, amount: number) => ({ id, job_id: id, visit_id: null, scheduled_local_date: date, amount_counted: amount, source: "platform" }) as DashboardScheduledJob;
const mount = () => render(<MemoryRouter><ScheduledValueChart /></MemoryRouter>);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-20T12:00:00")); Object.assign(state, { pending: false, error: false, priorError: false, jobs: [], periods: [] }); state.refetch.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Scheduled job value dashboard", () => {
  it("keeps loading and failed requests distinct from an empty schedule, and supports retry", () => {
    state.pending = true;
    const ui = mount();
    expect(screen.getByRole("status")).toHaveTextContent("Loading scheduled jobs");
    expect(document.querySelector('.command-chart-total')).toHaveTextContent("—");
    state.pending = false; state.error = true;
    ui.rerender(<MemoryRouter><ScheduledValueChart /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    expect(screen.queryByText("No jobs scheduled this week")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it("changes the actual query range when switching from week to month", () => {
    mount();
    expect(state.periods[0].startDate.getDate()).toBe(19);
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
    expect(state.periods.at(-2)?.startDate.getDate()).toBe(1);
    expect(state.periods.at(-2)?.endDate.getDate()).toBe(31);
    expect(screen.getByText("No jobs scheduled this month")).toBeInTheDocument();
  });
  it("reconciles fractional job prices across different days before rounding for display", () => {
    state.jobs = [job('a', '2026-10-19', 100.49), job('b', '2026-10-20', 100.49)];
    mount();
    expect(document.querySelector('.command-chart-total')).toHaveTextContent("$201");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("Oct 19");
  });
  it("keeps scheduled jobs with zero value visible", () => {
    state.jobs = [job('a', '2026-10-19', 0)];
    mount();
    expect(screen.queryByText("No jobs scheduled this week")).not.toBeInTheDocument();
    expect(document.querySelector('.command-chart-total')).toHaveTextContent("$0");
    expect(screen.getByText('Scheduled jobs').nextSibling).toHaveTextContent('1');
  });
  it("does not invent a previous-period comparison when that request fails", () => {
    state.jobs = [job('a', '2026-10-20', 250)]; state.priorError = true;
    mount();
    expect(screen.getByText("Previous-period comparison is unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("Last week")).not.toBeInTheDocument();
    expect(document.querySelector('.command-chart-total')).toHaveTextContent("$250");
  });
});
