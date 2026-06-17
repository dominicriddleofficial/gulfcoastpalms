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
  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: safeFilename,
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
  const worker = (html2pdf as () => {
    set: (o: unknown) => {
      from: (e: HTMLElement) => {
        outputPdf: (type: "blob") => Promise<Blob>;
      };
    };
  })()
    .set(opt)
    .from(element);
  const blob = await worker.outputPdf("blob");
  const file = new File([blob], safeFilename, { type: "application/pdf" });
  const navigatorWithShare = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (navigatorWithShare.share && navigatorWithShare.canShare?.({ files: [file] })) {
    await navigatorWithShare.share({ files: [file], title: safeFilename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}