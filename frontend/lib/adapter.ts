// The GLUE contract (plan-12 §5). Maps the backend canonical envelope to the
// stable view model every component binds to. Pure, synchronous, no fabrication:
// tokens stay a single figure, citations carry no invented page/source, and a
// failed answer (confidence: null) stays honest — no score, flagged, and already
// excluded from the backend's pass-through average.

import type {
  AnswerViewModel,
  CanonicalAnswer,
  CanonicalEnvelope,
  CitationViewModel,
  ConfidenceViewModel,
  RunViewModel,
  TopCitationViewModel,
} from "@/lib/types";

/** Shown in place of a review reason when generation failed entirely. */
const GENERATION_FAILED = "Generation failed";

/** Lowercase, collapse non-alphanumerics to single hyphens, trim the ends. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A deterministic, URL-safe run id derived from the filename (sans extension)
 * and the completion timestamp. The backend will supply a real one later (§8);
 * an explicit `meta.run_id` always wins.
 */
function synthesiseRunId(filename: string, completedAt: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return slugify(`${base}-${completedAt}`);
}

function toCitationViewModel(citation: CanonicalAnswer["citations"][number]): CitationViewModel {
  return { id: citation.source_id, snippet: citation.text_snippet };
}

function toAnswerViewModel(answer: CanonicalAnswer): AnswerViewModel {
  const { confidence } = answer;
  const failed = confidence === null;

  const flatConfidence: ConfidenceViewModel | null = confidence
    ? { score: confidence.score, ...confidence.dimensions }
    : null;

  return {
    index: answer.question_id,
    question: answer.question_text,
    answer: answer.answer,
    citations: answer.citations.map(toCitationViewModel),
    confidence: flatConfidence,
    // A failed answer is always flagged; otherwise lift the backend's flag.
    needs_review: failed ? true : confidence!.needs_review,
    review_reason: failed ? GENERATION_FAILED : confidence!.review_reason,
    failed,
    metrics: answer.metrics,
  };
}

/**
 * Build the "most cited sources" list client-side: one entry per unique
 * source id, `used_in` counting how many answers cite it. Sorted by usage
 * (desc) then id (asc) for a stable order.
 */
function deriveTopCitations(answers: CanonicalAnswer[]): TopCitationViewModel[] {
  const byId = new Map<string, TopCitationViewModel>();

  for (const answer of answers) {
    const seenInThisAnswer = new Set<string>();
    for (const { source_id, text_snippet } of answer.citations) {
      if (seenInThisAnswer.has(source_id)) continue;
      seenInThisAnswer.add(source_id);

      const existing = byId.get(source_id);
      if (existing) {
        existing.used_in += 1;
      } else {
        byId.set(source_id, { id: source_id, snippet: text_snippet, used_in: 1 });
      }
    }
  }

  return [...byId.values()].sort((a, b) => b.used_in - a.used_in || a.id.localeCompare(b.id));
}

/** Map the backend canonical envelope to the dashboard view model. */
export function toRunViewModel(canonical: CanonicalEnvelope): RunViewModel {
  const { questionnaire_meta: meta, answers, summary_metrics: summary } = canonical;

  return {
    meta: {
      run_id: meta.run_id ?? synthesiseRunId(meta.filename, meta.completed_at),
      filename: meta.filename,
      origin: meta.origin,
      received_at: meta.received_at,
      completed_at: meta.completed_at,
      total_questions: meta.total_questions,
    },
    summary: {
      total_questions: meta.total_questions,
      flagged_count: summary.questions_flagged_for_review,
      flagged_indices: summary.flagged_question_indices,
      total_cost_usd: summary.total_cost_usd,
      total_tokens: summary.total_tokens,
      total_latency_ms: summary.total_latency_ms,
      average_confidence: summary.average_confidence,
      banner: summary.banner,
    },
    answers: answers.map(toAnswerViewModel),
    top_citations: deriveTopCitations(answers),
  };
}
