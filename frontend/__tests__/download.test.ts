import { afterEach, describe, expect, it, vi } from "vitest";

import { renderFile } from "@/lib/download";
import type { CanonicalEnvelope } from "@/lib/types";

const envelope = {
  questionnaire_meta: {
    origin: "Sunflowers Charity",
    filename: "sunflowers.pdf",
    received_at: "2026-01-02T03:04:00Z",
    completed_at: "2026-01-02T03:04:05Z",
    total_questions: 1,
  },
  answers: [],
  summary_metrics: {
    total_cost_usd: 0,
    total_tokens: 0,
    total_latency_ms: 0,
    questions_flagged_for_review: 0,
    average_confidence: 0,
    flagged_question_indices: [],
    banner: null,
  },
} as CanonicalEnvelope;

function mockFetch(opts: { ok?: boolean; status?: number; disposition?: string | null }) {
  const blob = new Blob(["file-bytes"]);
  const fetchMock = vi.fn(async () => ({
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    blob: async () => blob,
    headers: {
      get: (h: string) =>
        h.toLowerCase() === "content-disposition" ? (opts.disposition ?? null) : null,
    },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, blob };
}

afterEach(() => vi.unstubAllGlobals());

describe("renderFile", () => {
  it("POSTs format + envelope to /render and returns the blob + filename", async () => {
    const { fetchMock, blob } = mockFetch({
      disposition: 'attachment; filename="sunflowers-answers.docx"',
    });

    const result = await renderFile("docx", envelope, "https://api.example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/render");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect(body.get("format")).toBe("docx");
    expect(JSON.parse(body.get("envelope") as string)).toEqual(envelope);
    expect(result.blob).toBe(blob);
    expect(result.filename).toBe("sunflowers-answers.docx");
  });

  it("falls back to a default filename when no Content-Disposition", async () => {
    mockFetch({ disposition: null });
    const result = await renderFile("json", envelope, "https://api.example.com");
    expect(result.filename).toBe("isq-answers.json");
  });

  it("throws when the backend returns a non-ok response", async () => {
    mockFetch({ ok: false, status: 502 });
    await expect(renderFile("xlsx", envelope, "https://api.example.com")).rejects.toThrow(
      /Render failed \(502\)/,
    );
  });
});
