/**
 * Render an element to a downloadable PDF file (not the browser print dialog).
 * Returns a promise that resolves once the file has been saved.
 */
export async function downloadElementAsPdf(
  element: HTMLElement | null,
  filename: string
): Promise<void> {
  if (!element) return;
  const mod = await import("html2pdf.js");
  const html2pdf = (mod as { default?: unknown }).default ?? mod;
  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    image: { type: "jpeg" as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0a0f0a",
      logging: false,
    },
    jsPDF: { unit: "mm" as const, format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["css", "legacy"] },
  };
  await (html2pdf as () => { set: (o: unknown) => { from: (e: HTMLElement) => { save: () => Promise<void> } } })()
    .set(opt)
    .from(element)
    .save();
}