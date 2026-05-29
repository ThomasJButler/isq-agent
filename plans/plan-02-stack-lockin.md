# Plan 2 — Stack Lock-In + Service Contract + Repo Foundation

**Status:** First substantive build-planning iteration. Builds on locked decisions from Plan 1.

> **TDD retroactive note (added 2026-05-25):** TDD is paramount from Plan 4 onwards (methodology defined there). The Voyage client wrapper from Manual Coding Exercise 1 in this plan needs a test-file companion (`tests/test_voyage_client.py`) — that test file will be written when you reach Plan 5's branching/CI setup, so the pre-commit hooks and GitHub Actions CI can enforce its inclusion. For Exercise 1 right now: type the wrapper as written, but plan to write its tests in Plan 5.

**Owner:** Tom Butler
**Date:** 2026-05-25 (UK bank holiday Monday)
**Email to Lee:** sent — awaiting reply on deadline + submission method
**For:** RiverAI AI Engineer Technical Challenge — ISQ Agent

---

## 0. What this plan does and doesn't do

**This plan locks in:**
- The exact repo structure (folder-by-folder)
- The Morpheus lift protocol with Matrix-strip checklist
- Voyage embedding model + signup steps
- Fresh Pinecone project + index config
- n8n local Docker setup
- The HTTP service contract between n8n and the Python RAG service
- Your first manual typing exercise (Voyage client wrapper)

**This plan does NOT yet cover:**
- Knowledge base indexing strategy (Plan 4)
- Question extraction strategy (Plan 5)
- Answer generation prompt design (Plan 6)
- Confidence scoring detail (Plan 7)
- Output rendering libraries (Plan 8)
- Demo walkthrough script (Plan 9)
- Final consolidation + day-by-day execution (Plan 10)

If something here makes you want to change a Plan 1 decision, tell me before we move to Plan 3.

---

## 1. Repo structure (lock in)

Repo will live at `~/Repos/isq-agent`. Public GitHub repo. MIT licence (same as Morpheus).

