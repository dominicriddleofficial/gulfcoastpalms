export type SystemType = "flake" | "metallic";

export type AutoKey =
  | "xpsKits"
  | "flakeBoxes"
  | "groutCoatKits"
  | "baseCoatKits"
  | "metallicPigmentKits"
  | "topCoatKits";

export interface ChecklistItemTemplate {
  id: string;
  section: string;
  label: string;
  hasQuantity?: boolean;
  hasColorField?: boolean;
  autoKey?: AutoKey;
}

export interface ChecklistItemState extends ChecklistItemTemplate {
  checked: boolean;
  quantity?: number | null;
  colorValue?: string | null;
}

const COMMON_TOOLS: ChecklistItemTemplate[] = [
  { id: "tool-pole", section: "APPLICATION TOOLS", label: "Rolling pole / extension pole" },
  { id: "tool-roller-frame", section: "APPLICATION TOOLS", label: "18-inch roller frame" },
  { id: "tool-roller-naps", section: "APPLICATION TOOLS", label: "Roller naps (multiple — have backups)", hasQuantity: true },
  { id: "tool-squeegee", section: "APPLICATION TOOLS", label: "3/8 notched squeegee" },
  { id: "tool-second-pole", section: "APPLICATION TOOLS", label: "Second pole for squeegee" },
  { id: "tool-paddles", section: "APPLICATION TOOLS", label: "Mixing paddles (2 minimum)", hasQuantity: true },
  { id: "tool-5gal", section: "APPLICATION TOOLS", label: "5-gallon mixing buckets (2 extra)", hasQuantity: true },
  { id: "tool-liter", section: "APPLICATION TOOLS", label: "Small liter mixing buckets", hasQuantity: true },
  { id: "tool-chip-brush", section: "APPLICATION TOOLS", label: "Chip brushes", hasQuantity: true },
  { id: "tool-spiked-shoes", section: "APPLICATION TOOLS", label: "Spiked shoes" },
];

const COMMON_TAPE: ChecklistItemTemplate[] = [
  { id: "tape-resin-paper", section: "TAPE & PROTECTION", label: "Resin paper" },
  { id: "tape-fineline", section: "TAPE & PROTECTION", label: "Fine line tape" },
  { id: "tape-green", section: "TAPE & PROTECTION", label: "Green painter's tape" },
  { id: "tape-gorilla", section: "TAPE & PROTECTION", label: "Gorilla tape" },
];

const COMMON_CLEAN: ChecklistItemTemplate[] = [
  { id: "clean-acetone", section: "CLEANING & SOLVENTS", label: "Acetone" },
  { id: "clean-denatured", section: "CLEANING & SOLVENTS", label: "Denatured alcohol" },
  { id: "clean-bonnet", section: "CLEANING & SOLVENTS", label: "Bonnet pads / mop pads" },
  { id: "clean-wipes", section: "CLEANING & SOLVENTS", label: "Shop wipes / napkins" },
];

