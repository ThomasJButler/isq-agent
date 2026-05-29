import { describe, expect, it } from "vitest";

import { toRunViewModel } from "@/lib/adapter";
import type { CanonicalEnvelope } from "@/lib/types";

// Slice 3 — the GLUE contract (plan-12 §5). The backend canonical envelope is
// the source of truth; `toRunViewModel` absorbs the mismatch so every component
// binds to one stable view model. These tests ARE that contract: assert each
// rename, the flatten of confidence dimensions, the lift of needs_review out of
// confidence, honest handling of a failed (confidence: null) answer, the two
// banners, run_id synthesis, derived top_citations, and a coherent empty model.

/** A three-answer fixture: one clean, one flagged, one failed. */
function makeEnvelope(): CanonicalEnvelope {
  return {
    questionnaire_meta: {
      origin: "Sunflowers Charity",
      filename: "test_isq.pdf",
      received_at: "2026-01-02T03:04:00Z",
      completed_at: "2026-01-02T03:04:05Z",
      total_questions: 3,
    },
    answers: [
      {
        question_id: 1,
        question_text: "Do you maintain a formal Information Security Policy?",
        answer: "Yes. Reviewed annually and approved by senior leadership.",
        citations: [
          { source_id: "ISP §1", text_snippet: "We maintain a formal policy." },
          { source_id: "ISQ_01 Q1", text_snippet: "Policy reviewed annually." },
        ],
        confidence: {
          score: 0.9,
          dimensions: { cites_policy: 1.0, on_topic: 0.95, vendor_tone: 0.9, complete: 0.8 },
          needs_review: false,
          review_reason: null,
        },
        metrics: { tokens_in: 1240, tokens_out: 95, cost_usd: 0.0042, latency_ms: 1820 },
      },
      {
        question_id: 2,
        question_text: "How is privileged access to operational technology controlled?",
        answer: "Northstar Labs does not operate operational technology systems.",
        citations: [{ source_id: "ISP §1", text_snippet: "Software only." }],
        confidence: {
          score: 0.5,
          dimensions: { cites_policy: 0.6, on_topic: 0.5, vendor_tone: 0.85, complete: 0.4 },
          needs_review: true,
          review_reason: "LLM flagged: question is OT-specific; we are software-only.",
        },
        metrics: { tokens_in: 1180, tokens_out: 124, cost_usd: 0.0051, latency_ms: 2140 },
      },
      {
        question_id: 3,
        question_text: "Describe your SCADA recovery objectives.",
        answer: "",
        citations: [],
        confidence: null,
        metrics: { tokens_in: 0, tokens_out: 0, cost_usd: 0, latency_ms: 0 },
      },
    ],
    summary_metrics: {
      total_cost_usd: 0.0093,
      total_tokens: 2639,
      total_latency_ms: 3960,
      questions_flagged_for_review: 2,
      average_confidence: 0.7, // (0.9 + 0.5) / 2 — the failed answer is excluded
      flagged_question_indices: [2, 3],
      banner: null,
    },
  };
}

describe("toRunViewModel — meta", () => {
  it("renames questionnaire_meta to meta and keeps its fields", () => {
    const vm = toRunViewModel(makeEnvelope());
    expect(vm.meta.filename).toBe("test_isq.pdf");
    expect(vm.meta.origin).toBe("Sunflowers Charity");
    expect(vm.meta.received_at).toBe("2026-01-02T03:04:00Z");
    expect(vm.meta.completed_at).toBe("2026-01-02T03:04:05Z");
    expect(vm.meta.total_questions).toBe(3);
  });

  it("synthesises a deterministic, URL-safe run_id from filename + completed_at", () => {
    const vm = toRunViewModel(makeEnvelope());
    expect(vm.meta.run_id).toBe("test-isq-2026-01-02t03-04-05z");
    // deterministic: same input -> same id
    expect(toRunViewModel(makeEnvelope()).meta.run_id).toBe(vm.meta.run_id);
  });

  it("prefers an explicit run_id when the backend supplies one", () => {
    const env = makeEnvelope();
    env.questionnaire_meta.run_id = "sun-20260525-001";
    expect(toRunViewModel(env).meta.run_id).toBe("sun-20260525-001");
  });
});

describe("toRunViewModel — summary", () => {
  it("renames summary_metrics fields and shows a single token figure", () => {
    const vm = toRunViewModel(makeEnvelope());
    expect(vm.summary.flagged_count).toBe(2); // questions_flagged_for_review
    expect(vm.summary.flagged_indices).toEqual([2, 3]); // flagged_question_indices
    expect(vm.summary.total_cost_usd).toBe(0.0093);
    expect(vm.summary.total_latency_ms).toBe(3960);
    expect(vm.summary.average_confidence).toBe(0.7);
    expect(vm.summary.total_tokens).toBe(2639);
    // no fabricated in/out split
    expect(vm.summary).not.toHaveProperty("total_tokens_in");
    expect(vm.summary).not.toHaveProperty("total_tokens_out");
  });

  it("relocates total_questions from meta without fabricating it", () => {
    const vm = toRunViewModel(makeEnvelope());
    expect(vm.summary.total_questions).toBe(vm.meta.total_questions);
  });
});

