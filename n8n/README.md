# n8n workflow — the orchestration tier

The ISQ Agent is two tiers: a **FastAPI `rag-service`** that owns all the AI work (extraction,
retrieval, grounded generation, confidence scoring, rendering), and an **n8n** layer that
orchestrates it — the "built using n8n or a similar workflow automation platform" the brief
asks for. n8n drives the flow; the service is the engine it calls over HTTP, exactly the
"additional external tools" pattern the brief welcomes.

This folder holds an importable **starting workflow** for the **manual dashboard upload** input
method. It is verified to import cleanly into n8n (2.22.5); the last hop (file delivery) is the
one piece worth finishing + confirming in the editor on a live submission — see "Finish in the
editor" below.

## The flow

```
Form Trigger (upload a PDF/DOCX/XLSX)
  → POST http://rag-service:8000/runs        the engine: extract → answer → store → envelope
  → POST .../render  (docx)                   render each format from the same envelope
  → POST .../render  (xlsx)
  → POST .../render  (json)
  → Combine files    (Code)                   gather the 3 binaries onto one item
  → Zip deliverables (Compression)            one download
  → Deliver download (Form completion)
```

## Node by node

| Node | Type | What it does |
|---|---|---|
| **Form Trigger** | `formTrigger` | Serves an upload form at `/form/isq-upload`. One required **file** field, `Questionnaire`, accepting `.pdf,.docx,.xlsx`. The uploaded file arrives as a binary on the item. |
| **POST /runs (answer)** | `httpRequest` | Multipart POST to `/runs`: sends the uploaded file as the `file` part (`formBinaryData`, `inputDataFieldName: Questionnaire`) plus an `origin` text field. The service extracts the questions, answers them (concurrently), and returns the canonical envelope JSON. 5-minute timeout, since a big questionnaire is several LLM calls. |
| **Render DOCX / XLSX / JSON** | `httpRequest` ×3 | Multipart POST to `/render`: a `format` text field (`docx`/`xlsx`/`json`) and an `envelope` field set to `={{ JSON.stringify($('POST /runs (answer)').item.json) }}` — the full envelope, stringified. `responseFormat: file` captures the returned attachment into a distinct binary property (`docx`/`xlsx`/`json`). |
| **Combine files** | `code` | Pulls each render node's binary onto a single item so the next node has all three. |
| **Zip deliverables** | `compression` | Zips the three binaries into `isq-deliverables.zip`. |
| **Deliver download** | `form` (completion) | Returns the zip to the browser as the form's completion. |

## Prerequisites

- `docker compose up` from the repo root brings up **n8n** (`:5678`) and **rag-service** (`:8000`)
  on the same network, so the workflow's `http://rag-service:8000` URLs resolve.
- The rag-service needs the repo-root `.env` (Voyage / Anthropic / Pinecone keys) and the
  knowledge base built once: `curl -X POST http://localhost:8000/index -d '{"force_reindex":true}' -H "Content-Type: application/json"`.

## Import

In the n8n editor (`http://localhost:5678`): **top-right menu → Import from File →**
`n8n/workflows/isq-agent-form-upload.json`. Or via the CLI inside the container:

```bash
docker compose cp n8n/workflows/isq-agent-form-upload.json n8n:/tmp/wf.json
docker compose exec n8n n8n import:workflow --input=/tmp/wf.json
docker compose restart n8n   # so the editor picks it up
```

Then **activate** it and open the form at `http://localhost:5678/form/isq-upload`.

## Finish in the editor

The orchestration (trigger → runs → render ×3) is wired and imports clean. Two things are worth
confirming on a live submission, because they depend on the running n8n version's exact behaviour:

1. **The upload's binary key.** Submit a small PDF and look at the Form Trigger's output: confirm
   the uploaded file's binary property is named `Questionnaire`. If the version keys it
   differently, update `inputDataFieldName` on the **POST /runs** node to match.
2. **Delivery.** A single Form completion can only return **one** file, so the workflow zips the
   three. If the zip download is malformed on your n8n version (a known compression-before-form
   quirk on some builds), the simplest robust fallback is to mount a writable `./outputs` volume
   on the n8n service and swap the tail (Combine → Zip → Deliver) for three `Read/Write File`
   nodes writing `response.{docx,xlsx,json}` to `/outputs`, ending with a text completion.

## Credentials

None. The rag-service is unauthenticated on the internal docker network and the form needs no
login. See `credentials-template.md`.
