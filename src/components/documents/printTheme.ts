/**
 * Light print palette. Used only by the offscreen PDF documents —
 * the on-screen public pages stay dark.
 */
export const PRINT = {
  bg: "#FFFFFF",
  text: "#111111",
  secondary: "#555555",
  divider: "#DDDDDD",
  tableHeaderBg: "#F3F4F3",
  accent: "#1E8549",
} as const;

/** GulfCoastPalms-Invoice-GCP-I-000114.pdf */
export function documentFilename(
  businessName: string | null | undefined,
  kind: "Invoice" | "Quote",
  number: string | null | undefined
): string {
  const slug = (businessName || "GulfCoastPalms").replace(/[^A-Za-z0-9]/g, "") || "GulfCoastPalms";
  const num = (number || kind.toLowerCase()).replace(/[^A-Za-z0-9-]/g, "");
  return `${slug}-${kind}-${num}.pdf`;
}
