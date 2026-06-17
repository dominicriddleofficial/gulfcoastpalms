import html2pdf from "html2pdf.js";

/**
 * Render an element to a downloadable PDF file (not the browser print dialog).
 * Returns a promise that resolves once the file has been saved.
 */
export async function downloadElementAsPdf(
  element: HTMLElement | null,
  filename: string
): Promise<void> {
  if (!element) return;
  const opt = {
    margin: [8, 8, 8, 8],
    filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0a0f0a",
      logging: false,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };
  await html2pdf().set(opt).from(element).save();
}