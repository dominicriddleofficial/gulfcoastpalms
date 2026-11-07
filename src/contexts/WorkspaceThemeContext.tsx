import { createContext, useContext, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";

/**
 * Per-workspace theme tokens. Applied as CSS variables on the active
 * `.ops-theme` container so the entire platform UI (sidebar, top nav,
 * buttons, badges, charts, PWA status bar) re-skins instantly when the
 * user toggles between Gulf Coast Palms and Prestige Property Services.
 */

export interface WorkspaceTheme {
  shortcode: string;
  /** Brand label, used for accessibility / debugging */
  label: string;
  /** Primary brand hex, exposed as --primary-color */
  primaryHex: string;
  /** Bright accent hex (used for highlights, charts, progress bars) */
  accentHex: string;
  /** Button text colour for the workspace accent button */
  buttonTextHex: string;
  /** RGB triplet "r, g, b" for the accent — drives rgba(...) gradients */
  accentRgb: string;
  /** Background hex for the platform shell */
  backgroundHex: string;
  /** Card surface hex */
  cardHex: string;
  /** PWA / mobile browser status bar colour */
  statusBarHex: string;
  /** HSL strings (no `hsl()` wrapper) for shadcn semantic tokens */
  hsl: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  /** Bottom-half atmosphere; each workspace keeps its own approved recipe. */
  fade: {
    bottomMix: string;
    midMix: string;
    bloom: string;
  };
  glowOpacity: string;
  tooltipBackground: string;
}

const GCP_THEME: WorkspaceTheme = {
  shortcode: "GCP",
  label: "Gulf Coast Palms",
  primaryHex: "#1B5E20",
  accentHex: "#34E8A8",
  buttonTextHex: "#04130E",
  accentRgb: "52, 232, 168",
  backgroundHex: "#050809",
  cardHex: "#0C1214",
  statusBarHex: "#050809",
  hsl: {
    background: "195 29% 3%",
    foreground: "160 15% 94%",
    card: "195 25% 6%",
    cardForeground: "160 15% 94%",
    popover: "195 20% 8%",
    popoverForeground: "160 15% 94%",
    primary: "159 80% 56%",
    primaryForeground: "158 65% 5%",
    secondary: "190 16% 11%",
    secondaryForeground: "160 12% 88%",
    muted: "190 16% 10%",
    mutedForeground: "180 6% 62%",
    accent: "159 80% 56%",
    accentForeground: "158 65% 5%",
    border: "185 13% 15%",
    input: "185 13% 18%",
    ring: "159 80% 56%",
  },
  fade: { bottomMix: "72%", midMix: "48%", bloom: "0.3" },
  glowOpacity: "0.35",
  tooltipBackground: "#101b1eef",
};

/** Prestige keeps GCP's modern dark layout with its own neutral charcoal,
 * white and silver identity rather than inheriting the emerald palette. */
const PPS_THEME: WorkspaceTheme = {
  shortcode: "PPS",
  label: "Prestige Property Services",
  primaryHex: "#D4D4D8",
  accentHex: "#F4F4F5",
  buttonTextHex: "#09090B",
  accentRgb: "244, 244, 245",
  backgroundHex: "#09090B",
  cardHex: "#131316",
  statusBarHex: "#09090B",
  hsl: {
    background: "240 10% 3.9%",
    foreground: "0 0% 98%",
    card: "240 9% 8%",
    cardForeground: "0 0% 98%",
    popover: "240 6% 10%",
    popoverForeground: "0 0% 98%",
    primary: "240 5% 96%",
    primaryForeground: "240 10% 3.9%",
    secondary: "240 4% 16%",
    secondaryForeground: "0 0% 90%",
    muted: "240 5% 13%",
    mutedForeground: "240 5% 65%",
    accent: "240 5% 96%",
    accentForeground: "240 10% 3.9%",
    border: "240 5% 20%",
    input: "240 5% 26%",
    ring: "240 5% 96%",
  },
  fade: { bottomMix: "72%", midMix: "48%", bloom: "0.3" },
  glowOpacity: "0.28",
  tooltipBackground: "#18181bef",
};

const THEME_REGISTRY: Record<string, WorkspaceTheme> = {
  GCP: GCP_THEME,
  PPS: PPS_THEME,
};

export function getWorkspaceTheme(shortcode: string | null | undefined): WorkspaceTheme {
  if (!shortcode) return GCP_THEME;
  return THEME_REGISTRY[shortcode.toUpperCase()] ?? GCP_THEME;
}

export function hexToRgbTriplet(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return "0, 200, 83";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function getWorkspaceThemeFromBusiness(
  business: { shortcode?: string | null; public_brand_name?: string | null } | null | undefined
): WorkspaceTheme {
  const shortcode = business?.shortcode?.toUpperCase();
  if (shortcode) return getWorkspaceTheme(shortcode);

  const name = business?.public_brand_name?.toLowerCase() ?? "";
  if (name.includes("prestige") || name.includes("pps")) return PPS_THEME;
  return GCP_THEME;
}

interface WorkspaceThemeContextValue {
  theme: WorkspaceTheme;
}

const WorkspaceThemeContext = createContext<WorkspaceThemeContextValue>({ theme: GCP_THEME });

interface ProviderProps {
  shortcode: string | null | undefined;
  /** When true, also writes vars onto :root so non-platform surfaces (e.g. portal popovers) stay in sync. */
  applyGlobally?: boolean;
  children: ReactNode;
}

/**
 * Wraps the platform shell. Resolves the theme by workspace shortcode and
 * exposes it to children plus updates the PWA status bar meta tag.
 */
export function WorkspaceThemeProvider({ shortcode, applyGlobally = true, children }: ProviderProps) {
  const theme = useMemo(() => getWorkspaceTheme(shortcode), [shortcode]);

  useEffect(() => {
    if (!applyGlobally || typeof document === "undefined") return;
    const root = document.documentElement;
    // Portaled dialogs and menus render outside .ops-theme. Apply the same
    // semantic tokens while the workspace is mounted, then restore the site.
    const vars = {
      ...workspaceThemeVars(theme),
      "--font-display": "'Inter', sans-serif",
      "--font-body": "'Inter', sans-serif",
    } as Record<string, string>;
    const previous = new Map(Object.keys(vars).map(key => [key, root.style.getPropertyValue(key)]));
    const previousWorkspace = root.dataset.workspaceTheme;
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    root.dataset.workspaceTheme = theme.shortcode;

    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousStatusBar = themeMeta?.getAttribute("content");
    themeMeta?.setAttribute("content", theme.statusBarHex);
    return () => {
      for (const [key, value] of previous) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
      if (previousWorkspace) root.dataset.workspaceTheme = previousWorkspace;
      else delete root.dataset.workspaceTheme;
      if (previousStatusBar != null) themeMeta?.setAttribute("content", previousStatusBar);
    };
  }, [theme, applyGlobally]);

  return (
    <WorkspaceThemeContext.Provider value={{ theme }}>
      {children}
    </WorkspaceThemeContext.Provider>
  );
}

export function useWorkspaceTheme() {
  return useContext(WorkspaceThemeContext).theme;
}

/**
 * Returns the inline style object that overrides the .ops-theme CSS variables
 * for the active workspace. Apply to the platform shell element.
 */
export function workspaceThemeVars(theme: WorkspaceTheme): CSSProperties {
  return {
    ["--background" as string]: theme.hsl.background,
    ["--foreground" as string]: theme.hsl.foreground,
    ["--card" as string]: theme.hsl.card,
    ["--card-foreground" as string]: theme.hsl.cardForeground,
    ["--popover" as string]: theme.hsl.popover,
    ["--popover-foreground" as string]: theme.hsl.popoverForeground,
    ["--primary" as string]: theme.hsl.primary,
    ["--primary-foreground" as string]: theme.hsl.primaryForeground,
    ["--secondary" as string]: theme.hsl.secondary,
    ["--secondary-foreground" as string]: theme.hsl.secondaryForeground,
    ["--muted" as string]: theme.hsl.muted,
    ["--muted-foreground" as string]: theme.hsl.mutedForeground,
    ["--accent" as string]: theme.hsl.accent,
    ["--accent-foreground" as string]: theme.hsl.accentForeground,
    ["--border" as string]: theme.hsl.border,
    ["--input" as string]: theme.hsl.input,
    ["--ring" as string]: theme.hsl.ring,
    ["--biz-primary-hex" as string]: theme.primaryHex,
    ["--biz-accent-hex" as string]: theme.accentHex,
    ["--biz-accent-rgb" as string]: theme.accentRgb,
    ["--biz-background-hex" as string]: theme.backgroundHex,
    ["--biz-card-hex" as string]: theme.cardHex,
    // The shared bottom-half layout uses each workspace's own color recipe.
    ["--platform-fade-mix" as string]: theme.fade.bottomMix,
    ["--platform-fade-mid-mix" as string]: theme.fade.midMix,
    ["--platform-fade-bloom" as string]: theme.fade.bloom,
    ["--platform-tooltip-background" as string]: theme.tooltipBackground,
    ["--accent-color" as string]: theme.accentHex,
    ["--accent-glow" as string]: `rgba(${theme.accentRgb}, ${theme.glowOpacity})`,
    ["--primary-color" as string]: theme.primaryHex,
    ["--badge-color" as string]: theme.accentHex,
    ["--button-bg" as string]: theme.accentHex,
    ["--button-text" as string]: theme.buttonTextHex,
  };
}
