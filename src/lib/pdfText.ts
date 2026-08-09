/** Browser-only PDF text extraction (pdf.js). Import lazily — never during SSR. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round((item.transform?.[5] ?? 0) as number);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += item.str;
      if ("hasEOL" in item && item.hasEOL) {
        lines.push(line.trim());
        line = "";
      }
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.filter(Boolean).join("\n"));
  }

  return pages.join("\n");
}