const FLAKE_TEMPLATE: ChecklistItemTemplate[] = [
  { id: "fl-mat-xps", section: "EPOXY MATERIALS", label: "XPS Polyaspartic System Kit", hasQuantity: true, autoKey: "xpsKits" },
  { id: "fl-mat-flake", section: "EPOXY MATERIALS", label: "Flake boxes", hasQuantity: true, hasColorField: true, autoKey: "flakeBoxes" },
  { id: "fl-mat-poly", section: "EPOXY MATERIALS", label: "Polyaspartic top coat (NOT T-200)" },
  { id: "fl-mat-thixo", section: "EPOXY MATERIALS", label: "Thixo (crack filler)" },
  ...COMMON_TOOLS,
  { id: "fl-prep-grinder", section: "PREP & GRINDING", label: "Grinder rental from Sunbelt (walk-behind)" },
  { id: "fl-prep-pcd", section: "PREP & GRINDING", label: "PCD segments" },
  { id: "fl-prep-16grit", section: "PREP & GRINDING", label: "Medium 16-grit segments" },
  { id: "fl-prep-hand7", section: "PREP & GRINDING", label: "Hand grinder — 7 inch" },
  { id: "fl-prep-hand4", section: "PREP & GRINDING", label: "Hand grinder — 4.5 inch" },
  { id: "fl-prep-cup", section: "PREP & GRINDING", label: "Diamond cup wheel — 24 segment" },
  { id: "fl-prep-vacs", section: "PREP & GRINDING", label: "Hercules vacuums (both)" },
  { id: "fl-prep-scrapers", section: "PREP & GRINDING", label: "Big floor scrapers (for Day 2 flake scraping)" },
  { id: "fl-prep-putty", section: "PREP & GRINDING", label: "Putty knife" },
  ...COMMON_TAPE,
  ...COMMON_CLEAN,
  { id: "fl-etf-naps", section: "EASY TO FORGET", label: "Extra roller naps" },
  { id: "fl-etf-paddle", section: "EASY TO FORGET", label: "Second mixing paddle" },
  { id: "fl-etf-shoes", section: "EASY TO FORGET", label: "Spiked shoes" },
  { id: "fl-etf-buckets", section: "EASY TO FORGET", label: "Extra buckets" },
  { id: "fl-etf-mask", section: "EASY TO FORGET", label: "Dust masks / respirators" },
  { id: "fl-etf-knee", section: "EASY TO FORGET", label: "Knee pads" },
  { id: "fl-etf-lights", section: "EASY TO FORGET", label: "Work lights" },
  { id: "fl-etf-cords", section: "EASY TO FORGET", label: "Extension cords" },
  { id: "fl-etf-trash", section: "EASY TO FORGET", label: "Trash bags" },
  { id: "fl-etf-cooler", section: "EASY TO FORGET", label: "Cooler with water" },
  { id: "fl-etf-charger", section: "EASY TO FORGET", label: "Phone charger" },
];

const METALLIC_TEMPLATE: ChecklistItemTemplate[] = [
  { id: "mt-mat-grout", section: "EPOXY MATERIALS", label: "Lotion / grout coat kit", hasQuantity: true, autoKey: "groutCoatKits" },
  { id: "mt-mat-base", section: "EPOXY MATERIALS", label: "Base coat kit (black, gray, or white)", hasQuantity: true, hasColorField: true, autoKey: "baseCoatKits" },
  { id: "mt-mat-pigment", section: "EPOXY MATERIALS", label: "Metallic pigment kits", hasQuantity: true, hasColorField: true, autoKey: "metallicPigmentKits" },
  { id: "mt-mat-t200", section: "EPOXY MATERIALS", label: "T-200 top coat (NOT polyaspartic)", hasQuantity: true, autoKey: "topCoatKits" },
  { id: "mt-mat-thixo", section: "EPOXY MATERIALS", label: "Thixo (crack filler)" },
  ...COMMON_TOOLS,
  { id: "mt-prep-grinder", section: "PREP & GRINDING", label: "Grinder rental from Sunbelt (walk-behind)" },
  { id: "mt-prep-pcd", section: "PREP & GRINDING", label: "PCD segments" },
  { id: "mt-prep-16grit", section: "PREP & GRINDING", label: "Medium 16-grit segments" },
  { id: "mt-prep-hand7", section: "PREP & GRINDING", label: "Hand grinder — 7 inch" },
  { id: "mt-prep-hand4", section: "PREP & GRINDING", label: "Hand grinder — 4.5 inch" },
  { id: "mt-prep-cup", section: "PREP & GRINDING", label: "Diamond cup wheel — 24 segment" },
  { id: "mt-prep-vacs", section: "PREP & GRINDING", label: "Hercules vacuums (both)" },
  { id: "mt-prep-putty", section: "PREP & GRINDING", label: "Putty knife" },
  ...COMMON_TAPE,
  ...COMMON_CLEAN,
  { id: "mt-etf-naps", section: "EASY TO FORGET", label: "Extra roller naps" },
  { id: "mt-etf-paddle", section: "EASY TO FORGET", label: "Second mixing paddle" },
  { id: "mt-etf-shoes", section: "EASY TO FORGET", label: "Spiked shoes" },
  { id: "mt-etf-buckets", section: "EASY TO FORGET", label: "Extra buckets" },
  { id: "mt-etf-heat", section: "EASY TO FORGET", label: "Heat gun or torch (for popping bubbles in metallic)" },
  { id: "mt-etf-photos", section: "EASY TO FORGET", label: "Reference photos of customer's desired metallic design" },
  { id: "mt-etf-mask", section: "EASY TO FORGET", label: "Dust masks / respirators (metallic fumes are strong)" },
  { id: "mt-etf-knee", section: "EASY TO FORGET", label: "Knee pads" },
  { id: "mt-etf-lights", section: "EASY TO FORGET", label: "Work lights — good lighting is critical for metallic design" },
  { id: "mt-etf-cords", section: "EASY TO FORGET", label: "Extension cords" },
  { id: "mt-etf-trash", section: "EASY TO FORGET", label: "Trash bags" },
  { id: "mt-etf-cooler", section: "EASY TO FORGET", label: "Cooler with water" },
  { id: "mt-etf-charger", section: "EASY TO FORGET", label: "Phone charger" },
];

