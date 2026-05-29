// Upload validation (Slice 5). Pure, synchronous, and faithful to the prototype's
// Dropzone `accept` callback (design/.../prototype-hybrid/components.jsx) so the
// /upload screen rejects the same files with the same words. It checks the file
// TYPE first, then the SIZE, returning a result the component branches on rather
// than throwing — a rejected upload is an expected outcome, not an exception.

/** The minimal slice of a browser File the validator inspects; a real File satisfies it. */
export type UploadFile = Pick<File, "name" | "size">;

/** Outcome of validating an upload: accepted, or rejected with a reason and a message to show. */
export type UploadValidation =
  | { ok: true }
  | { ok: false; reason: "type" | "size"; message: string };

/** Extensions the RAG service can ingest. Doubles as the Dropzone `accept` list. */
export const ACCEPTED_EXTENSIONS = [".pdf", ".xlsx"] as const;

/** Size ceiling: 10 MiB, matching the prototype's `10 * 1024 * 1024` check. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Shown when the file isn't a PDF or XLSX. Tom's voice; the prototype's exact words. */
export const TYPE_ERROR_MESSAGE = "We couldn't read this file. Try a PDF or XLSX.";

/** Shown when the file is over the size ceiling. The prototype's exact words. */
export const SIZE_ERROR_MESSAGE = "File is over 10 MB. Try a smaller file.";

export function validateUpload(file: UploadFile): UploadValidation {
  const name = file.name.toLowerCase();
  const typeOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!typeOk) {
    return { ok: false, reason: "type", message: TYPE_ERROR_MESSAGE };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "size", message: SIZE_ERROR_MESSAGE };
  }
  return { ok: true };
}
