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
  /** Primary brand hex (dark company colour, exposed as --primary-color) */
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
    card: string;
    popover: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    muted: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;
  };
}

const GCP_THEME: WorkspaceTheme = {
  shortcode: "GCP",
  label: "Gulf Coast Palms",
  primaryHex: "#1B5E20",
  accentHex: "#00C853",
  buttonTextHex: "#FFFFFF",
  accentRgb: "0, 200, 83",
  backgroundHex: "#1A1A1A",
  cardHex: "#2A2A2A",
  statusBarHex: "#1B5E20",
  hsl: {
    background: "0 0% 10%",
    card: "0 0% 16%",
    popover: "0 0% 12%",
    primary: "138 100% 39%",         // #00C853 as active UI accent
    primaryForeground: "0 0% 100%",
    secondary: "0 0% 14%",
    muted: "0 0% 13%",
    accent: "138 100% 39%",          // #00C853
    accentForeground: "0 0% 6%",
    border: "0 0% 18%",
    input: "0 0% 18%",
    ring: "138 100% 39%",
  },
};

const PPS_THEME: WorkspaceTheme = {
  shortcode: "PPS",
  label: "Prestige Property Services",
  primaryHex: "#2A2A2A",
  accentHex: "#F0F0F0",
  buttonTextHex: "#0A0A0A",
  accentRgb: "240, 240, 240",
  backgroundHex: "#1A1A1A",
  cardHex: "#2A2A2A",
  statusBarHex: "#2A2A2A",
  hsl: {
    background: "0 0% 10%",
    card: "0 0% 16%",
    popover: "0 0% 12%",
    primary: "0 0% 100%",            // neon white
    primaryForeground: "0 0% 6%",
    secondary: "0 0% 14%",
    muted: "0 0% 13%",
    accent: "0 0% 94%",              // #F0F0F0
    accentForeground: "0 0% 6%",
    border: "0 0% 30%",
    input: "0 0% 22%",
    ring: "0 0% 100%",
  },
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
    root.style.setProperty("--biz-primary-hex", theme.primaryHex);
    root.style.setProperty("--biz-accent-hex", theme.accentHex);
    root.style.setProperty("--biz-accent-rgb", theme.accentRgb);
    root.style.setProperty("--biz-background-hex", theme.backgroundHex);
    root.style.setProperty("--biz-card-hex", theme.cardHex);
    root.style.setProperty("--accent-color", theme.accentHex);
    root.style.setProperty("--accent-glow", `rgba(${theme.accentRgb}, ${theme.shortcode === "PPS" ? "0.22" : "0.35"})`);
    root.style.setProperty("--primary-color", theme.primaryHex);
    root.style.setProperty("--badge-color", theme.accentHex);
    root.style.setProperty("--button-bg", theme.accentHex);
    root.style.setProperty("--button-text", theme.buttonTextHex);
    root.dataset.workspaceTheme = theme.shortcode;

    // PWA / mobile status bar
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta && themeMeta.getAttribute("content") !== theme.statusBarHex) {
      themeMeta.setAttribute("content", theme.statusBarHex);
    }
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
  const subtleGlowOpacity = theme.shortcode === "PPS" ? "0.22" : "0.35";
  return {
    ["--background" as string]: theme.hsl.background,
    ["--card" as string]: theme.hsl.card,
    ["--popover" as string]: theme.hsl.popover,
    ["--primary" as string]: theme.hsl.primary,
    ["--primary-foreground" as string]: theme.hsl.primaryForeground,
    ["--secondary" as string]: theme.hsl.secondary,
    ["--muted" as string]: theme.hsl.muted,
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
    ["--accent-color" as string]: theme.accentHex,
    ["--accent-glow" as string]: `rgba(${theme.accentRgb}, ${subtleGlowOpacity})`,
    ["--primary-color" as string]: theme.primaryHex,
    ["--badge-color" as string]: theme.accentHex,
    ["--button-bg" as string]: theme.accentHex,
    ["--button-text" as string]: theme.buttonTextHex,
  };
}