export function buildChecklist(system: SystemType): ChecklistItemState[] {
  const tpl = system === "flake" ? FLAKE_TEMPLATE : METALLIC_TEMPLATE;
  return tpl.map((t) => ({
    ...t,
    checked: false,
    quantity: t.hasQuantity ? null : undefined,
    colorValue: t.hasColorField ? "" : undefined,
  }));
}

export function computeAutoQuantities(
  system: SystemType,
  sqft: number
): Partial<Record<AutoKey, number>> {
  if (!sqft || sqft <= 0) return {};
  const ceil100 = Math.ceil(sqft / 100);
  const per500 = Math.ceil(sqft / 500);
  if (system === "flake") {
    return {
      xpsKits: ceil100,
      flakeBoxes: ceil100,
    };
  }
  return {
    groutCoatKits: per500,
    baseCoatKits: per500 * 2,
    metallicPigmentKits: per500 * 6,
    topCoatKits: per500,
  };
}

export const flakeProcess = [
  {
    label: "Day 1",
    steps: [
      "Grind floor",
      "Vacuum",
      "Patch cracks with Thixo",
      "Let patches dry",
      "Mix and apply base coat",
      "Broadcast flake into wet base coat",
      "Let cure overnight",
    ],
  },
  {
    label: "Day 2",
    steps: [
      "Scrape all loose flake",
      "Vacuum clean",
      "Mix polyaspartic top coat",
      "Squeegee onto floor",
      "Back-roll for even finish",
      "Let cure",
      "Final walkthrough and cleanup",
    ],
  },
];

export const metallicProcess = [
  {
    label: "Day 1",
    steps: [
      "Grind concrete",
      "Vacuum",
      "Patch cracks with Thixo",
      "Apply lotion/grout coat if time allows",
      "Let cure overnight",
    ],
  },
  {
    label: "Day 2",
    steps: [
      "Inspect grout coat and touch up if needed",
      "Apply base coat (black/gray/white)",
      "Let cure overnight",
    ],
  },
  {
    label: "Day 3",
    steps: [
      "Mix metallic pigment kits",
      "Apply metallic design working in sections",
      "Use heat gun to pop bubbles and create effects",
      "Let cure overnight",
    ],
  },
  {
    label: "Day 4",
    steps: [
      "Inspect metallic coat",
      "Mix T-200 top coat",
      "Squeegee onto floor",
      "Back-roll for even finish",
      "Let cure",
      "Final walkthrough and cleanup",
    ],
  },
];