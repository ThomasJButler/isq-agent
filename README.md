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

## Licence

MIT — see [LICENSE](LICENSE)