```
isq-agent/
├── README.md                       # the front door — Lee/Gav read this first
├── LICENSE                         # MIT, copied from Morpheus
├── .gitignore                      # standard Python + Node + JetBrains + macOS
├── .env.example                    # template for required env vars
├── docker-compose.yml              # n8n + rag-service + (optional) postgres
│
├── plans/                          # this folder — moved in from the planning repo
│   ├── plan-01-initial-sketch.md
│   ├── plan-02-stack-lockin.md
│   └── ...
│
├── docs/
│   ├── architecture.md             # high-level diagram + decisions
│   ├── walkthrough-script.md       # the demo script (built in Plan 9)
│   ├── attributions.md             # what's lifted from Morpheus + other projects
│   └── learning/                   # per-feature learning markdown
│       ├── 01-voyage-embeddings.md
│       ├── 02-pinecone-setup.md
│       ├── 03-n8n-form-trigger.md
│       └── ...
│
├── source-corpus/                  # the Northstar knowledge — gitignored by default
│   ├── policies/                   # 6 policy PDFs
│   │   ├── Northstar_Labs_Information_Security_Policy.pdf
│   │   ├── Northstar_Labs_Acceptable_Use_Policy.pdf
│   │   ├── ...
│   └── historical-isqs/            # 3 completed ISQs
│       ├── Northstar_Labs_Previous_ISQ_Completed_01.pdf
│       ├── Northstar_Labs_Previous_ISQ_Completed_02.docx
│       └── Northstar_Labs_Previous_ISQ_Completed_03.pdf
│
├── n8n/
│   ├── workflows/                  # exported workflow JSON (the artefacts Lee opens)
│   │   ├── isq-agent-form-upload.json
│   │   └── isq-agent-email-trigger.json
│   ├── credentials-template.md     # what credentials need setting up in n8n UI
│   └── README.md                   # how to import workflows into a fresh n8n
│
├── skill/                          # Packaged Claude Code skill (Plan 9.5)
│   ├── isq-agent/
│   │   ├── SKILL.md                # skill manifest + trigger description
│   │   ├── scripts/
│   │   │   ├── check_health.py
│   │   │   ├── process_isq.py
│   │   │   └── reindex_corpus.py
│   │   ├── references/
│   │   │   └── service_contract.md
│   │   └── examples/
│   └── README.md                   # how to package + install
│
├── rag-service/                    # Python FastAPI service (Morpheus-derived)
│   ├── Dockerfile
│   ├── pyproject.toml              # or requirements.txt — pick in Plan 3
│   ├── .python-version             # 3.11 (matches Morpheus)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app, route registration
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── answer.py           # POST /answer
│   │   │   ├── index.py            # POST /index
│   │   │   └── health.py           # GET /health
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py           # pydantic-settings, env loading
│   │   │   ├── pinecone_client.py  # ADAPTED FROM Morpheus
│   │   │   └── isq_prompts.py      # NEW — all ISQ-specific system prompts
│   │   ├── rag/
│   │   │   ├── __init__.py
│   │   │   ├── query_rewriter.py   # ADAPTED FROM Morpheus
│   │   │   ├── retriever.py        # ADAPTED FROM Morpheus rag/simple.py
│   │   │   └── generator.py        # NEW — Claude generation with NewsPerspective single-call shape
│   │   ├── confidence/
│   │   │   ├── __init__.py
│   │   │   ├── multi_dim_scorer.py # NEW — ReviewBot-pattern multi-dim scoring
│   │   │   └── retrieval_similarity.py  # NEW — extracts Pinecone scores
│   │   ├── voyage/
│   │   │   ├── __init__.py
│   │   │   └── client.py           # NEW — Manual Coding Exercise 1
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── chunking.py         # ADAPTED FROM Morpheus
│   │       └── document_processor.py  # ADAPTED FROM Morpheus — add XLSX support
│   └── tests/
│       ├── test_health.py
│       ├── test_voyage_client.py
│       └── test_isq_prompts_no_matrix_leakage.py  # CI lint — fails if Matrix terms appear
│
└── eval/
    ├── ground-truth/
    │   └── isq-01-as-gold.json     # ISQ_01 questions + answers as eval corpus
    ├── eval_runner.py              # runs Sunflowers questions through the agent, scores against gold
    └── results/                    # gitignored, per-run outputs
```

**Folder rationale:**
- `plans/` lives in the repo so Lee/Gav can see your discipline if they open the README
- `docs/` is the README's "for more detail, see..." destination
- `source-corpus/` gitignored by default — these are RiverAI's example documents, treat as their IP
- `n8n/workflows/` contains the exported JSON — this is what Lee imports to run your demo on his own n8n
- `rag-service/` is its own Dockerised mini-app, with clear separation between `api/` (HTTP), `core/` (infra), `rag/` (retrieval + generation), `confidence/` (scoring), `voyage/` (embedding), `utils/` (parsing/chunking)
- `eval/` is where the Ralph loop will live (Plan 9)

---

## 2. Morpheus lift protocol + Matrix-strip checklist

### Module-by-module lift list

For each module, the protocol is:
1. Copy the file from Morpheus → `isq-agent/rag-service/app/...`
2. Add an attribution comment at the top
3. Run the Matrix-strip checklist (below)
4. Adapt for ISQ-specific use (rename classes/functions, retune chunk sizes etc.)
5. Add tests

| Morpheus source | Destination in isq-agent | Notes |
|---|---|---|
| `app/utils/chunking.py` | `rag-service/app/utils/chunking.py` | Direct copy. Retune chunk_size for policy paragraphs in Plan 4. |
| `app/utils/document_processor.py` | `rag-service/app/utils/document_processor.py` | Direct copy + ADD XLSX support via openpyxl. |
| `app/core/pinecone_client.py` | `rag-service/app/core/pinecone_client.py` | Direct copy. Update env var names. Pinecone index name `isq-agent-knowledge`. |
| `app/rag/query_rewriter.py` | `rag-service/app/rag/query_rewriter.py` | Direct copy. New system prompt in `isq_prompts.py`. |
| `app/rag/simple.py` | `rag-service/app/rag/retriever.py` | RENAME on lift. Strip session/namespace dynamism — one fixed namespace. |
| `app/api/chat.py` | `rag-service/app/api/answer.py` | Scaffolding only — the route shape, not chat semantics. |
| `app/api/documents.py` | `rag-service/app/api/index.py` | Scaffolding only — the upload pattern, not chat semantics. |
| `backend/Dockerfile` | `rag-service/Dockerfile` | Direct copy. |
| `docker-compose.yml` (root) | `docker-compose.yml` (root) | Direct copy + ADD n8n service. |

