# Requirements coverage

Every requirement in the RiverAI ISQ Agent brief, mapped to where it's met in this solution, with
honest notes where something is a scaffold rather than a fully-run path.

## Core requirements

| # | Requirement | Met by | Status |
|---|---|---|---|
| 1 | Accept a blank ISQ document | `POST /runs` (multipart file upload, `rag-service/app/api/runs.py`); the deployed dashboard's upload screen; the n8n Form Trigger. PDF is the brief's stated format; DOCX/XLSX also accepted. | ✅ |
| 2 | Extract the questions | `QuestionExtractor` (`app/extraction/extractor.py`) via Claude tool-use; exposed as `POST /extract-questions` and run inside `/runs`. Verified: 20 questions extracted from the real Sunflowers/Blackridge PDFs. | ✅ |
| 3 | Identify relevant supporting info (policies + previous ISQs) | `Retriever` (`app/rag/retriever.py`): query-rewrite → Voyage embed → Pinecone search over the indexed Northstar **policies + historical ISQs** → **source weighting** (policies ×1.0, historical ISQs ×0.95) → `min_score` 0.5 floor → top-k 5. Every answer cites the chunk it used. | ✅ |
| 4 | Generate suitable answers using an AI model | `AnswerGenerator` (`app/rag/generator.py`): one Claude call per question, forced `submit_answer` tool-use for schema-valid JSON, strict grounding prompt. Model is selectable (Sonnet 4.5/4.6, Opus 4.7/4.8, Haiku 4.5). | ✅ |
| 5 | Populate / produce an output document | `POST /render` produces **DOCX, XLSX and JSON** (`app/render/`); the dashboard offers all three as downloads; the n8n flow zips + delivers them. | ✅ |
| 6 | Flag answers where evidence is weak or missing | Hybrid confidence (`app/confidence/`): 4 weighted dimensions + 3 flag triggers; a question with no grounded chunks returns a deterministic "cannot answer from policy" (not an invention) and is flagged; a failed generation is null-confidence and flagged. Surfaced in the UI and inside the rendered documents. | ✅ |

## Answer rules

| Rule | Met by |
|---|---|
| Prefer official policy documents | Source weighting puts policies (×1.0) above historical ISQs (×0.95) before the score floor; the prompt instructs policy-first. |
| Use previous completed ISQs where relevant | Historical ISQs are indexed alongside policies and cited when they're the best match. |
| Avoid unsupported claims | Strict grounding prompt + a **citation lint** that penalises the grounding score (−0.2 on `cites_policy`) for any cited source the model wasn't actually given, pushing it toward the review flag; no-chunks → a deterministic "contact us" answer, never an invented one. |
| Mark uncertain answers as needing review | The flagging above; `needs_review` + a human-readable reason on every flagged answer. |
| Concise but professional | A `vendor_tone` confidence dimension + the answer prompt; verified on real runs (vendor-appropriate prose with citations). |
| Appropriate client/vendor tone | Same; answers read as supplier security responses, and honestly reframe out-of-scope questions (e.g. "Northstar is software-only, no OT/SCADA"). |

## Input

| Brief item | Status |
|---|---|
| Accept a blank ISQ via one or more of: email / API-webhook / **manual dashboard upload** / cloud-folder | ✅ — **manual dashboard upload** is satisfied two ways: the deployed Next.js dashboard and the n8n Form Trigger. (Both are the *same* brief category — two surfaces, not two of the four methods. Email/webhook/cloud-folder are not built; the n8n credentials note documents how they'd be added.) |
| Questionnaires come through as PDF | ✅ — PDF is the primary path (DOCX/XLSX also supported). |

## Knowledge documents

| Brief item | Status |
|---|---|
| Use Northstar policy documents | ✅ — indexed into Pinecone via `POST /index`; the grounding source. |
| Use previous completed ISQs | ✅ — indexed alongside, source-weighted slightly below policies. |
| Example blank ISQ questionnaires | ✅ — the real samples drive testing; the app ships three of our own fictional 20-question examples (RiverAI's stay private). |

## Platform

| Brief item | Status |
|---|---|
| Built using **n8n or a similar workflow automation platform**, rather than entirely code based | ✅ (scaffold) — an importable n8n workflow in [`n8n/`](../n8n/) orchestrates the engine (Form → `/runs` → render → deliver). n8n owns the workflow; the FastAPI `rag-service` is the AI engine it calls over HTTP (the "additional external tools" the brief welcomes). **Honest status:** verified to import cleanly into n8n 2.22.5 (all nodes resolve, all connections wired); finished in the editor and not yet run through a paid end-to-end submission. The deployed dashboard is the shipped, fully-run front door over the same service. |

## Technical walkthrough (the seven explain-points)

| Point | Where it's covered |
|---|---|
| Workflow architecture + design decisions | [`technical-walkthrough.md`](technical-walkthrough.md) §1, [`architecture.md`](architecture.md), `n8n/README.md` |
| How documents are processed and analysed | [`technical-walkthrough.md`](technical-walkthrough.md) §2 (PDF/DOCX/XLSX → 500/50 chunking → Voyage embed → deterministic Pinecone IDs) |
| How relevant information is identified | [`technical-walkthrough.md`](technical-walkthrough.md) §3 (weighting before the floor, top-k, why in code) |
| How AI answers are produced | [`technical-walkthrough.md`](technical-walkthrough.md) §4 (one call, forced tool-use, strict prompt, citation lint) |
| How low-confidence answers are handled | [`technical-walkthrough.md`](technical-walkthrough.md) §5, `architecture.md` (4 dimensions, 3 triggers, real flagged examples) |
| Limitations and trade-offs | [`technical-walkthrough.md`](technical-walkthrough.md) §6, `SECURITY.md`, `v1.1-backlog.md` |
| Improvements given more time | `v1.1-backlog.md`, `performance-optimisation.md` (sub-10s plan) |

## Beyond the brief (engineering quality)

Not asked for, but done because the brief says "work well, be honest": per-IP rate limiting + a
question cap + an ASGI body-size cap (cost/abuse guards, `SECURITY.md`); a ~6× performance pass
([`performance-optimisation.md`](performance-optimisation.md)); ~280 backend tests (plus the
frontend suite); every PR independently reviewed for bugs **and** brief-compliance; and a catalogue
of the unplanned fixes found along the way ([`unplanned-fixes.md`](unplanned-fixes.md)).
