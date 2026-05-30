// API client for the deployed rag-service (NEXT_PUBLIC_API_URL = the Render URL).
// Two flows the dashboard drives directly, with no n8n in the hosted path:
//   - createRun: extract a questionnaire's questions, then answer them into a stored run.
//   - fetchRun:  load a stored run by id for the results screen.
// No DOM here, so both are unit-testable with a mocked fetch.

import type { CanonicalEnvelope } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Thrown when GET /runs/{id} 404s — the run never existed or has expired (runs are
 *  kept in memory on the single-instance deploy and don't survive a restart). */
export class RunNotFoundError extends Error {
  constructor(runId: string) {
    super(`Run "${runId}" was not found. Runs are kept in memory and don't survive a restart.`);
    this.name = "RunNotFoundError";
  }
}

/** A questionnaire source: a PDF's extracted text, or an XLSX's rows. */
export type RunSource =
  | { source_format: "pdf"; source_text: string }
  | { source_format: "xlsx_rows"; source_rows: Record<string, unknown>[] };

export interface CreateRunInput {
  filename: string;
  origin: string;
  source: RunSource;
  /** Optional Anthropic model id for answer generation (the picked model). The backend
   *  validates it against an allowlist and falls back to its default if absent/invalid. */
  model?: string;
}

interface ExtractedQuestion {
  question_id: string;
  index: number;
  text: string;
  page?: number | null;
}

/** GET /runs/{id} → the stored canonical envelope. Throws RunNotFoundError on 404. */
export async function fetchRun(
  runId: string,
  baseUrl: string = API_BASE,
): Promise<CanonicalEnvelope> {
  const res = await fetch(`${baseUrl}/runs/${encodeURIComponent(runId)}`);
  if (res.status === 404) throw new RunNotFoundError(runId);
  if (!res.ok) throw new Error(`Failed to load run (${res.status}).`);
  return (await res.json()) as CanonicalEnvelope;
}

/**
 * Run a questionnaire end to end: extract its questions (POST /extract-questions), then
 * answer them (POST /process-questionnaire). Returns the backend-assigned run_id (for the
 * results URL) plus the answered envelope.
 */
export async function createRun(
  input: CreateRunInput,
  baseUrl: string = API_BASE,
): Promise<{ run_id: string; envelope: CanonicalEnvelope }> {
  const extractRes = await fetch(`${baseUrl}/extract-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input.source, filename: input.filename }),
  });
  if (!extractRes.ok) {
    throw new Error(`Question extraction failed (${extractRes.status}).`);
  }
  const { questions } = (await extractRes.json()) as { questions: ExtractedQuestion[] };

  const processRes = await fetch(`${baseUrl}/process-questionnaire`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: input.origin,
      filename: input.filename,
      questions: questions.map((q) => ({
        question_id: q.question_id,
        text: q.text,
        index: q.index,
      })),
      ...(input.model ? { model: input.model } : {}),
    }),
  });
  if (!processRes.ok) {
    throw new Error(`Answer generation failed (${processRes.status}).`);
  }
  const envelope = (await processRes.json()) as CanonicalEnvelope;
  return { run_id: envelope.questionnaire_meta.run_id ?? "", envelope };
}

/**
 * Upload a questionnaire FILE (PDF / DOCX / XLSX) to POST /runs: the backend extracts the
 * text, extracts the questions, answers them, and stores the run. Returns the run_id (for
 * the results URL) + envelope. This is the dashboard's manual-file-upload path — the
 * challenge's "accept a blank ISQ document".
 */
export async function uploadRun(
  file: File,
  model?: string,
  baseUrl: string = API_BASE,
): Promise<{ run_id: string; envelope: CanonicalEnvelope }> {
  const form = new FormData();
  form.append("file", file);
  if (model) form.append("model", model);
  const res = await fetch(`${baseUrl}/runs`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}).`);
  }
  const envelope = (await res.json()) as CanonicalEnvelope;
  return { run_id: envelope.questionnaire_meta.run_id ?? "", envelope };
}