### Matrix-strip checklist (run this per file)

After lifting each file, run this command and confirm zero results:

```bash
grep -iE '(morpheus|the matrix|matrix of|neo[^a-z]|white rabbit|red ?pill|blue ?pill|trinity|zion|down the rabbit|wake up.*matrix|follow the white rabbit)' rag-service/app/path/to/file.py
```

**Allowed exceptions:**
- Attribution comments at the top of files, e.g.:
  ```python
  # Adapted from Morpheus (Tom Butler, 2025) — original at
  # https://github.com/ThomasJButler/Morpheus/blob/main/backend/app/rag/query_rewriter.py
  # All Matrix-themed personality removed; tone is now vendor-neutral ISQ professional.
  ```
- Test files explicitly testing that Matrix terms DON'T leak (e.g. `test_isq_prompts_no_matrix_leakage.py`)

**Replacement vocabulary:**

| Strip this | Replace with |
|---|---|
| `Morpheus` (class/var name) | `ISQAgent`, `RAGService`, etc. |
| `Morpheus` (in prose) | `the ISQ Agent`, `the knowledge base`, `the RAG core` |
| `the Matrix` / `Matrix of knowledge` | `the knowledge base`, `the policy corpus` |
| `Neo` (in prose) | `the user`, `the requester` |
| `the code` (as metaphor for knowledge) | `the source documents`, `the policies` |
| `Oracle` (as Morpheus Matrix oracle) | rename or remove entirely |
| `follow the white rabbit` | remove |
| `down the rabbit hole` | `deep dive`, `further investigation` |
| `wake up` (metaphorical) | remove |
| `*Welcome to the Matrix, Neo.*` (greeting) | replace with `Welcome. Upload an Information Security Questionnaire to get started.` |

### CI check (automated)

`tests/test_isq_prompts_no_matrix_leakage.py` will scan every file in `app/` for the banned terms and fail the test suite if any are found in non-attribution lines. This protects against future drift.

---

## 3. Voyage AI setup

### Account signup

