import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export interface LineItem { description: string; quantity: number; unit_price: number; }

interface Props { items: LineItem[]; onChange: (items: LineItem[]) => void; hideAmounts?: boolean; }

export default function LineItemsEditor({ items, onChange, hideAmounts }: Props) {
  const update = (i: number, patch: Partial<LineItem>) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { description: "", quantity: 1, unit_price: 0 }]);

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5 items-start">
          <Input className="flex-1" placeholder="Description" value={it.description} onChange={(e) => update(i, { description: e.target.value })} />
          <Input className="w-16" type="number" min={0} step="0.5" value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })} />
          {!hideAmounts && (
            <Input className="w-24" type="number" min={0} step="0.01" placeholder="Rate" value={it.unit_price} onChange={(e) => update(i, { unit_price: Number(e.target.value) || 0 })} />
          )}
          <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" /> Add line</Button>
    </div>
  );
}