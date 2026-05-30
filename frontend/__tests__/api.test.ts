import { afterEach, describe, expect, it, vi } from "vitest";

import { createRun, fetchRun, RunNotFoundError, uploadRun } from "@/lib/api";
import type { CanonicalEnvelope } from "@/lib/types";

const ENVELOPE = {
  questionnaire_meta: {
    run_id: "sunflowers-1a2b3c4d",
    origin: "Sunflowers Charity",
    filename: "sunflowers.pdf",
    received_at: "2026-01-02T03:04:00Z",
    completed_at: "2026-01-02T03:04:42Z",
    total_questions: 1,
  },
  answers: [],
  summary_metrics: {
    total_cost_usd: 0.08,
    total_tokens: 4200,
    total_latency_ms: 42000,
    questions_flagged_for_review: 0,
    average_confidence: 0.9,
    flagged_question_indices: [],
    banner: null,
  },
} as CanonicalEnvelope;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchRun", () => {
  it("GETs /runs/{id} and returns the envelope", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(ENVELOPE));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRun("sunflowers-1a2b3c4d", "https://api.example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/runs/sunflowers-1a2b3c4d");
    expect(result.questionnaire_meta.run_id).toBe("sunflowers-1a2b3c4d");
  });

  it("throws RunNotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "no run" }, false, 404)),
    );
    await expect(fetchRun("missing", "https://api.example.com")).rejects.toBeInstanceOf(
      RunNotFoundError,
    );
  });

  it("throws a generic error on other non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false, 503)),
    );
    await expect(fetchRun("x", "https://api.example.com")).rejects.toThrow(/503/);
  });
});

describe("createRun", () => {
  it("extracts questions then processes them, returning run_id + envelope", async () => {
    const extracted = {
      questions: [{ question_id: "q1", index: 1, text: "Do you encrypt data?", page: 1 }],
      total: 1,
      extraction_method: "llm",
      warnings: [],
      metrics: {},
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(extracted)) // /extract-questions
      .mockResolvedValueOnce(jsonResponse(ENVELOPE)); // /process-questionnaire
    vi.stubGlobal("fetch", fetchMock);

    const result = await createRun(
      {
        filename: "sunflowers.pdf",
        origin: "Sunflowers Charity",
        source: { source_format: "pdf", source_text: "1. Do you encrypt data?" },
      },
      "https://api.example.com",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [extractUrl, extractInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(extractUrl).toBe("https://api.example.com/extract-questions");
    expect(JSON.parse(extractInit.body as string)).toMatchObject({
      source_format: "pdf",
      source_text: "1. Do you encrypt data?",
      filename: "sunflowers.pdf",
    });

    const [processUrl, processInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(processUrl).toBe("https://api.example.com/process-questionnaire");
    const processBody = JSON.parse(processInit.body as string);
    expect(processBody.origin).toBe("Sunflowers Charity");
    expect(processBody.questions).toEqual([
      { question_id: "q1", text: "Do you encrypt data?", index: 1 },
    ]);

    expect(result.run_id).toBe("sunflowers-1a2b3c4d");
    expect(result.envelope.questionnaire_meta.origin).toBe("Sunflowers Charity");
  });

  it("includes the picked model in the process body when provided, and omits it otherwise", async () => {
    const extracted = {
      questions: [{ question_id: "q1", index: 1, text: "Q?" }],
      total: 1,
      extraction_method: "llm",
      warnings: [],
      metrics: {},
    };
    const run = (model?: string) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(extracted))
        .mockResolvedValueOnce(jsonResponse(ENVELOPE));
      vi.stubGlobal("fetch", fetchMock);
      return createRun(
        { filename: "x.pdf", origin: "X", source: { source_format: "pdf", source_text: "q" }, model },
        "https://api.example.com",
      ).then(() => {
        const init = fetchMock.mock.calls[1][1] as RequestInit;
        return JSON.parse(init.body as string).model;
      });
    };

    expect(await run("claude-opus-4-8")).toBe("claude-opus-4-8");
    vi.unstubAllGlobals();
    expect(await run(undefined)).toBeUndefined();
  });

  it("throws if extraction fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false, 502)),
    );
    await expect(
      createRun(
        {
          filename: "x.pdf",
          origin: "X",
          source: { source_format: "pdf", source_text: "q" },
        },
        "https://api.example.com",
      ),
    ).rejects.toThrow(/extract/i);
  });
});

describe("uploadRun", () => {
  it("posts the file to /runs and appends the picked model when provided", async () => {
    const file = new File(["%PDF"], "isq.pdf", { type: "application/pdf" });

    const withModel = vi.fn(async () => jsonResponse(ENVELOPE));
    vi.stubGlobal("fetch", withModel);
    await uploadRun(file, "claude-opus-4-8", "https://api.example.com");
    const [url, init] = withModel.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/runs");
    expect((init.body as FormData).get("model")).toBe("claude-opus-4-8");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);

    vi.unstubAllGlobals();
    const noModel = vi.fn(async () => jsonResponse(ENVELOPE));
    vi.stubGlobal("fetch", noModel);
    await uploadRun(file, undefined, "https://api.example.com");
    expect((noModel.mock.calls[0][1] as RequestInit & { body: FormData }).body.get("model")).toBeNull();
  });
});