describe("toRunViewModel — answers", () => {
  it("renames question_text to question and keeps answer + metrics", () => {
    const a = toRunViewModel(makeEnvelope()).answers[0];
    expect(a.index).toBe(1); // question_id
    expect(a.question).toBe("Do you maintain a formal Information Security Policy?");
    expect(a.metrics.tokens_in).toBe(1240);
  });

  it("flattens confidence dimensions onto the answer confidence", () => {
    const c = toRunViewModel(makeEnvelope()).answers[0].confidence!;
    expect(c.score).toBe(0.9);
    expect(c.cites_policy).toBe(1.0);
    expect(c.on_topic).toBe(0.95);
    expect(c.vendor_tone).toBe(0.9);
    expect(c.complete).toBe(0.8);
    // dimensions are flattened, not left nested
    expect(c).not.toHaveProperty("dimensions");
  });

  it("renames citations to {id, snippet} and invents no page or source", () => {
    const cites = toRunViewModel(makeEnvelope()).answers[0].citations;
    expect(cites[0]).toEqual({ id: "ISP §1", snippet: "We maintain a formal policy." });
    expect(cites[0]).not.toHaveProperty("page");
    expect(cites[0]).not.toHaveProperty("source");
  });

  it("lifts needs_review and review_reason out of confidence for a flagged answer", () => {
    const a = toRunViewModel(makeEnvelope()).answers[1];
    expect(a.needs_review).toBe(true);
    expect(a.review_reason).toBe("LLM flagged: question is OT-specific; we are software-only.");
    expect(a.failed).toBe(false);
  });
});

describe("toRunViewModel — failed answer (confidence: null)", () => {
  it("flags it, shows no score, and marks it failed", () => {
    const a = toRunViewModel(makeEnvelope()).answers[2];
    expect(a.confidence).toBeNull();
    expect(a.failed).toBe(true);
    expect(a.needs_review).toBe(true);
    expect(a.review_reason).toBe("Generation failed");
  });

  it("keeps the failed answer out of the pass-through average and inside flagged_indices", () => {
    const vm = toRunViewModel(makeEnvelope());
    expect(vm.summary.average_confidence).toBe(0.7); // excludes the failed answer
    expect(vm.summary.flagged_indices).toContain(3);
  });
});

describe("toRunViewModel — derived top_citations", () => {
  it("derives top_citations from answers, counting how many answers use each source", () => {
    const vm = toRunViewModel(makeEnvelope());
    // "ISP §1" is used in answers 1 and 2; "ISQ_01 Q1" only in answer 1
    const isp = vm.top_citations.find((c) => c.id === "ISP §1");
    expect(isp?.used_in).toBe(2);
    expect(vm.top_citations.find((c) => c.id === "ISQ_01 Q1")?.used_in).toBe(1);
    // most-used first
    expect(vm.top_citations[0].id).toBe("ISP §1");
  });

  it("produces no stages key (backend does not emit per-stage timing)", () => {
    expect(toRunViewModel(makeEnvelope())).not.toHaveProperty("stages");
  });
});

describe("toRunViewModel — banners", () => {
  it("surfaces an all_failed banner", () => {
    const env = makeEnvelope();
    env.answers = env.answers.map((a) => ({ ...a, confidence: null }));
    env.summary_metrics.banner = "all_failed";
    expect(toRunViewModel(env).summary.banner).toBe("all_failed");
  });

  it("surfaces an all_flagged banner", () => {
    const env = makeEnvelope();
    env.summary_metrics.banner = "all_flagged";
    expect(toRunViewModel(env).summary.banner).toBe("all_flagged");
  });
});

describe("toRunViewModel — empty run", () => {
  it("yields a coherent empty view model for answers: []", () => {
    const env = makeEnvelope();
    env.answers = [];
    env.summary_metrics = {
      total_cost_usd: 0,
      total_tokens: 0,
      total_latency_ms: 0,
      questions_flagged_for_review: 0,
      average_confidence: 0,
      flagged_question_indices: [],
      banner: null,
    };
    const vm = toRunViewModel(env);
    expect(vm.answers).toEqual([]);
    expect(vm.top_citations).toEqual([]);
    expect(vm.summary.flagged_indices).toEqual([]);
    expect(vm.meta.run_id).toBeTruthy();
  });
});
