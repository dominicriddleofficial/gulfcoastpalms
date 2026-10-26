import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ARBORIST_PHOTO_BUCKET, type ArboristQuote, type ArboristTree } from "@/lib/arborist-quotes";

type ReportRow = Omit<ArboristQuote, "trees" | "status"> & { trees: Json; status: string };
const reportFromRow = (row: ReportRow) => ({ ...row, trees: row.trees as unknown as ArboristTree[], status: row.status as ArboristQuote["status"] });
export const arboristQuotesKey = (businessId: string | null, userId: string | null) => ["arborist-quotes", businessId, userId];

export function useArboristQuotes(businessId: string | null, userId: string | null) {
  return useQuery({
    queryKey: arboristQuotesKey(businessId, userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_arborist_quotes").select("*").eq("business_id", businessId!).order("updated_at", { ascending: false });
      if (error) throw error;
      return data.map(row => reportFromRow(row));
    },
    enabled: !!businessId && !!userId,
    placeholderData: () => undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
}

export async function saveArboristQuote(report: ArboristQuote, status: ArboristQuote["status"]): Promise<ArboristQuote> {
  const fields = {
    customer_name: report.customer_name.trim(), property_address: report.property_address.trim(),
    visit_date: report.visit_date, arborist_name: report.arborist_name.trim(), general_notes: report.general_notes.trim(),
    trees: report.trees as unknown as Json, status,
  };
  const query = report.version === 0
    ? supabase.from("platform_arborist_quotes").insert({ ...fields, id: report.id, business_id: report.business_id, author_id: report.author_id })
    : supabase.from("platform_arborist_quotes").update(fields).eq("id", report.id).eq("business_id", report.business_id).eq("version", report.version);
  const { data, error } = await query.select("*").single();
  if (error) {
    if (error.code === "PGRST116" || error.code === "23505") throw new Error("This report changed or was already saved. Close and reopen it before making more changes. Your current form is still here.");
    throw new Error(error.message);
  }
  return reportFromRow(data);
}

export async function prepareArboristPhoto(file: File): Promise<Blob> {
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: choose a photo smaller than 20 MB.`);
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) throw new Error(`${file.name}: choose a JPEG, PNG, WebP, or supported phone photo.`);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error(`${file.name}: this phone format could not be opened. Choose a JPEG or take a new photo.`); }
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Could not prepare this photo. Try again."); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not prepare this photo.")), "image/jpeg", 0.86));
}

export async function uploadArboristPhoto(report: ArboristQuote, treeId: string, id: string, blob: Blob) {
  const path = `${report.business_id}/${report.author_id}/${report.id}/${treeId}/${id}.jpg`;
  const { error } = await supabase.storage.from(ARBORIST_PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error && /already exists|duplicate/i.test(error.message)) {
    // An upload may finish even if its response is lost. Verify this exact
    // private object before treating a retry as successful; never overwrite it.
    const existing = await supabase.storage.from(ARBORIST_PHOTO_BUCKET).createSignedUrl(path, 60);
    if (!existing.error && existing.data?.signedUrl) return path;
  }
  if (error) throw new Error(`Photo upload failed: ${error.message}. Your notes are saved as a draft; retry to finish.`);
  return path;
}
