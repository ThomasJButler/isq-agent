# Plan 3 — Architecture Proper, Failure Modes, FastAPI Scaffolding

**Status:** Architecture concrete. Diagram, walkthrough with real data, failure-mode map, observability strategy, second manual coding exercise.

> **TDD retroactive note (added 2026-05-25):** TDD is paramount from Plan 4 onwards. The FastAPI `main.py` from Manual Coding Exercise 2 in this plan needs a test-file companion (`tests/test_main.py`) — covering: root route returns expected JSON, CORS middleware allows configured origins, lifespan startup logs key config without secrets, /health endpoint registers. That test file will be written when you reach Plan 5's branching/CI setup. For Exercise 2 right now: type main.py as written, but plan to write its tests in Plan 5.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1 (decisions locked) ✅, Plan 2 (stack + repo + service contract) ✅

---

## 0. What this plan does and doesn't do

**Locks in:**
- A renderable architecture diagram (Mermaid)
- End-to-end walkthrough with a real Sunflowers Charity question following the data
- Component responsibilities (what owns state, what's stateless)
- Error propagation rules + failure-mode mapping table
- Logging + cross-system observability strategy (request_id propagation)
- FastAPI `main.py` scaffold (Manual Coding Exercise 2)

**Doesn't yet cover:**
- Knowledge base chunking + indexing strategy (Plan 4)
- Question extraction from PDF/XLSX (Plan 5)
- Answer generation prompt + few-shot examples (Plan 6)
- Confidence scoring weights + thresholds (Plan 7)
- Output rendering libraries + style (Plan 8)
- Demo walkthrough script (Plan 9)
- Final consolidation + execution timeline (Plan 10)

---

## 1. Architecture diagram (Mermaid — paste into any md viewer)

```mermaid
flowchart TB
  subgraph DevTier[Tier 0 — Dev-time Claude Code Harness]
    direction TB
    AC[Anchor / gicc subagent harness]
    RL[Ralph loops for overnight iteration]
    CCS[Custom Claude Code skills + MCPs]
  end

  subgraph User[User / Demo Client]
    U[Tom or Lee uploading an ISQ]
  end

  subgraph n8n[Tier 1 — n8n Workflow Engine :5678]
    direction TB
    FT[Form Trigger node<br/>upload UI]
    ET[Email Trigger node<br/>IMAP/Gmail]
    PP[PDF Parser node]
    XP[XLSX Parser node]
    QE[Question Extractor<br/>Claude via Anthropic node]
    LOOP[HTTP Request loop<br/>per question]
    AS[Assemble canonical JSON]
    R1[Render JSON]
    R2[Render DOCX<br/>python-docx]
    R3[Render filled original<br/>PDF/XLSX]
    DL[Deliver download links<br/>via Form response]
  end

  subgraph rag[Tier 2 — Python RAG Service :8000]
    direction TB
    HEALTH[/GET /health/]
    INDEX[/POST /index/]
    ANSWER[/POST /answer/]
    QR[Query Rewriter<br/>Claude]
    EMBED[Voyage embedding<br/>voyage-3-large]
    SEARCH[Pinecone vector search]
    GEN[Generator<br/>Claude single-call<br/>NewsPerspective shape]
    CONF[Multi-dim confidence<br/>ReviewBot shape]
  end

  subgraph external[External Services]
    V[(Voyage AI<br/>embedding API)]
    P[(Pinecone<br/>vector store)]
    A[(Anthropic Claude<br/>generation API)]
  end

  subgraph storage[Filesystem]
    SC[/source-corpus/<br/>policies + historical ISQs]
    LOGS[stdout logs<br/>structured JSON]
  end

  U --> FT
  U -.email.-> ET
  FT --> PP
  FT --> XP
  ET --> PP
  PP --> QE
  XP --> QE
  QE --> LOOP
  LOOP -- POST /answer per question --> ANSWER
  LOOP --> AS
  AS --> R1 & R2 & R3
  R1 & R2 & R3 --> DL
  DL --> U

  ANSWER --> QR
  QR --> EMBED
  EMBED --> SEARCH
  SEARCH --> GEN
  GEN --> CONF
  CONF -. response .-> ANSWER

  QR --> A
  EMBED --> V
  SEARCH --> P
  GEN --> A
  CONF --> A

  INDEX --> SC
  INDEX --> EMBED
  INDEX --> P

  HEALTH -.checks.-> V & P & A

  ANSWER -.logs.-> LOGS
  INDEX -.logs.-> LOGS

  style n8n fill:#e3f2fd,stroke:#1976d2
  style rag fill:#f3e5f5,stroke:#7b1fa2
  style external fill:#fff3e0,stroke:#f57c00
  style storage fill:#f1f8e9,stroke:#558b2f
```

**Reading guide:**
- **Tier 0** = dev-time only (Claude Code harness orchestrating the build itself — not runtime)
- **Blue** = Tier 1 (n8n workflow — runtime orchestration)
- **Purple** = Tier 2 (Python RAG service — runtime AI logic)
- **Orange** = External APIs (Voyage, Pinecone, Anthropic)
- **Green** = Filesystem (read-only corpus, stdout logs)
- Solid arrows = synchronous calls
- Dotted arrows = side-effects (logs, optional paths, response returns)

**On Tier 0:** Claude Code (Anchor harness, Ralph loops, custom skills/MCPs) is the *dev-time* orchestrator that built the runtime. Not part of the deployed system but part of the engineering story. The packaged `.skill` file (Plan 9.5) is itself a Tier-0 artefact that ships to consumers — a Claude Code skill anyone can install.

**Optional Plan 6 MCP layer:** the `/extract-questions` endpoint could be wrapped as an MCP tool so any Claude Code chat can invoke it. Mentioned as a stretch goal in Plan 6.

---

## 2. End-to-end walkthrough — one Sunflowers question

Concrete data flow for **Question 1: "Do you maintain a formal Information Security Policy?"**

### Step 1 — Upload arrives

User drops `Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf` into the n8n Form Trigger.

```json
// Form Trigger emits:
{
  "filename": "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
  "mimetype": "application/pdf",
  "size_bytes": 6300,
  "binary_data_id": "n8n-bin-abc123"
}
```

### Step 2 — PDF parse

PDF Parser node extracts text page-by-page.

```json
// PDF Parser emits:
{
  "pages": [
    { "page_number": 1, "text": "Sunflowers Charity\nSupplier Information Security Questionnaire\n..." },
    { "page_number": 2, "text": "5. Are penetration tests conducted...\n..." },
    { "page_number": 3, "text": "12. What are your Recovery Time Objective..." },
    { "page_number": 4, "text": "19. Do you maintain audit logs..." }
  ],
  "page_count": 4
}
```

### Step 3 — Question extraction (Claude call)

Question Extractor node sends a prompt to Claude:

```
SYSTEM: You extract numbered questions from a supplier security questionnaire.
Return a JSON array. Each question gets: { "index": N, "text": "...", "page": N }.
Ignore headers, instructions, response boxes. Only extract the numbered questions.

USER: [full PDF text]
```

Claude returns:

```json
{
  "questionnaire_origin": "Sunflowers Charity",
  "total_questions": 20,
  "questions": [
    { "index": 1, "text": "Do you maintain a formal Information Security Policy?", "page": 1 },
    { "index": 2, "text": "Is multi-factor authentication (MFA) enforced for staff access to business systems?", "page": 1 },
    // ... 18 more
    { "index": 20, "text": "Please provide details of any relevant certifications or compliance frameworks followed by your organisation.", "page": 4 }
  ]
}
```

### Step 4 — Per-question loop (HTTP to rag-service)

n8n loops through `questions[]`. For Q1:

```http
POST http://rag-service:8000/answer HTTP/1.1
Content-Type: application/json
X-Request-Id: sun-20260525-001-q01

{
  "question": "Do you maintain a formal Information Security Policy?",
  "source_format": "pdf",
  "hints": {
    "question_index": 1,
    "total_questions": 20,
    "questionnaire_origin": "Sunflowers Charity"
  },
  "conversation_id": "sun-20260525-001"
}
```

### Step 5 — Inside rag-service for Q1

**Step 5a — Query rewrite** (Claude, ~200 tokens)

Query rewriter expands the question into a richer retrieval query:

```
INPUT: "Do you maintain a formal Information Security Policy?"
OUTPUT: "formal information security policy ISP document governance ownership annual review approval senior leadership scope access control encryption acceptable use security responsibilities asset management incident management"
```

The expanded query covers more of the vocabulary used in the actual policy documents — improves recall.

**Step 5b — Embed** (Voyage, ~30 tokens)

The expanded query goes to Voyage → returns a 1024-dim vector.

```
[0.012, -0.034, 0.078, ..., 0.041]  // 1024 floats
```

**Step 5c — Vector search** (Pinecone, <100ms)

Pinecone returns top 5 most similar chunks across the entire indexed corpus.

```json
[
  {
    "id": "isp-001",
    "score": 0.89,
    "metadata": {
      "source": "Northstar_Labs_Information_Security_Policy.pdf",
      "page": 1,
      "text": "Northstar Labs is a UK-based software development and AI solutions company committed to maintaining high standards of information security..."
    }
  },
  {
    "id": "hist01-q1",
    "score": 0.85,
    "metadata": {
      "source": "Northstar_Labs_Previous_ISQ_Completed_01.pdf",
      "page": 1,
      "text": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership..."
    }
  },
  // 3 more chunks with progressively lower scores
]
```

**Step 5d — Generate** (Claude, single-call multi-field per NewsPerspective pattern)

System prompt (SQL-Ball-style strict rules):

```
You are an Information Security Lead at Northstar Labs answering a supplier security questionnaire.

STRICT RULES:
1. Use ONLY the policy chunks and historical ISQ chunks provided below.
2. Do not invent claims not present in the source.
3. Prefer policy chunks over historical ISQ chunks where both are available.
4. Tone: professional, vendor-appropriate, concise. Mirror the style of the historical ISQs.
5. If no source supports the answer, return needs_review: true with a reason.

OUTPUT JSON SCHEMA:
{
  "answer": "string — the answer to give the requester",
  "citations": [{ "source_id": "string", "text_snippet": "string up to 200 chars" }],
  "self_score": {
    "cites_policy": 0.0-1.0,
    "on_topic": 0.0-1.0,
    "vendor_tone": 0.0-1.0,
    "complete": 0.0-1.0
  },
  "needs_review_reason": "string or null"
}

CHUNKS:
[isp-001] Northstar Labs is a UK-based software development...
[hist01-q1] Yes. Northstar Labs maintains a formal Information Security Policy...
[isp-002] All employees, contractors, and third parties...

QUESTION: Do you maintain a formal Information Security Policy?
```

Claude returns:

```json
{
  "answer": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership. The policy covers access control, encryption, acceptable use, security responsibilities, asset management, and incident management.",
  "citations": [
    { "source_id": "isp-001", "text_snippet": "Northstar Labs is a UK-based software development and AI solutions company committed to maintaining high standards of information security..." },
    { "source_id": "hist01-q1", "text_snippet": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually..." }
  ],
  "self_score": { "cites_policy": 1.0, "on_topic": 0.95, "vendor_tone": 0.90, "complete": 0.80 },
  "needs_review_reason": null
}
```

**Step 5e — Confidence aggregation** (no LLM, pure code)

```python
aggregate = weighted_mean({
  "cites_policy": (1.0, weight=0.4),    # most important — grounded?
  "on_topic": (0.95, weight=0.25),
  "vendor_tone": (0.90, weight=0.20),
  "complete": (0.80, weight=0.15),
})  # = 0.927

# Sanity check: top retrieval similarity score
sanity = top_score >= 0.7  # True (0.89 >= 0.7)

needs_review = aggregate < 0.6 or not sanity  # False
```

**Step 5f — Response back to n8n**

```json
{
  "answer": "Yes. Northstar Labs maintains a formal Information Security Policy...",
  "citations": [...],
  "confidence": {
    "score": 0.927,
    "dimensions": { "cites_policy": 1.0, "on_topic": 0.95, "vendor_tone": 0.90, "complete": 0.80 },
    "needs_review": false,
    "review_reason": null
  },
  "metrics": {
    "tokens_in": 1240,
    "tokens_out": 95,
    "embedding_tokens": 23,
    "cost_usd": 0.0042,
    "latency_ms": 1820
  }
}
```

### Step 6 — Loop continues

n8n processes Q2 through Q20 the same way. Approximate parallelism: 5-10 questions concurrent (n8n's HTTP Request node supports this).

### Step 7 — Assemble canonical JSON

After all 20 questions answered:

```json
{
  "questionnaire_meta": {
    "origin": "Sunflowers Charity",
    "filename": "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
    "received_at": "2026-05-25T19:30:00Z",
    "completed_at": "2026-05-25T19:30:42Z",
    "total_questions": 20
  },
  "answers": [ /* 20 answer objects */ ],
  "summary_metrics": {
    "total_cost_usd": 0.078,
    "total_tokens": 28400,
    "total_latency_ms": 42000,
    "questions_flagged_for_review": 2
  }
}
```

### Step 8 — Render three outputs in parallel

- **JSON**: serialise canonical JSON to file
- **DOCX**: python-docx in a Code node assembles a clean report
- **Filled PDF**: PDF overlay (pdf-lib or similar) populates Response boxes

### Step 9 — Deliver

n8n Form returns a response page with three download links.

```
✓ Your questionnaire has been processed.
  → Sunflowers_Filled.pdf  (1.4 MB)
  → Sunflowers_Response.docx  (24 KB)
  → Sunflowers_Response.json  (18 KB)

  20 questions answered, 2 flagged for review.
  Total cost: $0.078  ·  Total time: 42s
```

---

## 3. Component responsibilities (state ownership)

| Component | Owns | State | Notes |
|---|---|---|---|
| **n8n** | workflow orchestration, file I/O, format detection, rendering, delivery, UI | Per-execution state (ephemeral, logged in n8n DB) | Stateful per workflow run; stateless across runs |
| **rag-service** | embedding, retrieval, generation, confidence scoring, citation tracking, cost tracking | Stateless per request | No in-memory caches yet (could add LRU in a future pass) |
| **Pinecone** | vector storage + similarity search | Persistent vector index | Only stateful component we own; survives restarts |
| **Voyage** | embedding generation | None on our side | External API, treated as pure function |
| **Anthropic** | LLM generation | None on our side | External API, treated as pure function |
| **Source corpus volume** | policies + historical ISQs | Read-only filesystem mount | Provided by RiverAI, treat as their IP |
| **n8n credentials store** | API keys (Anthropic, Voyage, Gmail) | Encrypted local volume `n8n_data` | Never committed to git |

### Why this matters

- **Pinecone is the only stateful component we own** — backup/restore matters in production. For the assessment we'll mention this as "in production I'd add scheduled re-indexing + versioned indexes."
- **rag-service is stateless** — horizontally scales by adding more containers. Walkthrough talking point: "if Northstar gets hundreds of ISQs per day, scaling is `docker compose up --scale rag-service=5`."
- **n8n execution state is per-run** — if the workflow crashes mid-run, n8n can retry from the failed node. Built-in resilience.

---

## 4. Error propagation + failure-mode map

### Failure-mode table

| Failure | Detection point | Surface to user | Recovery |
|---|---|---|---|
| Voyage 5xx (embedding API down) | rag-service `/answer` route, exception from voyage client | n8n retries 3× with exponential backoff (1s, 4s, 16s). If still failing: "Embedding service temporarily unavailable. Please retry in a few minutes." | Wait + retry, or fall back to cached embeddings if implemented |
| Voyage rate limit (429) | voyage client raises | n8n waits per `Retry-After` header, then retries | Backoff |
| Pinecone unreachable | rag-service `/answer` route catches connection error | n8n retries 3× then surfaces "Knowledge base unreachable. Check Pinecone status." | Check status page, retry |
| Pinecone index empty | rag-service `/index/health` returns `index_loaded: false` | "Knowledge base not loaded. Run `POST /index` first." | Trigger index workflow |
| Anthropic rate limit (429) | rag-service `/answer` catches | n8n waits per `Retry-After`, retries the failing question only | Per-question retry preserves partial completion |
| Anthropic content filter / refusal | Generator returns unexpected output | rag-service flags `needs_review: true` with reason `"LLM declined to answer"`. Other questions continue. | Manual review of the source question |
| PDF parse failure (corrupted PDF) | n8n PDF Parser node throws | "Couldn't parse this document. Is it a valid PDF? You can also try uploading a DOCX or XLSX." | User re-uploads or tries a different format |
| XLSX parse failure | n8n Spreadsheet node throws | "Couldn't parse spreadsheet. Please check the file isn't password-protected or corrupted." | User re-uploads |
| Question extraction returns 0 questions | n8n branches on `questions.length === 0` | "No numbered questions detected. Is this a questionnaire? Try a different document." | User reviews source |
| Question extraction returns >100 questions | n8n branches on count | Warn user but proceed: "100+ questions detected — this will take ~5 minutes and cost ~$0.40. Continue?" | User confirms or cancels |
| All answers low confidence (every question flagged) | n8n inspects `summary_metrics.questions_flagged_for_review === total_questions` | Output produced with prominent banner: "⚠ ALL ANSWERS NEED REVIEW. The knowledge base may not cover this questionnaire's domain." | User reviews source corpus coverage |
| rag-service container down | n8n HTTP Request node gets connection refused | "Backend service offline. Check `docker compose ps`." | Restart container |
| n8n container down | User can't access UI | n8n side, not rag-service side. User restarts n8n. | `docker compose restart n8n` |
| Disk full (output rendering fails) | n8n write step throws ENOSPC | "Disk full. Free space and retry." | OS-level — no code path. Mention as walkthrough talking point only. |

### Retry policy (locked)

| Failure type | Retries | Backoff | Surface after |
|---|---|---|---|
| 5xx / connection error | 3 | 1s, 4s, 16s | Final retry |
| 429 / rate limit | Until Retry-After expires (max 60s wait) | Per `Retry-After` header | Wait expired |
| 4xx other than 429 | 0 (don't retry client errors) | n/a | Immediately |
| Voyage / Pinecone transient | 3 | 1s, 4s, 16s | Final retry |

### Partial completion is acceptable

If 18 of 20 questions succeed and 2 fail, n8n still assembles the canonical JSON with the 18 answers + 2 entries marked `"status": "failed", "error": "..."`. The renderers handle these gracefully (e.g. DOCX shows "[GENERATION FAILED — please answer manually]" in the response box). This is real-world behaviour, not a regression — Lee will appreciate seeing it handled.

---

## 5. Logging + cross-system observability

### Logging strategy

**rag-service:** structured JSON to stdout, one log line per significant event.

```json
{"ts":"2026-05-25T19:30:01.234Z","level":"INFO","request_id":"sun-20260525-001-q01","route":"/answer","msg":"received question","question":"Do you maintain a formal Information Security Policy?","conversation_id":"sun-20260525-001"}
{"ts":"2026-05-25T19:30:01.456Z","level":"INFO","request_id":"sun-20260525-001-q01","stage":"query_rewrite","latency_ms":221,"tokens":140}
{"ts":"2026-05-25T19:30:01.692Z","level":"INFO","request_id":"sun-20260525-001-q01","stage":"embed","latency_ms":236,"tokens":23}
{"ts":"2026-05-25T19:30:01.823Z","level":"INFO","request_id":"sun-20260525-001-q01","stage":"vector_search","latency_ms":131,"results":5,"top_score":0.89}
{"ts":"2026-05-25T19:30:03.052Z","level":"INFO","request_id":"sun-20260525-001-q01","stage":"generate","latency_ms":1229,"tokens_in":1240,"tokens_out":95}
{"ts":"2026-05-25T19:30:03.054Z","level":"INFO","request_id":"sun-20260525-001-q01","stage":"confidence","aggregate":0.927,"needs_review":false}
{"ts":"2026-05-25T19:30:03.056Z","level":"INFO","request_id":"sun-20260525-001-q01","route":"/answer","msg":"completed","total_latency_ms":1822,"total_cost_usd":0.0042}
```

**n8n:** built-in execution log + the per-request `X-Request-Id` header it sends to rag-service.

### Cross-system observability — the `request_id` trick

The n8n HTTP Request node sets `X-Request-Id: {conversation_id}-q{question_index}` on every call to rag-service. rag-service echoes this in every log line. Means you can do:

```bash
# Find all logs for one question across the system
docker compose logs rag-service | grep "sun-20260525-001-q01"

# Find all logs for one whole run
docker compose logs rag-service | grep "sun-20260525-001"

# Cross-reference with n8n execution
# (n8n UI shows the same request_id in the execution view)
```

This is a **production-thinking signal worth surfacing in the walkthrough**:
> "I included request_id propagation from day 1. If a question goes wrong, you can grep the rag-service logs and the n8n execution view with the same ID and see exactly what happened, end to end."

### What we're explicitly NOT logging

- API keys (obviously)
- Full prompt text or full LLM responses (would be huge and contain customer data)
- Full retrieved chunks (logged as IDs only — chunks live in Pinecone)
- Personal info if it ever appeared in an ISQ (the Northstar corpus has none, but the principle applies)

---

## 6. 🖐️ Manual Coding Exercise 2 — FastAPI `main.py`

**Purpose:** Build the rag-service entry point. Route registration, CORS for n8n, lifecycle setup, structured logging. ~45 lines. Two TODOs.

**File:** `rag-service/app/main.py`

**Exercise:**

Type from scratch. Pause at TODOs and implement.

```python
"""
FastAPI entry point for the ISQ Agent RAG service.
Handles route registration, CORS for n8n, lifecycle setup, structured logging.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import answer, health, index
from app.core.config import settings


# Structured logging — JSON-style for production parseability
logging.basicConfig(
    level=logging.INFO,
    format='{"ts":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","msg":"%(message)s"}',
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events — runs on startup and shutdown."""
    # TODO ① — Tom: on startup, log that the service is starting + log key config
    # (model name, pinecone index, embedding dimensions). Do NOT log API keys.
    # Use logger.info() with 3-4 lines like:
    #   logger.info(f"RAG service starting — embedding model: {settings.voyage_model}")
    # Aim for 3 lines.

    yield  # service is running

    # On shutdown — log clean exit
    logger.info("RAG service shutting down")


app = FastAPI(
    title="ISQ Agent RAG Service",
    description=(
        "Internal service for answering Information Security Questionnaire "
        "questions, grounded in Northstar Labs policies and historical responses."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# CORS — allow n8n container and localhost dev to call us
# TODO ② — Tom: add CORSMiddleware to the app.
# allow_origins should be the list: ["http://localhost:5678", "http://n8n:5678"]
#   (first is your browser-local n8n; second is container-to-container in docker-compose)
# allow_methods: ["GET", "POST"]
# allow_headers: ["*"]
# allow_credentials: True
# Use app.add_middleware(CORSMiddleware, ...). ~6 lines.


# Route registration
app.include_router(health.router, tags=["health"])
app.include_router(answer.router, tags=["answer"])
app.include_router(index.router, tags=["index"])


@app.get("/")
async def root():
    """Default route — links to health and docs."""
    return {
        "service": "ISQ Agent RAG Service",
        "version": "0.1.0",
        "health": "/health",
        "docs": "/docs",
    }
```

**Acceptance criteria for your TODOs:**

TODO ① should log:
- Service starting message
- Embedding model name (`settings.voyage_model`)
- Pinecone index name (`settings.pinecone_index`)
- Embedding dimensions (1024)
- DO NOT log any API keys or secrets

TODO ② should:
- Use `app.add_middleware(CORSMiddleware, ...)` exactly once
- Lists are as specified above
- Uses `allow_credentials=True`

**Verification:**

After typing, run:

```bash
cd rag-service
uvicorn app.main:app --reload --port 8000
```

Then in another terminal:

```bash
curl http://localhost:8000/
# Expected: { "service": "ISQ Agent RAG Service", ... }

curl http://localhost:8000/docs
# Expected: FastAPI Swagger UI HTML
```

You'll see your structured JSON log lines for the startup events. That's the lifecycle hook firing.

---

## 7. 📘 Concept Primer

### FastAPI lifecycle

When you start the rag-service, two things happen:
1. The code loads (imports run)
2. It starts listening for HTTP requests

The "lifecycle" is the bit in between. It's where you do setup work like "check Pinecone is reachable, check Voyage API key is valid, check the source-corpus folder exists."

FastAPI's `lifespan` context manager is the clean place to do this. Everything before `yield` runs on startup. Everything after `yield` runs on shutdown. If startup fails (e.g. Pinecone unreachable), FastAPI refuses to start, and you find out immediately instead of 5 minutes later when the first request times out.

### n8n execution logs

Every time a workflow runs, n8n records what happened at each node — input data, output data, errors, timing. You see this in n8n's UI under "Executions."

Think of it like a flight recorder. If a workflow crashes mid-run, you open the execution in the UI, find the red node, and read the error. The logs persist inside the n8n container, so you can review yesterday's failed runs today.

Useful trick: each execution has a unique ID. If you also set `X-Request-Id` on your HTTP calls (which we are — see Section 5), you can correlate the n8n execution view with the rag-service logs by grepping for the same ID. End-to-end debugging in two minutes instead of an hour.

### CORS

Cross-Origin Resource Sharing. When something running at one address (like `http://localhost:5678` n8n) tries to call an API at a different address (like `http://localhost:8000` rag-service), the browser or runtime might block it by default for security.

CORS is the API saying "yes, it's OK for these specific other addresses to call me."

We allow:
- `http://localhost:5678` — your local n8n when you visit it in a browser
- `http://n8n:5678` — n8n calling us from inside the docker-compose network (where containers can talk to each other by service name)

No other origins are allowed. If RiverAI ran a different n8n elsewhere and tried to point it at our rag-service, the request would be blocked. Defence in depth.

---

## 8. End-of-Plan-3 checklist

If you've done Plan 2's checklist (Voyage account, Pinecone fresh project, repo skeleton, Voyage client wrapper), the next steps are:

- [ ] Render the Mermaid diagram in your markdown viewer (VSCode, Obsidian, GitHub all support it) — confirms the architecture mentally
- [ ] Create `rag-service/app/main.py` and type out Manual Coding Exercise 2 (~20 mins)
- [ ] Create `rag-service/app/core/config.py` — pydantic-settings boilerplate to load from `.env`:
  ```python
  from pydantic_settings import BaseSettings
  class Settings(BaseSettings):
      voyage_api_key: str
      voyage_model: str = "voyage-3-large"
      anthropic_api_key: str
      pinecone_api_key: str
      pinecone_index: str = "isq-agent-knowledge"
      class Config:
          env_file = ".env"
  settings = Settings()
  ```
- [ ] Create empty stub files: `app/api/health.py`, `app/api/answer.py`, `app/api/index.py` each with `from fastapi import APIRouter; router = APIRouter()` so imports work
- [ ] Run `uvicorn app.main:app --reload --port 8000` and verify the JSON log + `/docs` page appear
- [ ] Commit: "feat: fastapi main + structured logging + cors"

Optional stretch tonight:
- [ ] Implement the `/health` endpoint with the dependency checks from Section 6 (returns `{status, dependencies: {pinecone, anthropic, voyage, index_loaded}}`)

---

## 9. What Plan 4 will tackle

Plan 4 — **Knowledge base + retrieval design**:

- Chunking strategy for the policies (paragraph-level? section-level? sliding window?)
- Chunking strategy for the historical ISQs (per Q&A pair, treat each as a unit)
- Embedding the corpus — the `POST /index` workflow in detail
- Pinecone metadata schema (what we store alongside the vector)
- Query rewriter prompt design — ISQ-specific
- Retrieval tuning — top-k, score thresholds, re-ranking strategy
- 🖐️ **Manual Coding Exercise 3** — typing out the `/index` route (~40 lines, 2 TODOs)
- 📘 Concept Primer sections: chunking strategy, Pinecone metadata, top-k vs threshold

---

## Git execution block

See `git-conventions.md` for the full reference.

**Branch:** `feature/fastapi-scaffold`

**Commits (in order):**
1. `test(api): add smoke tests for fastapi main and health endpoint` — stages `rag-service/tests/test_main_smoke.py`
2. Run `pytest rag-service/tests/test_main_smoke.py -v` — confirm tests fail for the right reason
3. `feat(api): scaffold fastapi app with cors and structured logging` — stages `rag-service/app/main.py`, `rag-service/app/config.py`, empty router stubs (`rag-service/app/api/{health,answer,index}.py`)
4. Optional stretch: `feat(api): implement /health endpoint with dependency checks` — stages updated `rag-service/app/api/health.py`

**Push + PR:**
```bash
git push -u origin feature/fastapi-scaffold
gh pr create --fill
```

Squash-merge via GitHub UI. **No tag yet** — `v0.0.1` happens at end of Plan 5.

---

## Plan 3 done ✅

Architecture concrete. Failure modes mapped. Observability strategy locked. FastAPI scaffolding ready to type.

**Tom's reaction needed before Plan 4:**

1. Mermaid diagram — does it match how you visualise it, or anything missing?
2. Failure-mode table (Section 4) — anything you'd add or treat differently?
3. Cross-system observability via `request_id` — happy with this approach?
4. Manual Coding Exercise 2 — too small, right size, too big?
5. Anything in the Plan 4 outline you want to swap in/out?

Once you've reacted (or said "go"), Plan 4 is up next.
