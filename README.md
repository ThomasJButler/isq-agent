# ISQ Agent

> AI-powered workflow that ingests supplier security questionnaires (PDF/XLSX),
> retrieves grounded answers from a knowledge base of policies + historical
> responses, and produces filled response documents in three formats with
> honest confidence flagging.

Built by Tom Butler for the RiverAI AI Engineer technical challenge.

---

> ⚠️ **WORK IN PROGRESS.** This README will be rewritten on submission Friday
> per `plans/plan-11-final-consolidation.md` Section 1.

---

## Quick links

- Project plans (12 iterations + 3 audits): [`plans/`](./plans/)
- Design artefacts (Iteration 3 — Claude × RiverAI Hybrid): [`design/`](./design/)
- Daily execution checklist: [`plans/EXECUTION-CHECKLIST.md`](./plans/EXECUTION-CHECKLIST.md)
- Master implementation prompt: [`plans/implementation-chat-prompt.md`](./plans/implementation-chat-prompt.md)

## Local setup (rough)

```bash
cp .env.example .env  # fill in VOYAGE_API_KEY, ANTHROPIC_API_KEY, PINECONE_API_KEY
docker compose up     # starts n8n on :5678 and rag-service on :8000
```

Open http://localhost:5678 to use the n8n workflow.

## Tech stack

n8n (workflow) · Python 3.11 + FastAPI (RAG service) · Anthropic Claude Sonnet 4.5
· Voyage AI (embeddings) · Pinecone (vector store) · python-docx + openpyxl
(rendering) · Docker Compose.

## Confidence scoring

Every answer carries a confidence score (0.0–1.0) and a `needs_review` flag. The
score is a weighted mean of four dimensions the model self-scores, with grounding
weighted heaviest because an ungrounded answer is the worst failure for an
audit-facing tool:

| Dimension | Weight | What it measures |
|---|---|---|
| `cites_policy` | 0.40 | Is the answer grounded in a policy / historical ISQ? |
| `on_topic` | 0.25 | Does it answer the question actually asked? |
| `vendor_tone` | 0.20 | Does it read as a professional vendor response? |
| `complete` | 0.15 | Is it complete? (partial-but-correct beats complete-but-wrong) |

An answer is flagged for human review if any one of three triggers fires: the
aggregate is below `0.6`, `cites_policy` is below `0.5` (ungrounded even if otherwise
strong), or the model itself raised a review reason (e.g. a scope mismatch). A
retrieval sanity check also downgrades `cites_policy` when the model over-claims
grounding relative to what was actually retrieved. The weights and thresholds live in
`rag-service/app/confidence/aggregator.py` so the bias is auditable.

## Licence

MIT — see [LICENSE](LICENSE)
