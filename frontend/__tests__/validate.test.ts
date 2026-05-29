import { describe, expect, it } from "vitest";

import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, validateUpload } from "@/lib/validate";

// Slice 5 — upload validation. The prototype's Dropzone (design/.../prototype-hybrid/
// components.jsx, the `accept` callback) is the source of truth: it accepts a
// `.pdf`/`.xlsx`, checks the TYPE first, then the SIZE, and surfaces these exact
// messages. These tests lock that contract (copy + boundary + precedence) so the
// validator and the Dropzone that shows its messages can never drift apart.

// A real browser File satisfies `{ name, size }`; tests pass a light stand-in so a
// 10 MB case costs nothing.
const file = (name: string, size = 1024) => ({ name, size });

describe("validateUpload — accepted types", () => {
  it("accepts a .pdf", () => {
    expect(validateUpload(file("questionnaire.pdf"))).toEqual({ ok: true });
  });

  it("accepts a .xlsx", () => {
    expect(validateUpload(file("questionnaire.xlsx"))).toEqual({ ok: true });
  });

  it("matches the extension case-insensitively", () => {
    expect(validateUpload(file("REPORT.PDF"))).toEqual({ ok: true });
    expect(validateUpload(file("Book.XLSX"))).toEqual({ ok: true });
  });
});

describe("validateUpload — rejected types", () => {
  it("rejects a .docx with the type message", () => {
    expect(validateUpload(file("answers.docx"))).toEqual({
      ok: false,
      reason: "type",
      message: "We couldn't read this file. Try a PDF or XLSX.",
    });
  });

  it("rejects a .png with the type message", () => {
    expect(validateUpload(file("logo.png"))).toMatchObject({ ok: false, reason: "type" });
  });

  it("rejects a name with no extension", () => {
    expect(validateUpload(file("noextension"))).toMatchObject({ ok: false, reason: "type" });
  });

  it("rejects a disguised extension like .pdf.exe", () => {
    expect(validateUpload(file("malware.pdf.exe"))).toMatchObject({ ok: false, reason: "type" });
  });
});

describe("validateUpload — size ceiling", () => {
  it("exposes a 10 MiB ceiling and the accepted extensions", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect(ACCEPTED_EXTENSIONS).toEqual([".pdf", ".xlsx"]);
  });

  it("accepts a file at exactly the 10 MB ceiling", () => {
    expect(validateUpload(file("big.pdf", MAX_UPLOAD_BYTES))).toEqual({ ok: true });
  });

  it("rejects a file one byte over the ceiling with the size message", () => {
    expect(validateUpload(file("big.pdf", MAX_UPLOAD_BYTES + 1))).toEqual({
      ok: false,
      reason: "size",
      message: "File is over 10 MB. Try a smaller file.",
    });
  });
});

describe("validateUpload — check order", () => {
  // The prototype checks type before size, so a wrong-type, oversized file reports
  // the type problem first. Pin that precedence.
  it("reports the type error first when a file is both wrong type and oversized", () => {
    expect(validateUpload(file("huge.docx", MAX_UPLOAD_BYTES + 1))).toMatchObject({
      ok: false,
      reason: "type",
    });
  });
});
