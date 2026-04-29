/**
 * Finance module shared helpers.
 * - Currency formatting
 * - Workspace lookup for owner-only Finance pages
 * - Image compression for receipt uploads (~1MB JPEG)
 * - CSV download
 */
import { supabase } from "@/integrations/supabase/client";

export const fmtUSD = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const fmtPct = (n: number): string => `${(n * 100).toFixed(1)}%`;

export interface WorkspaceBusinesses {
  workspaceId: string | null;
  /** Every business belonging to the same workspace as `selectedBusinessId`. */
  businesses: Array<{ id: string; shortcode: string; public_brand_name: string }>;
}

/** Look up the workspace for the current selected business and every sibling business. */
export async function loadWorkspaceBusinesses(
  selectedBusinessId: string | null,
): Promise<WorkspaceBusinesses> {
  if (!selectedBusinessId) return { workspaceId: null, businesses: [] };
  const { data: biz } = await supabase
    .from("businesses")
    .select("workspace_id")
    .eq("id", selectedBusinessId)
    .maybeSingle();
  const wsId = biz?.workspace_id ?? null;
  if (!wsId) return { workspaceId: null, businesses: [] };
  const { data: siblings } = await supabase
    .from("businesses")
    .select("id, shortcode, public_brand_name")
    .eq("workspace_id", wsId);
  return { workspaceId: wsId, businesses: siblings ?? [] };
}

/** Compress an image File to ~1MB JPEG using a canvas. Falls back to original on failure. */
export async function compressImage(file: File, maxBytes = 1_000_000): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const MAX_DIM = 2000;
    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    let quality = 0.85;
    let blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", quality),
    );
    while (blob && blob.size > maxBytes && quality > 0.4) {
      quality -= 0.1;
      blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", quality),
      );
    }
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Download an array of objects as a CSV file. */
export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    const blob = new Blob(["(no data)\n"], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const EXPENSE_CATEGORIES = [
  "Materials",
  "Equipment Rental",
  "Gas/Fuel",
  "Vehicle Maintenance",
  "Insurance",
  "Advertising/Marketing",
  "Phone/Internet",
  "Tools",
  "Food (business)",
  "Subcontractor Pay",
  "Office/Admin",
  "Rent",
  "Misc",
] as const;

export const DIRECT_COST_CATEGORIES = new Set([
  "Materials",
  "Equipment Rental",
  "Subcontractor Pay",
  "Gas/Fuel",
]);

export const PAYMENT_METHODS = ["cash", "debit card", "credit card", "Zelle", "check"] as const;

export const PAYROLL_PAYMENT_METHODS = ["cash", "Zelle", "check", "direct deposit"] as const;

export const TAX_DOC_TYPES = ["W-9", "W-4", "1099", "W-2", "Other"] as const;