// Turn a canonical envelope into a downloadable file (DOCX / XLSX / JSON) by
// calling the backend /render endpoint, then trigger the browser download.
// The backend URL comes from NEXT_PUBLIC_API_URL (the deployed rag-service).

import type { CanonicalEnvelope } from "@/lib/types";

export type RenderFormat = "docx" | "xlsx" | "json";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Pull the filename out of a Content-Disposition header, if the server sent one. */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^"]+)"?/i.exec(header);
  return match ? match[1] : null;
}

/**
 * POST the canonical envelope to /render and return the rendered file blob plus a
 * filename. No DOM here, so it's unit-testable with a mocked fetch.
 */
export async function renderFile(
  format: RenderFormat,
  envelope: CanonicalEnvelope,
  baseUrl: string = API_BASE,
): Promise<{ blob: Blob; filename: string }> {
  const form = new FormData();
  form.append("format", format);
  form.append("envelope", JSON.stringify(envelope));

  const res = await fetch(`${baseUrl}/render`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Render failed (${res.status})`);
  }
  const blob = await res.blob();
  const filename =
    filenameFromDisposition(res.headers.get("content-disposition")) ?? `isq-answers.${format}`;
  return { blob, filename };
}

/** The browser-only side: save a blob via a click-to-download link. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fetch the rendered file from /render and save it. Throws if the call fails. */
export async function downloadRender(
  format: RenderFormat,
  envelope: CanonicalEnvelope,
  baseUrl: string = API_BASE,
): Promise<void> {
  const { blob, filename } = await renderFile(format, envelope, baseUrl);
  triggerDownload(blob, filename);
}
