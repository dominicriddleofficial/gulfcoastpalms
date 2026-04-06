import { Building2, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Business {
  id: string;
  public_brand_name: string;
  shortcode: string;
  logo_url: string | null;
  default_business_color?: string;
}

interface Props {
  businesses: Business[];
  selectedBusinessId: string | null;
  onSelect: (id: string | null) => void;
  isOwner: boolean;
}

export default function BusinessSwitcher({ businesses, selectedBusinessId, onSelect, isOwner }: Props) {
  const selected = businesses.find(b => b.id === selectedBusinessId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-all w-full text-left">
        {selected ? (
          <BusinessBadge biz={selected} size="sm" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-body text-sm text-foreground font-medium">All Businesses</span>
          </div>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-card border-border">
        {isOwner && (
          <DropdownMenuItem onClick={() => onSelect(null)} className="gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-body text-sm">All Businesses</span>
          </DropdownMenuItem>
        )}
        {businesses.map(biz => (
          <DropdownMenuItem key={biz.id} onClick={() => onSelect(biz.id)} className="gap-2">
            <BusinessBadge biz={biz} size="sm" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BusinessBadge({ biz, size = "sm" }: { biz: Business; size?: "xs" | "sm" }) {
  const color = biz.default_business_color || "#22c55e";
  const iconSize = size === "xs" ? "w-5 h-5" : "w-6 h-6";
  const textSize = size === "xs" ? "text-xs" : "text-sm";
  const codeSize = size === "xs" ? "text-[8px]" : "text-[10px]";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(iconSize, "rounded flex items-center justify-center")}
        style={{ backgroundColor: color + "30", color }}
      >
        <span className={cn("font-display font-bold", codeSize)}>{biz.shortcode}</span>
      </div>
      <span className={cn("font-body font-medium text-foreground", textSize)}>
        {biz.public_brand_name}
      </span>
    </div>
  );
}

export function InlineBadge({ shortcode, color }: { shortcode: string; color?: string }) {
  const c = color || "#22c55e";
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-display font-bold"
      style={{ backgroundColor: c + "20", color: c, border: `1px solid ${c}40` }}
    >
      {shortcode}
    </span>
  );
}
