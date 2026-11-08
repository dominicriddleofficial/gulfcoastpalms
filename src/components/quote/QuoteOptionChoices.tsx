import type { CSSProperties } from "react";
import { Check, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupOptions, isIncluded, lineCents, type OptionLine } from "@/lib/quote-options";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Independent add-ons for new quotes; saved pick-one groups retain their original semantics. */
export function QuoteOptionChoices({ lines, selected, onChange, accent, muted, text, border, disabled = false }: {
  lines: OptionLine[]; selected: string[]; onChange?: (next: string[]) => void;
  accent?: string; muted?: string; text?: string; border?: string; disabled?: boolean;
}) {
  const { required, optional, groups } = groupOptions(lines);
  const set = new Set(selected);
  const tokens = {
    "--choice-accent": accent ?? "hsl(var(--primary))",
    "--choice-muted": muted ?? "hsl(var(--muted-foreground))",
    "--choice-text": text ?? "hsl(var(--quote-document-foreground))",
    "--choice-border": border ?? "hsl(var(--border))",
  } as CSSProperties;
  const heading = (label: string) => <h3 className="mb-2 mt-5 text-sm font-semibold text-[color:var(--choice-muted)]">{label}</h3>;
  const price = (line: OptionLine, addition = false) => `${addition ? "+" : ""}$${fmt(lineCents(line) / 100)}`;
  const row = (line: OptionLine, included: boolean, state: string, control?: React.ReactNode, addition = false) => (
    <div key={line.id} data-testid={`quote-option-${line.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b border-[color:var(--choice-border)] py-4">
      <div className="min-w-0">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[color:var(--choice-text)]">{line.description}</p>
        {Number(line.quantity) !== 1 && <p className="text-xs text-[color:var(--choice-muted)]">Qty {line.quantity}</p>}
        <p className={`mt-1 text-xs ${included ? "text-[color:var(--choice-accent)]" : "text-[color:var(--choice-muted)]"}`}>{state}</p>
      </div>
      <span className="whitespace-nowrap text-sm font-semibold text-[color:var(--choice-text)]">{price(line, addition)}</span>
      {control && <div className="col-span-2">{control}</div>}
    </div>
  );
  return <div style={tokens} className="quote-option-choices">
    {required.length > 0 && <>{heading("Required work")}{required.map(line => row(line, true, "Included — required"))}</>}
    {groups.map(group => <div key={group.name} role="radiogroup" aria-label={group.name}>
      {heading(`${group.name} — choose one`)}
      {group.lines.map(line => {
        const on = isIncluded(line, set);
        return row(line, on, on ? "Selected" : "Not included", onChange ?
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-[color:var(--choice-text)]">
            <input type="radio" name={`group-${group.name}`} checked={on} disabled={disabled} aria-label={`${group.name}: ${line.description}`}
              onChange={() => onChange([...selected.filter(id => !group.lines.some(l => l.id === id)), line.id])} className="h-6 w-6 accent-[var(--choice-accent)]" />
            {on ? "Selected" : "Choose this option"}
          </label> : undefined);
      })}
    </div>)}
    {optional.length > 0 && <>{heading("Optional add-ons")}{optional.map(line => {
      const on = isIncluded(line, set);
      return row(line, on, on ? "Selected — included in total" : onChange ? "Optional — available to add" : "Not selected — not included", onChange ?
        <Button type="button" variant="outline" role="switch" aria-label={`Add ${line.description}`} aria-checked={on} disabled={disabled}
          onClick={() => onChange(on ? selected.filter(id => id !== line.id) : [...selected, line.id])}
          className="min-h-12 w-full justify-between border-[color:var(--choice-border)] bg-transparent text-[color:var(--choice-text)] hover:bg-transparent hover:text-[color:var(--choice-accent)]">
          <span className="flex items-center gap-2">{on && <Check className="h-4 w-4 text-[color:var(--choice-accent)]" />}{on ? "ON · Added" : "OFF · Add to quote"}</span>
          {on ? <ToggleRight className="!h-8 !w-8 text-[color:var(--choice-accent)]" /> : <ToggleLeft className="!h-8 !w-8 text-[color:var(--choice-muted)]" />}
        </Button> : undefined, true);
    })}</>}
  </div>;
}
