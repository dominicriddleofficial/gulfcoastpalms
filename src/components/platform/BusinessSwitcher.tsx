import { useEffect, useState } from "react";
import { Building2, ChevronDown, Globe, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getBusinessLogo, getFallbackBusinessLogo } from "@/lib/business-logos";
import { getWorkspaceThemeFromBusiness } from "@/contexts/WorkspaceThemeContext";

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
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/40 border border-border hover:border-primary/20 hover:bg-secondary/60 transition-all w-full text-left group">
        {selected ? (
          <BusinessBadge biz={selected} size="sm" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[12px] text-foreground font-semibold tracking-tight">All Businesses</span>
              <span className="font-body text-[10px] text-muted-foreground">Combined view</span>
            </div>
          </div>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 ml-auto group-hover:text-foreground transition-colors" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 bg-card border-border p-1">
        <p className="px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
          Select workspace
        </p>
        {isOwner && (
          <DropdownMenuItem
            onClick={() => onSelect(null)}
            className="gap-2 px-2 py-2.5 rounded-md cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="font-display text-[12px] font-semibold">All Businesses</span>
              <span className="font-body text-[10px] text-muted-foreground">Combined overview</span>
            </div>
            {selectedBusinessId === null && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        )}
        {isOwner && <DropdownMenuSeparator />}
        {businesses.map(biz => (
          <DropdownMenuItem
            key={biz.id}
            onClick={() => onSelect(biz.id)}
            className="gap-2 px-2 py-2.5 rounded-md cursor-pointer"
          >
            <BusinessBadge biz={biz} size="sm" />
            <div className="ml-auto">
              {selectedBusinessId === biz.id && <Check className="w-3.5 h-3.5 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BusinessBadge({ biz, size = "sm" }: { biz: Business; size?: "xs" | "sm" }) {
  const color = getWorkspaceThemeFromBusiness(biz).accentHex;
  const iconSize = size === "xs" ? "w-5 h-5" : "w-7 h-7";
  const textSize = size === "xs" ? "text-[11px]" : "text-[12px]";
  const codeSize = size === "xs" ? "text-[8px]" : "text-[9px]";
  const initialLogoSrc = getBusinessLogo(biz.shortcode, biz.logo_url);
  const fallbackLogoSrc = getFallbackBusinessLogo(biz.shortcode);
  const [logoSrc, setLogoSrc] = useState<string | null>(initialLogoSrc);

  useEffect(() => {
    setLogoSrc(initialLogoSrc);
  }, [initialLogoSrc]);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(iconSize, "rounded-md flex items-center justify-center border overflow-hidden bg-background")}
        style={{ 
          backgroundColor: logoSrc ? "#ffffff" : color + "15", 
          color, 
          borderColor: color + "25" 
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={`${biz.public_brand_name} logo`}
            className="w-full h-full object-contain p-0.5"
            width={28}
            height={28}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (fallbackLogoSrc && logoSrc !== fallbackLogoSrc) {
                setLogoSrc(fallbackLogoSrc);
                return;
              }

              setLogoSrc(null);
            }}
          />
        ) : (
          <span className={cn("font-display font-bold tracking-tight", codeSize)}>{biz.shortcode}</span>
        )}
      </div>
      <span className={cn("font-display font-semibold text-foreground tracking-tight", textSize)}>
        {biz.public_brand_name}
      </span>
    </div>
  );
}

export function InlineBadge({ shortcode, color }: { shortcode: string; color?: string }) {
  const themeColor = getWorkspaceThemeFromBusiness({ shortcode }).accentHex;
  const c = shortcode ? themeColor : color || themeColor;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-display font-bold tracking-tight"
      style={{ backgroundColor: c + "15", color: c, border: `1px solid ${c}25` }}
    >
      {shortcode}
    </span>
  );
}
