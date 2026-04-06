import { cn } from "@/lib/utils";

interface CrewStripProps {
  crewNames: string[];
  crewCounts: Record<string, number>;
  selectedCrew: string | null;
  onSelectCrew: (crew: string | null) => void;
  totalJobs: number;
}

export default function CrewStrip({ crewNames, crewCounts, selectedCrew, onSelectCrew, totalJobs }: CrewStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      <button
        onClick={() => onSelectCrew(null)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl font-body text-sm whitespace-nowrap transition-all shrink-0",
          !selectedCrew
            ? "bg-primary/15 text-primary border border-primary/30"
            : "bg-card border border-border text-foreground hover:border-primary/20"
        )}
      >
        <span className="font-semibold">All</span>
        <span className={cn("text-xs font-mono", !selectedCrew ? "text-primary/80" : "text-muted-foreground")}>
          {totalJobs}
        </span>
      </button>
      {crewNames.map(name => (
        <button
          key={name}
          onClick={() => onSelectCrew(selectedCrew === name ? null : name)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl font-body text-sm whitespace-nowrap transition-all shrink-0",
            selectedCrew === name
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-card border border-border text-foreground hover:border-primary/20"
          )}
        >
          <span className="font-semibold truncate max-w-[120px]">{name}</span>
          <span className={cn(
            "text-xs font-mono font-medium px-1.5 py-0.5 rounded-md",
            selectedCrew === name ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
          )}>
            {crewCounts[name] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
