# ISQ Agent rag-service — HTTP contract

The skill scripts call the rag-service over HTTP (default `http://localhost:8000`, override
with `ISQ_AGENT_URL`). This is the contract they rely on.

## GET /health

Liveness check. Returns `{"status": "ok"}` today; a later iteration adds a `dependencies` map
(`{pinecone, voyage, anthropic}` booleans). `check_health.py` handles both shapes.

## POST /index

Build or rebuild the knowledge base from the source corpus.

- Request: `{"force_reindex": bool}` (default false).
- Response (new/forced): `{status, chunks_indexed, documents_indexed, indexing_time_ms, embedding_tokens_used, estimated_cost_usd}`.
- Response (already indexed): `{status: "already_indexed", vector_count}`.

`reindex_corpus.py` posts `{"force_reindex": true}`.

## POST /extract-questions

Turn a questionnaire into a structured question list.

- Request: `{source_format: "pdf" | "xlsx_rows", source_text?: str, source_rows?: list[dict], filename: str}`.
  `source_text` is required for `pdf`; `source_rows` for `xlsx_rows`.
- Response: `{questions: [{question_id, index, text, page}], total, extraction_method, warnings, metrics}`.

## POST /answer

Answer one question, grounded in the knowledge base.

- Request: `{question: str, question_id?: str, index?: int, total?: int}`.
- Response: `{question_id, answer, citations: [{source_id, text_snippet}], confidence: {score, dimensions, needs_review, review_reason}, metrics: {tokens_in, tokens_out, cost_usd, latency_ms}}`.
- Transient upstream failures map to 503 (retryable); permanent ones to 502.

## POST /process-questionnaire

Answer a whole questionnaire and assemble the canonical envelope. This is what `process_isq.py`
calls after extracting the questions.

- Request: `{origin: str, filename: str, received_at?: str, questions: [{question_id, text, index?}]}`.
- Response (the canonical envelope every renderer consumes):

```json
{
  "questionnaire_meta": {"origin", "filename", "received_at", "completed_at", "total_questions"},
  "answers": [
    {
      "question_id", "question_text", "answer",
      "citations": [{"source_id", "text_snippet"}],
      "confidence": {"score", "dimensions", "needs_review", "review_reason"},
      "metrics": {"tokens_in", "tokens_out", "cost_usd", "latency_ms"}
    }
  ],
  "summary_metrics": {
    "total_cost_usd", "total_tokens", "total_latency_ms",
    "questions_flagged_for_review", "average_confidence",
    "flagged_question_indices", "banner"
  }
}
```

- A question whose generation failed carries `confidence: null` and is counted as flagged.
- `banner` is `"all_flagged"`, `"all_failed"`, or `null`.

## POST /render

Render the canonical envelope to a downloadable file. The n8n workflow uses this because it
can't import the Python renderers in-process the way the skill does.

- Request (`multipart/form-data`): `format` (`docx` | `xlsx` | `json`), `envelope` (the
  canonical envelope as a JSON string), and an optional `source` file (the original `.xlsx`
  workbook, used to overlay answers for XLSX inputs).
- Response: the rendered file as an attachment (`Content-Disposition: attachment`) with the
  matching content type. For `xlsx`, answers are overlaid onto `source` when it is supplied,
  otherwise a standalone workbook is produced. Unknown formats and malformed envelopes return
  400.
