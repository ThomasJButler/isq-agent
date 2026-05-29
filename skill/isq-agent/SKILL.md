---
name: isq-agent
description: Process supplier Information Security Questionnaires (ISQs). Takes a blank ISQ in PDF or XLSX, retrieves grounded answers from Northstar Labs policies and historical responses via a RAG pipeline, generates Claude-powered answers with per-question confidence scoring and honest review flagging, and produces filled response documents (DOCX, XLSX overlay, structured JSON). Use whenever the user uploads or refers to an ISQ, vendor security questionnaire, supplier security assessment, or supplier due-diligence document, or asks to "process this questionnaire", "answer this ISQ", "fill out this security questionnaire", or "respond to a vendor assessment". Requires the ISQ Agent rag-service running locally on port 8000.
---

# ISQ Agent

Generate professional, evidence-backed answers to supplier Information Security Questionnaires (ISQs), grounded in Northstar Labs policies and historical responses, with honest confidence flagging.

## What it does

1. Accepts a blank ISQ in PDF or XLSX format.
2. Extracts the questions with Claude (tool-use for a guaranteed schema).
3. Retrieves relevant policy chunks and historical answers from the indexed knowledge base.
4. Generates a grounded answer per question via Claude, under strict grounding rules.
5. Scores each answer across four dimensions (cites_policy, on_topic, vendor_tone, complete) and flags low-confidence answers for human review.
6. Assembles one canonical envelope and renders the deliverables: a filled DOCX report, a populated XLSX overlay (for XLSX inputs), and structured JSON.

## When to use

- The user uploads or points to a PDF or XLSX questionnaire.
- The user says "process this ISQ", "answer this vendor security assessment", or similar.
- The user wants draft responses to a supplier due-diligence questionnaire.

## Prerequisites

- The ISQ Agent rag-service must be running locally: `cd ~/Repos/isq-agent && docker compose up`.
- The corpus must be indexed (one-off): `python skill/isq-agent/scripts/reindex_corpus.py`.
- API keys for Voyage, Anthropic and Pinecone configured in the repo `.env`.
- To also render DOCX/XLSX (not just JSON), set `ISQ_AGENT_REPO` to the repo root so the scripts can import the renderers.
- Optional: `ISQ_AGENT_URL` overrides the service URL (default `http://localhost:8000`), and `ISQ_AGENT_TIMEOUT` sets the client timeout in seconds for a whole-questionnaire run (default `600`; raise it for very large questionnaires).

## How to use

When the user asks to process an ISQ:

1. Run `scripts/check_health.py` to confirm the rag-service is reachable (exit 0 = healthy, 2 = a dependency is down, 1 = unreachable).
2. If it is unreachable, ask the user to run `docker compose up` and try again.
3. Identify the ISQ file path (from the user-provided path or the uploaded file).
4. Run `scripts/process_isq.py <file_path>`. It extracts the questions, calls `/process-questionnaire` to answer the whole questionnaire, and writes the outputs to `./outputs/`.
5. Report the results: how many questions were answered, how many were flagged for review, the total cost, and the output file paths.

## Outputs

- `outputs/<filename>_response.json` — the canonical envelope (always written).
- `outputs/<filename>_response.docx` — clean DOCX report (when the renderers are importable).
- `outputs/<filename>_response.xlsx` — populated XLSX overlay (XLSX inputs only).

## Notes

- This skill is a packaged version of the ISQ Agent docker-compose stack. The same engine also runs as an n8n workflow at http://localhost:5678.
- A flagged answer is one the system is not confident in, not a failure: it is surfaced for a human to check, never presented as certain.
- Processing is local-first; nothing leaves the machine except the Anthropic, Voyage and Pinecone API calls.

## See also

- Repo: https://github.com/ThomasJButler/isq-agent
- HTTP contract: `references/service_contract.md`
