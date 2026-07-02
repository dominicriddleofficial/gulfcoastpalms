import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-4 md:p-5 space-y-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
      }}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3
            className="font-display font-semibold tracking-tight"
            style={{ color: "#fff", fontSize: "14px" }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="font-body"
              style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function MetricTile({
  label,
  value,
  to,
  intent = "neutral",
  hint,
  loading,
}: {
  label: string;
  value: string | number;
  to?: string;
  intent?: "neutral" | "warn" | "bad" | "good";
  hint?: string;
  loading?: boolean;
}) {
  const valueColor =
    intent === "bad"
      ? "#ef4444"
      : intent === "warn"
        ? "#f59e0b"
        : intent === "good"
          ? "var(--accent-color)"
          : "#fff";

  const inner = (
    <div
      className="rounded-xl p-3 transition-colors h-full"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
      }}
    >
      <div
        className="font-body uppercase"
        style={{
          fontSize: "9.5px",
          letterSpacing: "0.14em",
          color: "hsl(220 8% 55%)",
        }}
      >
        {label}
      </div>
      <div
        className="font-display font-bold mt-1.5"
        style={{ fontSize: "22px", color: valueColor, letterSpacing: "-0.02em" }}
      >
        {loading ? "—" : value}
      </div>
      {hint && (
        <div
          className="font-body mt-1 truncate"
          style={{ fontSize: "10.5px", color: "hsl(220 8% 50%)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="block focus:outline-none">
      {inner}
    </Link>
  );
}

export function StatusDot({
  status,
}: {
  status: "ok" | "warn" | "fail" | "unknown";
}) {
  const color =
    status === "ok"
      ? "var(--accent-color)"
      : status === "warn"
        ? "#f59e0b"
        : status === "fail"
          ? "#ef4444"
          : "hsl(220 8% 40%)";
  return (
    <span
      aria-label={status}
      className="inline-block rounded-full"
      style={{
        width: 8,
        height: 8,
        background: color,
        boxShadow: `0 0 0 3px ${color}22`,
      }}
    />
  );
}

export function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-white/5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.16)",
      }}
    >
      <Icon
        className="w-4 h-4"
        style={{ color: "rgba(var(--biz-accent-rgb),0.85)" }}
      />
      <span
        className="font-body font-medium"
        style={{ fontSize: "12px", color: "#fff" }}
      >
        {label}
      </span>
    </Link>
  );
}

export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `$${Math.round(v).toLocaleString("en-US")}`;
}