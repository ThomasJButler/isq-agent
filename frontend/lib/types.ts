// Data contract for the ISQ Agent dashboard (plan-12 §5).
//
// Two shapes live here:
//   1. The BACKEND canonical envelope (`Canonical*`) — the source of truth,
//      mirroring `rag-service/app/api/process.py`'s `ProcessResponse`.
//   2. The VIEW MODEL (`Run*`) the components consume.
//
// `lib/adapter.ts` maps (1) -> (2). The view model is deliberately ergonomic:
// confidence dimensions are flattened, needs_review/review_reason are lifted out
// of the confidence block, citations are renamed, and a `run_id` + `top_citations`
// are derived client-side until the backend emits them.

// ---------------------------------------------------------------------------
// Backend canonical envelope (POST /process-questionnaire)
// ---------------------------------------------------------------------------

export interface CanonicalCitation {
  source_id: string;
  text_snippet: string;
}

export interface CanonicalConfidenceDimensions {
  cites_policy: number;
  on_topic: number;
  vendor_tone: number;
  complete: number;
}

export interface CanonicalConfidence {
  score: number;
  dimensions: CanonicalConfidenceDimensions;
  needs_review: boolean;
  review_reason: string | null;
}

export interface AnswerMetrics {
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
}

export interface CanonicalAnswer {
  question_id: string | null;
  question_text: string;
  answer: string;
  citations: CanonicalCitation[];
  /** `null` when generation failed for this question. */
  confidence: CanonicalConfidence | null;
  metrics: AnswerMetrics;
}

export interface CanonicalMeta {
  origin: string;
  filename: string;
  received_at: string;
  completed_at: string;
  total_questions: number;
  /** Absent today; the backend will add it later (§8). Preferred when present. */
  run_id?: string;
}

export interface CanonicalSummary {
  total_cost_usd: number;
  /** Backend pre-sums tokens; the view shows this single figure (no split). */
  total_tokens: number;
  total_latency_ms: number;
  questions_flagged_for_review: number;
  average_confidence: number;
  flagged_question_indices: number[];
  /** "all_failed" | "all_flagged" | null. */
  banner: string | null;
}

export interface CanonicalEnvelope {
  questionnaire_meta: CanonicalMeta;
  answers: CanonicalAnswer[];
  summary_metrics: CanonicalSummary;
}

// ---------------------------------------------------------------------------
// View model (what the components bind to)
// ---------------------------------------------------------------------------

export interface RunMeta {
  /** Synthesised from filename + completed_at until the backend supplies one. */
  run_id: string;
  filename: string;
  origin: string;
  received_at: string;
  completed_at: string;
  total_questions: number;
}

export interface RunSummary {
  total_questions: number;
  flagged_count: number;
  flagged_indices: number[];
  total_cost_usd: number;
  total_tokens: number;
  total_latency_ms: number;
  average_confidence: number;
  banner: string | null;
}

export interface CitationViewModel {
  id: string;
  snippet: string;
}

/** Confidence with its four dimensions flattened for the bar's tooltip. */
export interface ConfidenceViewModel {
  score: number;
  cites_policy: number;
  on_topic: number;
  vendor_tone: number;
  complete: number;
}

export interface AnswerViewModel {
  index: number;
  question: string;
  answer: string;
  citations: CitationViewModel[];
  /** `null` for a failed answer — render no score bar. */
  confidence: ConfidenceViewModel | null;
  needs_review: boolean;
  review_reason: string | null;
  /** True when the backend returned `confidence: null` (generation failed). */
  failed: boolean;
  metrics: AnswerMetrics;
}

export interface TopCitationViewModel {
  id: string;
  snippet: string;
  /** How many answers cite this source. */
  used_in: number;
}

export interface RunViewModel {
  meta: RunMeta;
  summary: RunSummary;
  answers: AnswerViewModel[];
  top_citations: TopCitationViewModel[];
}