1. Go to [https://dash.voyageai.com](https://dash.voyageai.com)
2. Sign up with `dev@thomasjbutler.me`
3. Confirm email, log in
4. Navigate to API Keys → Create new key
5. Name: `isq-agent-dev`
6. Copy the key (starts with `pa-`)
7. Save to `~/.env.local` or password manager (do NOT commit to repo)

**Free tier:** 50 million tokens lifetime free. Our corpus is ~30KB ≈ ~8,000 tokens to embed once. Even with thousands of queries, we'll never approach the cap.

### Model choice — LOCKED: `voyage-3-large`

| Option | Dims | Quality | Price/M tokens | Notes |
|---|---|---|---|---|
| **voyage-3-large** ✅ | 1024 | Highest | $0.18 | Locked. Best quality for semantic retrieval, English-only, general-purpose. |
| voyage-3 | 1024 | High | $0.06 | Cheaper but slightly weaker. Could fall back to this in a future cost-optimisation pass. |
| voyage-3-lite | 512 | OK | $0.02 | Smaller dims = faster but less precise. Not worth the trade for 30KB corpus. |
| voyage-finance-2 | 1024 | High (finance) | $0.12 | Tempting because security policies overlap with compliance — but general-purpose voyage-3-large wins for the broader ISQ question types. Mention in walkthrough as "I considered the finance variant — here's why I went general." |

### Pinecone index dimensions must match: 1024

**Critical:** if you set the Pinecone index to 1024 dims and later switch to voyage-3-lite (512), the index breaks and needs rebuilding. Lock voyage-3-large now.

### Pinecone SDK version pin

Morpheus uses Pinecone Python SDK v5. The v6 SDK has a slightly different API surface. Pin in `rag-service/requirements.txt`:

```
pinecone>=5.0,<6.0
voyageai>=0.2.0
anthropic>=0.34.0
```

Without the pin, a fresh `pip install` might pick up v6 and break the lifted Morpheus modules.

---

## 4. Fresh Pinecone project setup

### Steps

1. Log into [https://app.pinecone.io](https://app.pinecone.io) using existing account
2. Top-left dropdown → **Create project**
3. Project name: `isq-agent`
4. Cloud + region: **AWS · us-east-1** (free tier eligible) — or **AWS · eu-west-1** if you want UK-closer latency (still free tier)
5. Click into the new project
6. **Indexes** tab → **Create index**
7. Index name: `isq-agent-knowledge`
8. Dimensions: `1024` (matches voyage-3-large)
9. Metric: `cosine` (standard for sentence embeddings)
10. Capacity mode: **Serverless** (free tier, scales to zero when idle)
11. Click Create — takes ~30 seconds to provision
12. **API Keys** tab → Copy the default key
13. Save to `~/.env.local` as `PINECONE_API_KEY=pcsk-...` and `PINECONE_INDEX=isq-agent-knowledge`

### Why fresh project (not just namespace)

- Clean separation from Morpheus
- Different embedding model = different index = different project hygiene
- If you ever showcase Morpheus AND ISQ Agent in the same talk, having them as separate projects in your Pinecone dashboard prevents confusion
- Free tier on Pinecone allows multiple projects, so there's no cost penalty

### Free tier headroom

- 1 serverless index, 2GB storage, 100,000 vectors
- Our corpus chunks to ~50-100 vectors (8KB-ish total)
- Headroom: 1000× what we need. Comfortable.

---

## 5. n8n local Docker setup

### docker-compose.yml addition

Add this `n8n` service to the root `docker-compose.yml` alongside `rag-service`:

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: isq-agent-n8n
    platform: linux/arm64  # Mac M1/M2 — drop on Linux x86_64 hosts
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=false  # dev only — no auth on localhost
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678
      - GENERIC_TIMEZONE=Europe/London
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - N8N_LOG_LEVEL=info
    volumes:
      - n8n_data:/home/node/.n8n  # persists workflows + credentials across restarts
      - ./source-corpus:/source-corpus:ro  # read-only access to corpus for testing
    depends_on:
      - rag-service

  rag-service:
    build: ./rag-service
    container_name: isq-agent-rag
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./source-corpus:/source-corpus:ro

volumes:
  n8n_data:
```

### First-time access

After `docker compose up`:
1. Open `http://localhost:5678` in your browser
2. n8n shows a "create owner account" screen (local-only, dev purposes)
3. Use throwaway credentials — this isn't a production deployment
4. You're now in the n8n editor

### Credentials to set up in n8n UI (after install)

| Credential type | Name | Stored value | Used by |
|---|---|---|---|
| HTTP Header Auth | `RAG Service Internal` | none needed (localhost) | HTTP Request nodes calling `http://rag-service:8000` |
| Gmail OAuth2 | `ISQ Agent Inbox` | OAuth via Google flow | Email trigger workflow |
| Anthropic | `Claude Sonnet` | `sk-ant-...` | (Optional — if you want Claude calls direct from n8n for question extraction) |

n8n stores these encrypted in `~/.n8n` (mounted to `n8n_data` volume). Never commit them.

---

## 6. HTTP service contract (n8n ↔ rag-service)

### `POST /index` — one-off corpus indexing

**Request:**
```json
{
  "force_reindex": false
}
```

**Response:**
```json
{
  "status": "ok",
  "chunks_indexed": 73,
  "documents_indexed": 9,
  "indexing_time_ms": 4231,
  "embedding_model": "voyage-3-large",
  "embedding_dimensions": 1024,
  "pinecone_index": "isq-agent-knowledge",
  "embedding_tokens_used": 8240,
  "estimated_cost_usd": 0.0015
}
```

**Behaviour:**
- Idempotent — if `force_reindex=false` and the index already has vectors, returns immediately with `status: "already_indexed"`
- If `force_reindex=true`, deletes existing vectors and reindexes from `/source-corpus`
- Called once when the demo starts, or via a manual `curl` during dev

### `POST /answer` — per-question answer generation

**Request:**
```json
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

**Response:**
```json
{
  "answer": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership. The policy covers access control, encryption, acceptable use, security responsibilities, asset management, and incident management.",
  "citations": [
    {
      "source": "Northstar_Labs_Information_Security_Policy.pdf",
      "chunk_id": "isp-001",
      "page": 1,
      "text_snippet": "Northstar Labs is a UK-based software development and AI solutions company committed to maintaining high standards of information security..."
    },
    {
      "source": "Northstar_Labs_Previous_ISQ_Completed_01.pdf",
      "chunk_id": "hist01-q1",
      "page": 1,
      "text_snippet": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually..."
    }
  ],
  "confidence": {
    "score": 0.91,
    "dimensions": {
      "cites_policy": 1.0,
      "on_topic": 0.95,
      "vendor_tone": 0.90,
      "complete": 0.80
    },
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

**Confidence shape:**
- Each dimension is 0.0 to 1.0
- Aggregate `score` is weighted mean (weights tuned in Plan 7)
- `needs_review: true` when `score < 0.6` OR when `cites_policy < 0.5` (i.e. answer not grounded in policy)
- `review_reason` is a human-readable explanation when flagged (e.g. "No policy chunks support this answer — consider manual review")

### `GET /health` — liveness + dependency check

**Response:**
```json
{
  "status": "ok",
  "dependencies": {
    "pinecone": true,
    "anthropic": true,
    "voyage": true,
    "index_loaded": true,
    "index_vector_count": 73
  },
  "version": "0.1.0"
}
```

n8n will poll `/health` once at workflow start, fail-fast if any dependency is down.

---

## 7. 🖐️ Manual Coding Exercise 1 — Voyage embedding client wrapper

**Purpose:** Your first real code in the new repo. Wraps the Voyage SDK for clean query + batched document embedding with cumulative cost tracking. ~30 lines. Should take 10-15 minutes to type. Two TODO blocks for you to fill in.

**File:** `rag-service/app/voyage/client.py`

**Exercise:**

Type out this file from scratch (don't copy-paste — type every character). When you reach the TODOs, pause and implement them yourself.

```python
"""
Voyage AI embedding client wrapper.
Wraps voyageai SDK for query + document embedding with cost tracking.
"""

import os
from typing import Optional
import voyageai


class VoyageClient:
    """
    Thin wrapper around Voyage AI for embedding generation.

    Two modes:
    - embed_query(text) for single search queries
    - embed_documents(texts) for batched corpus indexing
    """

    # voyage-3-large pricing as of May 2026: $0.18 per million tokens
    COST_PER_MILLION_TOKENS = 0.18
    MAX_BATCH_SIZE = 1000  # Voyage caps at 1000 texts per call

    def __init__(self, model: str = "voyage-3-large", api_key: Optional[str] = None):
        self.model = model
        self.client = voyageai.Client(api_key=api_key or os.getenv("VOYAGE_API_KEY"))
        self.tokens_used = 0  # cumulative across all calls

    def embed_query(self, text: str) -> list[float]:
        """Embed a single search query. Returns 1024-dim vector for voyage-3-large."""
        result = self.client.embed(
            texts=[text],
            model=self.model,
            input_type="query",  # tells Voyage this is a search query, not a document
        )
        self.tokens_used += result.total_tokens
        return result.embeddings[0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed multiple document chunks. Returns list of 1024-dim vectors.
        Handles batching automatically — Voyage caps at 1000 texts per call.
        """
        # TODO ① — Tom: implement batching logic.
        # Hint: walk through `texts` in chunks of self.MAX_BATCH_SIZE,
        # call self.client.embed() for each batch with input_type="document",
        # accumulate self.tokens_used, return concatenated embeddings list.
        # ~6-8 lines.
        pass

    def get_cost_estimate(self) -> float:
        """Return cumulative cost in USD based on self.tokens_used."""
        # TODO ② — Tom: implement cost calculation.
        # Formula: (tokens_used / 1_000_000) * COST_PER_MILLION_TOKENS
        # Return as float (will be ~$0.0015 for our corpus).
        # ~1 line.
        pass
```

**Acceptance criteria for your TODOs:**

TODO ① should:
- Walk `texts` in batches of 1000
- Call `self.client.embed(texts=batch, model=self.model, input_type="document")`
- Add `result.total_tokens` to `self.tokens_used`
- Append `result.embeddings` to a running list
- Return the full embeddings list

TODO ② should:
- Be a one-liner that returns the cost as a float

**Verification once you've typed it:**

Create a `rag-service/scripts/smoke_test_voyage.py`:

```python
from app.voyage.client import VoyageClient

client = VoyageClient()
vec = client.embed_query("Do you maintain a formal information security policy?")
print(f"Query embedded — vector dim: {len(vec)}")  # should print 1024

docs = ["MFA is mandatory for all cloud platforms.", "Backups are encrypted using AES-256."]
vecs = client.embed_documents(docs)
print(f"Documents embedded — count: {len(vecs)}, dim: {len(vecs[0])}")  # should print 2, 1024

print(f"Total tokens used: {client.tokens_used}")
print(f"Estimated cost: ${client.get_cost_estimate():.6f}")
```

Run with `cd rag-service && python -m scripts.smoke_test_voyage` (after `pip install voyageai` and `export VOYAGE_API_KEY=pa-...`).

---

## 8. 📘 Concept Primer

### Vector embeddings

Imagine every sentence as a point on a map. Sentences with similar meanings sit close together — "MFA is enabled" lives in the same neighbourhood as "we require multi-factor authentication." That's all an embedding is: a way to turn a sentence into coordinates on a meaning-map so the computer can find "things that mean the same" without needing to match the exact words.

Voyage is the company that draws the map. We hand it a sentence, it hands us back 1024 numbers (the coordinates). We hand it another sentence, it hands us another 1024 numbers. If we measure how close the two sets of numbers are, that tells us how similar the meaning is.

### Pinecone namespaces vs projects

Think of Pinecone as a filing cabinet warehouse.
- A **project** is one whole cabinet. Different cabinets for different jobs.
- A **namespace** is a drawer inside one cabinet.

Morpheus has its own cabinet (project), with one drawer per user-uploaded session. The ISQ Agent gets a fresh cabinet (project) so its files don't mix with Morpheus's. Inside that fresh cabinet we only need one drawer (namespace = `default`) because there's only one customer's documents to file.

If we ever sold the ISQ Agent to multiple companies, we'd give each customer their own drawer in the same cabinet (e.g. `customer-acme`, `customer-globex`). That's what Morpheus does with sessions.

### n8n credentials store

n8n is the workflow tool. The workflow needs to call other services (Anthropic, Voyage, Gmail) — and those services need API keys to work.

Instead of putting the keys in the workflow file (which would get committed to git, leak, and revoke), n8n has a built-in **credentials vault**. You add the key once via the n8n web UI, give it a name like "Claude Sonnet", and from then on any node in any workflow can use that credential by name.

The vault lives encrypted inside the n8n container. When you export a workflow to JSON to share with Lee, the JSON references credentials BY NAME — it doesn't contain the actual keys. Lee imports the workflow, adds his own credentials with matching names, and it just works. Same as how you don't email someone a password but you do tell them "your username is bob".

---

## 9. End-of-Plan-2 checklist (you can do these now or wait for tomorrow)

Pre-Plan-3 setup tasks. Tick when done.

- [ ] Send the Lee email (saved in `taskandemails/email-to-lee-2026-05-25.md`)
- [ ] Sign up for Voyage AI ([dash.voyageai.com](https://dash.voyageai.com)), get API key
- [ ] Create fresh Pinecone project `isq-agent`, create index `isq-agent-knowledge` (1024 dims, cosine, serverless)
- [ ] Create local repo: `mkdir -p ~/Repos/isq-agent && cd ~/Repos/isq-agent && git init`
- [ ] Create top-level folders: `mkdir -p plans docs source-corpus n8n/workflows rag-service/app/{api,core,rag,confidence,voyage,utils} rag-service/tests rag-service/scripts eval`
- [ ] Copy this plans folder into the new repo: `cp -r plans/*.md ~/Repos/isq-agent/plans/`
- [ ] Copy source corpus: `cp -r source-corpus/* ~/Repos/isq-agent/source-corpus/`
- [ ] Make a `.gitignore` excluding `.env`, `__pycache__`, `node_modules`, `source-corpus/` (the corpus is RiverAI's example data, not ours to commit publicly)
- [ ] Create `.env.example` with template variables: `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`
- [ ] First commit: "initial: plans, structure, corpus locally"
- [ ] Create the public GitHub repo `isq-agent` at github.com/ThomasJButler
- [ ] Push: `git remote add origin git@github.com:ThomasJButler/isq-agent.git && git push -u origin main`
- [ ] 🖐️ **Type out Manual Coding Exercise 1** in `rag-service/app/voyage/client.py` (15 mins, two TODOs for you)
- [ ] Run the smoke test: `python -m scripts.smoke_test_voyage`
- [ ] Commit: "feat: voyage client wrapper + smoke test"

If you do all of these tonight, you'll be 4-5 hours ahead of where Plan 1 originally projected. If you only do some, that's fine too — bank holiday pacing.

---

## 10. What Plan 3 will tackle

Plan 3 — **Architecture proper** (boxes-and-arrows diagram, data flow, component boundaries):

- Full architecture diagram (we'll draw one — I'll write the Mermaid; you can render it in a markdown viewer)
- Detailed data flow: file upload → question extraction → per-question loop → answer assembly → render → deliver
- Component responsibilities (what owns state, what's stateless, where errors propagate)
- Failure-mode mapping (what happens if Voyage is down? Pinecone? Claude? File parse fails?)
- Logging strategy (structured logs from rag-service, n8n execution logs, where they meet)
- 🖐️ **Manual Coding Exercise 2** — typing out the FastAPI `main.py` with route registration, CORS, lifecycle events (~30 lines, 2 TODOs)
- 📘 Concept Primer sections: FastAPI lifecycle, n8n execution logs, CORS

---

## Git execution block

See `git-conventions.md` for the full reference.

**Branch:** `feature/voyage-client`

**Commits (in order):**
1. `chore(repo): initial scaffolding with plans, .gitignore, LICENSE, .env.example` — stages root files only, **not** `source-corpus/` (gitignored)
2. `test(voyage): add tests for voyage embedding client` — stages `rag-service/tests/test_voyage_client.py`
3. Run `pytest rag-service/tests/test_voyage_client.py -v` — confirm tests fail for the right reason
4. `feat(voyage): add voyage embedding client wrapper` — stages `rag-service/app/voyage/client.py`

**Push + PR:**
```bash
git push -u origin feature/voyage-client
gh pr create --fill
```

Squash-merge via GitHub UI. **No tag yet** — milestone tag `v0.0.1` happens at end of Plan 5 once CI is green.

---

## Plan 2 done ✅

Foundation locked. Repo structure, Morpheus lift protocol, Voyage signup, Pinecone setup, n8n Docker, service contract, first manual coding exercise — all defined.

**Tom's reaction needed before Plan 3:**

1. Anything in the repo structure (Section 1) you want to flip?
2. Service contract (Section 6) — is the JSON shape right, or do you want fields added/removed?
3. The end-of-Plan-2 checklist — are you doing it tonight, tomorrow, or splitting it?
4. Anything in the Plan 3 outline you want to swap in/out?

Once you've reacted (or said "go"), Plan 3 is up next.
