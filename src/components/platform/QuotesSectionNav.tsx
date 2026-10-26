import { NavLink } from "react-router-dom";
import { FileText, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QuotesSectionNav() {
  return <nav aria-label="Quote sections" className="flex gap-1 rounded-xl border border-border bg-card p-1 mb-5">
    {[{ path: "/platform/quotes", title: "Customer Quotes", Icon: FileText }, { path: "/platform/arborist-quotes", title: "Arborist Quotes", Icon: Trees }].map(({ path, title, Icon }) =>
      <NavLink end key={path} to={path} className={({ isActive }) => cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors", isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
        <Icon className="h-4 w-4 shrink-0" /><span>{title}</span>
      </NavLink>)}
  </nav>;
}
