import { groupOptions, isIncluded, lineCents, type OptionLine } from "@/lib/quote-options";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Required work, optional add-ons (checkboxes) and pick-one groups (radios).
 * Interactive when onChange is given; otherwise read-only with excluded choices marked.
 */
export function QuoteOptionChoices({ lines, selected, onChange, accent = "#34d399", muted = "#a1a1aa", text = "#fff", border = "#1e1e1e", disabled = false }: {
  lines: OptionLine[]; selected: string[]; onChange?: (next: string[]) => void;
  accent?: string; muted?: string; text?: string; border?: string; disabled?: boolean;
}) {
  const { required, optional, groups } = groupOptions(lines);
  const set = new Set(selected);
  const price = (line: OptionLine) => `$${fmt(lineCents(line) / 100)}`;
  const row = (line: OptionLine, control: React.ReactNode, included: boolean) => (
    <label key={line.id} data-testid={`quote-option-${line.id}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${border}`, cursor: onChange && !disabled ? "pointer" : "default", minHeight: 44 }}>
      {control}
      <span style={{ flex: 1, minWidth: 0, color: included ? text : muted, fontSize: 14, lineHeight: 1.4, textDecoration: included ? "none" : "line-through" }}>
        {line.description}
        {Number(line.quantity) !== 1 && <span style={{ color: muted, fontSize: 12 }}> · Qty {line.quantity}</span>}
        {!included && <span style={{ display: "block", color: muted, fontSize: 11, textDecoration: "none" }}>Not included</span>}
      </span>
      <span style={{ color: included ? text : muted, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>{price(line)}</span>
    </label>
  );
  const heading = (label: string, hint?: string) => <p style={{ marginTop: 16, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: muted }}>{label}{hint && <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}> — {hint}</span>}</p>;
  const box = (checked: boolean, type: "checkbox" | "radio", name: string | undefined, onToggle: () => void, label: string) => onChange
    ? <input type={type} name={name} checked={checked} disabled={disabled} aria-label={label} onChange={onToggle} style={{ width: 20, height: 20, marginTop: 1, accentColor: accent, flexShrink: 0 }} />
    : <span aria-hidden style={{ width: 20, flexShrink: 0, color: checked ? accent : muted }}>{checked ? "✓" : "–"}</span>;

  return <div>
    {required.length > 0 && <>{heading("Included work")}{required.map(line => row(line, <span aria-hidden style={{ width: 20, flexShrink: 0, color: accent }}>✓</span>, true))}</>}
    {groups.map(group => <div key={group.name} role="radiogroup" aria-label={group.name}>
      {heading(group.name, "choose one")}
      {group.lines.map(line => {
        const on = isIncluded(line, set);
        return row(line, box(on, "radio", `group-${group.name}`, () => onChange?.([...selected.filter(id => !group.lines.some(l => l.id === id)), line.id]), `${group.name}: ${line.description}`), on);
      })}
    </div>)}
    {optional.length > 0 && <>{heading("Optional add-ons", "add any you want")}{optional.map(line => {
      const on = isIncluded(line, set);
      return row(line, box(on, "checkbox", undefined, () => onChange?.(on ? selected.filter(id => id !== line.id) : [...selected, line.id]), `Add ${line.description}`), on);
    })}</>}
  </div>;
}
