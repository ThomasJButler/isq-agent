# Plan 1 — Initial Sketch (FINAL — decisions locked, ready for Plan 2)

**Status:** All open questions resolved by Tom. This is the definitive Plan 1 — Plan 2 builds on its locked decisions.

---

## 🔒 Final Decisions Locked (Tom's answers, 2026-05-25)

| # | Decision | Locked answer |
|---|---|---|
| 1 | Two-tier architecture (n8n + Python RAG service) | **YES** |
| 2 | Direct Morpheus module lift with attribution | **YES** — and aggressive Matrix/Neo terminology strip before any code lands in the new repo |
| 3 | Pinecone reuse | **NO** — fresh Pinecone project for isolation |
| 4 | Visual/tone constraint | **LOCKED** — business-professional, Claude-esque design vocabulary, shadcn for any UI |
| 5 | All four pattern borrows (NewsPerspective single-call / ReviewBot multi-dim confidence / SQL-Ball strict rules / Oracle "when not to embed" walkthrough) | **ALL YES** |
| 6 | n8n hosting | **BOTH** — Docker local primary (for demo), plus n8n Cloud as a learning/showcase secondary |
| 7 | Embedding model | **VOYAGE** (Anthropic-aligned, supports Tom's long-term Anthropic-first stance) |
| 8 | Confidence scoring | **HYBRID** — multi-dim LLM scoring (ReviewBot-style) + retrieval similarity sanity check |
| 9 | Next.js dashboard | **STRETCH GOAL** — planned but built only if time permits. Includes designing a Claude Design prompt for shadcn-based iteration |

### Implications cascading from the locked answers

- **Voyage embedding** means: new dependency (`voyageai` Python package), new API key, slightly different chunking sweet-spot than Morpheus uses with OpenAI. Plan 4 (retrieval design) will tune this. **Model recommendation for Plan 2**: `voyage-3-large` (1024 dims, strongest general-purpose). Tom needs to sign up for a Voyage account — free tier covers this corpus easily.
- **Fresh Pinecone project** means: ~5 min setup tonight (new project inside Tom's existing Pinecone account), new API key + index. Index dimensions must match Voyage (1024 for voyage-3-large). Index named `isq-agent-knowledge`. Default namespace fine for a single-tenant assessment.
- **Both Docker AND n8n Cloud** means: primary deliverable is `docker compose up`. Secondary deliverable is an exported workflow JSON deployed to n8n Cloud as a "this is what production deployment looks like" extension. The cloud version becomes a walkthrough talking point about portability.
- **Matrix terminology strip** is non-trivial. Every Morpheus module import needs scanning for "Neo", "matrix", "white rabbit", "the code", "Oracle" (when it means Morpheus oracle, not the Premier League project), "Trinity", "redpill/bluepill", "follow the white rabbit" etc. before code lands in `isq-agent`. Plan 2 will define the strip protocol with an explicit checklist.
- **Stretch Next.js dashboard** means: a Plan 9 deliverable will be a **Claude Design prompt document** that you feed to your Claude Design workflow. We define it but you iterate it visually if/when you have time.

---

**Original status:** First pass, amended twice. Deliberately rough.

**Amendments in this version:**
- Architecture split into two tiers (n8n workflow tier + Python RAG service tier built on Morpheus components)
- Section 6 (Claude-native moat) reframed — the integration IS the moat
- Section 7 (Morpheus) expanded into a full module-by-module reuse audit
- New Section 7a: **Visual / tone constraint** locked in (business-professional, zero Matrix theming)
- **New Section 7b: Wider portfolio patterns** — surfaces specific patterns from ReviewBot, NewsPerspective, SQL-Ball, Oracle, ModelViz worth drawing on (Morpheus remains the centerpiece, these are pattern-adds, not module-lifts)
- Risks updated (RAG core de-risked, integration risk added)
- Time outlook improved (we're not rebuilding RAG)

**Owner:** Tom Butler
**For:** RiverAI AI Engineer Technical Challenge — ISQ Agent
**Sender:** Lee Jackson (Senior AI Engineer), cc Gav Winter (Chief AI & Ops)
**Brief expectation:** ~2 hours build time, demo + walkthrough at interview, decisions early June
**Tom's actual budget:** Tonight + Tuesday + Wednesday evening buffer + Thursday if needed

---

## 1. Mission (one paragraph)

Build an AI-powered workflow agent that:
- Accepts a blank Information Security Questionnaire (PDF or XLSX)
- Extracts the questions
- Grounds answers in Northstar Labs' 6 policy documents and 3 historical completed ISQs
- Generates professional, evidence-backed answers using Claude
- Flags low-confidence answers as "needs review"
- Produces output in three formats: filled original (PDF/XLSX), clean DOCX report, structured JSON

Orchestrated through **n8n** (matches RiverAI's tool preference and the brief's explicit requirement), with the RAG core delivered by a small **Python service derived from Morpheus** (Tom's existing RAG product, which Lee has already seen and reacted positively to).

---

## 2. The Three Truths That Shape Everything

1. **It's a workflow tool assessment, not a code assessment.** n8n is the centre of gravity. Custom code earns its place by doing what n8n can't do well — heavy retrieval logic, PDF/XLSX rendering, and the LLM/embedding orchestration that's faster in Python than in n8n's code nodes.

2. **Approach > completeness.** Lee said "we are more interested in seeing your approach, thought process, and how far you get." A working happy path + clear architecture + honest trade-offs beats a sprawling half-finished feature set.

3. **The walkthrough is half the deliverable.** Demo + explanation of architecture, design decisions, processing flow, retrieval, confidence handling, trade-offs, and "what I'd do given more time." The story matters as much as the artefact.

---

## 3. Scope

### In scope (must-have)
- Accept a blank ISQ via **two** input methods: manual upload (n8n Form Trigger) AND email trigger (n8n IMAP/Gmail node). Covers two of the four input options in the brief.
- Parse questions from PDF and XLSX inbound formats
- Retrieve relevant grounding from 6 policies + 3 historical ISQs
- Generate Claude-backed answers using Morpheus-derived RAG pipeline
- Flag low-confidence
- Produce all three output formats over a single JSON answer layer
- End-to-end demo of one inbound ISQ (probably Sunflowers — best policy coverage; Blackridge demoed second to show the "flag for OT gaps" feature)
- Public GitHub repo for submission (confirmed with Tom 2026-05-25)
- **Packaged Claude Code skill** — the same engine wrapped as an installable `.skill` file (`isq-agent.skill`). Lee can install it in his own Claude Code and trigger it from any chat. Adds the "Claude expert" walkthrough card. See Plan 9.5 for the full spec.

### Stretch
- Multi-ISQ batch processing
- API/webhook input (third input method from the brief)
- Cloud folder trigger (fourth input method from the brief)
- Web dashboard wrapper (Next.js minimal — IF time permits and only as walkthrough story)
- Self-evaluation pass where Claude critiques its own draft
- Reranker stage (Morpheus already has Pinecone-based reranker code we can lift)
- Notion audit logging

### Out of scope (explicit)
- Full Northstar Labs auth/multi-tenant
- Production deployment
- Cloud-hosted persistent storage (local SQLite or in-memory is fine)
- Anything Matrix-themed (see Section 7a)
- Building features the brief doesn't ask for

---

## 4. Constraints from the brief (verbatim or close)

- Stack: **n8n or similar workflow automation platform** rather than entirely code-based
- External tools welcome: Azure, AWS, database providers
- Inputs: at least one of {email attachment, API/webhook, manual upload, cloud folder trigger}
- Answer rules:
  - Prefer official Northstar policy docs
  - Use previous completed ISQs where relevant
  - Avoid unsupported claims
  - Mark uncertain answers as needing review
  - Concise, professional, vendor-tone
- Walkthrough must cover: architecture, document processing, retrieval, generation, confidence handling, limitations/trade-offs, future improvements

---

## 5. Architecture — Two-Tier Split

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1 — n8n Workflow (orchestration, IO, rendering)           │
│                                                                  │
│  TRIGGER                                                         │
│   ├─ Form Trigger (built-in file upload UI — no Next.js needed) │
│   └─ [stretch] Webhook / Email / Cloud folder                   │
│             ↓                                                    │
│  PARSE (n8n native nodes where possible)                        │
│   ├─ PDF → text extraction                                      │
│   └─ XLSX → row extraction                                      │
│             ↓                                                    │
│  QUESTION EXTRACTION (Claude via Anthropic node)                │
│   └─ Output: structured question list (JSON)                    │
│             ↓                                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ HTTP request per question (or batched) to Tier 2       │    │
│  │ POST /answer { question, source_format, hints }        │    │
│  └────────────────────────────────────────────────────────┘    │
│             ↓                                                    │
│  ASSEMBLE canonical JSON                                         │
│   { questionnaire_meta, answers: [...] }                        │
│             ↓                                                    │
│  RENDER (three adapters)                                        │
│   ├─ JSON-as-is download                                        │
│   ├─ Clean DOCX (n8n code node calling python-docx)            │
│   └─ Filled original (PDF overlay or XLSX cell-fill)            │
│             ↓                                                    │
│  DELIVER                                                         │
│   └─ Download links via Form response page                      │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ HTTP
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TIER 2 — Python RAG Service (Morpheus-derived, FastAPI)        │
│                                                                  │
│  POST /answer                                                    │
│   ├─ Query rewrite (Morpheus query_rewriter, prompt re-skinned) │
│   ├─ Embed query (Voyage voyage-3-large, 1024 dims)             │
│   ├─ Vector search (fresh Pinecone project, default namespace)  │
│   ├─ [optional] Rerank (Morpheus reranker, Pinecone API)        │
│   ├─ Generate answer (Claude Sonnet, ISQ system prompt)         │
│   ├─ Confidence scoring (multi-dim LLM scoring (ReviewBot-style)│
│   │   + retrieval-similarity sanity check, hybrid)               │
│   └─ Return: { answer, citations, confidence, needs_review,     │
│              metrics: { tokens, cost, latency_ms } }            │
│                                                                  │
│  POST /index (one-off setup, called by n8n setup workflow)      │
│   ├─ Chunk policies + ISQs (Morpheus chunking)                  │
│   ├─ Embed each chunk (Voyage)                                  │
│   └─ Upsert to fresh Pinecone project, default namespace        │
└─────────────────────────────────────────────────────────────────┘

Both tiers run in Docker Compose locally for the demo:
  docker compose up  →  n8n on :5678, RAG service on :8000, Pinecone via cloud SDK
```

---

## 6. The Claude-Native Moat (and why two-tier is the right story)

The runtime is n8n + Claude + Python RAG service. The moat is the **integration story** and the **dev process**.

**Integration story (the architecture itself):**
> "I considered building everything in n8n's native nodes. But I've already solved enterprise RAG in Morpheus — query rewriting, vector retrieval, reranking, confidence scoring — and rebuilding it inside n8n's code nodes would be lower quality than what I already have. So I split the architecture: n8n owns workflow, file IO, and rendering, where it shines. A thin Python service owns RAG, where I'm reusing battle-tested components. The integration is HTTP — n8n calls the service once per question. This is how I'd architect a production version, and it's how OneReach-style platforms work in real RiverAI engagements."

**Dev process moat (HOW you built it in a day):**
- **Anchor / gicc harness** scaffolds the project structure
- **Custom Claude Code skill** for ISQ prompt engineering (system prompt + few-shot iteration against the historical ISQs as eval corpus)
- **Ralph loop** overnight (Tuesday night) to test prompt variants against the 3 historical ISQs as ground truth
- **MCP** (optional) — small MCP that lets Claude inspect n8n workflow state during dev
- **Plugin** (optional) — Notion plugin to log iteration history

Walkthrough has THREE threads now:
1. "Here's the agent running" (n8n + RAG service runtime)
2. "Here's how I built it in a day" (Claude-native dev process)
3. "Here's why the architecture is two-tier" (judgment + reuse)

---

## 7. Morpheus reuse audit (module by module)

| Morpheus module | Status | Use for ISQ Agent |
|---|---|---|
| `utils/document_processor.py` | **DIRECT REUSE** | PDF + DOCX extraction already built. **Add XLSX support** (openpyxl) for Simple Salvage's spreadsheet. |
| `utils/chunking.py` | **DIRECT REUSE** | LangChain RecursiveCharacterTextSplitter. Tune chunk size for policy paragraphs (~500 chars). |
| `core/pinecone_client.py` | **DIRECT REUSE, new credentials** | Client code is reusable as-is. Point at fresh Pinecone project via env vars: new `PINECONE_API_KEY`, new index `isq-agent-knowledge` (1024 dims to match Voyage), default namespace. Morpheus's index is left untouched. |
| `rag/simple.py` | **REUSE pattern, adapt** | The embed → search → format → generate loop is exactly our backbone. Strip session/namespace dynamism; one fixed namespace. |
| `rag/query_rewriter.py` | **DIRECT REUSE, re-prompt** | Rewriting an ISQ question into a strong retrieval query is a real win for accuracy. Swap the generic prompt for an ISQ-specific one ("expand security questionnaire questions into terms found in policy documents"). |
| `rag/query_analyzer.py` | **REUSE pattern** | Could classify questions: "yes/no factual" vs. "describe process" vs. "list policy" → different prompt strategies per type. Optional stretch. |
| `rag/reranker.py` | **REUSE for stretch** | Pinecone's cross-encoder reranker pass would meaningfully improve retrieval for questions where keyword + semantic both partially match. Add in Plan 4+. |
| `rag/hybrid.py` | Probably skip | Dense+sparse hybrid is overkill for 30KB corpus. Mention in walkthrough as "what I'd add for a larger corpus." |
| `rag/agentic.py` | Skip | Over-engineered for ISQ scope. Walkthrough talking point only. |
| `rag/orchestrator.py` | Pattern only | Borrow the routing + auto-escalation idea, simplify hard. Probably just "if confidence < threshold, retry with broader retrieval." |
| `core/morpheus_prompts.py` | **THROW AWAY** | Matrix-themed personality. Replace entirely (see Section 7a). |
| `utils/session.py` | Skip | Multi-tenant session isolation isn't needed for a single-tenant assessment. |
| `api/chat.py` | Reuse as scaffolding | FastAPI route pattern — swap chat semantics for `/answer` semantics. |
| `api/documents.py` | Reuse as scaffolding | Upload + index pattern — adapt for one-off corpus indexing. |
| Backend Dockerfile + docker-compose.yml | **DIRECT REUSE** | Already containerised. Add the n8n service to compose file. |
| Frontend (Next.js) | Mostly skip | We're not building a chat UI. n8n Form Trigger replaces it. Mention in walkthrough if Next.js dashboard becomes stretch goal. |

**What this means for the build:**
- The RAG service is mostly assembly, not greenfield. Estimated build time: 2-3 hours, not 8.
- That frees Tuesday for the n8n workflow, the rendering layer, and demo polish.
- The reuse story becomes a major walkthrough talking point.

---

## 7a. Visual & tone constraint — business-professional only

**LOCKED IN. NO EXCEPTIONS.**

This is a tool for answering enterprise security questionnaires. The aesthetic must match: corporate, calm, audit-ready. **Zero Matrix theming. Zero playfulness. Zero personality.**

| Element | Rule |
|---|---|
| System prompt for the LLM | Vendor-tone, formal, factual. Reads like an InfoSec Lead wrote it. No metaphors, no flourishes. |
| Generated answers | Mirror the tone of completed ISQ_01 (the gold-standard one). Concise, evidence-based, slightly clinical. |
| Output DOCX | Clean Calibri/Times. Northstar Labs header. Plain tables. No colour beyond a navy accent. Think compliance report, not deck. |
| Filled PDF/XLSX | Match the source document's existing style. Don't redesign. |
| n8n dashboard (Form Trigger UI) | Default n8n styling is fine. Don't customise. |
| Walkthrough slides (if any) | Times/Calibri, white background, navy + grey only. |
| README / docs | Professional engineering README. No emoji decoration. Headings, prose, code blocks. |
| Repo name and branding | Functional name: `isq-agent` or `northstar-isq-agent`. NOT `morpheus-isq`. |
| File comments / commit messages | Professional. No jokes. |

**Why this matters:** Lee and Gav need to imagine this running in front of a real Northstar Labs InfoSec Lead. Any whimsy breaks the illusion that it's enterprise-ready. The Matrix theme is a Morpheus personality decision; the ISQ Agent inherits Morpheus's *code*, not its *voice*.

---

## 7b. Wider portfolio patterns (beyond Morpheus)

Morpheus is the centerpiece for module reuse. The projects below contribute *specific patterns* worth drawing on, plus walkthrough talking points that demonstrate breadth of judgement.

| Project | Pattern/snippet worth borrowing | Where it lands in ISQ Agent |
|---|---|---|
| **NewsPerspective** | **Single-call multi-field analysis.** One LLM call returns `{sentiment, rewrite, tldr, good_news_flag}` instead of chaining four. Tuned via one prompt, parsed via one JSON schema. | Adopt directly. Our answer-generation call returns `{answer, citations, confidence_score, needs_review_reason}` in one shot. Cheaper, faster, easier to tune than chained calls. |
| **ReviewBot Protocol** | **Multi-dimension validation.** Six independent analysers (security, performance, quality, docs, testing, architecture) score each input on its own axis. | Adapt for **confidence scoring**: instead of "is the answer good," score it across 3-4 axes (cites policy? on-topic? vendor-appropriate tone? complete?). Aggregate → confidence score → flag threshold. More defensible than a single LLM self-rating. |
| **ReviewBot Protocol** | **Cost & token tracking baked into workflow state.** Every run records tokens and dollar cost. | Add to canonical JSON output: `{ ..., metrics: { tokens_used, estimated_cost, retrieval_time_ms } }`. Walkthrough talking point: production thinking, not a demo toy. |
| **SQL-Ball** | **Rules-in-system-prompt + context-injection-in-system-prompt.** Strict numbered rules ("Use EXACT column names from schema above — NO variations allowed") force grounded outputs. | Adopt directly for the ISQ answer prompt. Strict numbered rules: "Use EXACT terminology from the policy chunks provided", "Do not invent claims not present in the source", "Mark with [REVIEW] if no policy chunk supports the answer". |
| **Premier League Oracle (Oracle Chat)** | **Judgement about when NOT to use embeddings.** Oracle uses structured tabular grounding because the data is tabular; Morpheus uses vector RAG because the data is unstructured prose. | Walkthrough talking point only: "I've shipped vector RAG (Morpheus), tabular grounding (Oracle), and now hybrid here. For 6 policy PDFs + 3 ISQs of mixed structure, vector retrieval is the right tool — but for, say, the Simple Salvage XLSX itself I'd consider direct lookup. Architectural judgement, not framework worship." |
| **ModelViz** | **Multi-provider abstraction.** Base `ApiClient` interface lets the same code call OpenAI / Anthropic / Google / Cohere via swappable adapters. | Walkthrough talking point: "Claude is the right call here because RiverAI is a Claude partner and the answer quality on professional prose is strong. But the architecture allows swapping providers via the same interface I built for ModelViz." Buys credibility that the choice is intentional, not lock-in. |
| **AgenticAI Course Portfolio** | Breadth signal | Walkthrough talking point only: "I've worked across LangChain, LangGraph, OpenAI Assistants, and Anthropic-native tool use through my agentic AI coursework. The single-shot RAG here is the right level for this scope — but I can defend that judgement against any more complex pattern." |

### Honest assessment

The bulk of code reuse is still Morpheus. Everything else is **patterns and walkthrough credibility**, not modules. Combined, though, the picture is:

- **One module-lift project** (Morpheus) → de-risks the RAG core
- **Four pattern-borrow projects** (NewsPerspective, ReviewBot, SQL-Ball, Oracle) → improve specific design decisions (single-call analysis, multi-dim confidence, strict-rules prompts, RAG-selection judgement)
- **Two breadth signals** (ModelViz, AgenticAI) → walkthrough credibility

Lee has already seen Morpheus. The walkthrough story becomes:
> "Lee, when you saw Morpheus on Monday, you saw the RAG core I'm reusing here. What you didn't see was how it converges with patterns from my other projects — NewsPerspective's single-call analysis shape, ReviewBot's multi-dimension confidence scoring, SQL-Ball's rules-in-prompt grounding, and Oracle's judgement about when *not* to embed. The ISQ Agent is the synthesis."

That's a senior story — not "I built one thing for the assessment", but "the assessment is where four years of building converge."

---

## 7c. JobSearch2026 — the meta-pattern (the strongest walkthrough card you have)

Gav already saw the CV. The CV was generated by **JobSearch2026**, a system Tom built that maps directly onto the ISQ Agent. The two systems are architecturally identical at a structural level:

| JobSearch2026 component | ISQ Agent equivalent |
|---|---|
| `ExperienceLibrary.md` (master knowledge, 200KB structured markdown) | Northstar policies + historical ISQs (~30KB) indexed in Pinecone |
| `KNOWLEDGE_TomVoice.md` (style constraint, built from 18 months of Tom's emails) | Vendor-tone system prompt (built from ISQ_01 as gold standard) |
| 5 custom Claude Code skills (cv-generator, cs-apply, form-filler, interview-prep, job-tracker) | n8n workflow nodes + Python RAG service + custom prompts |
| "Apply mode" — job listing in, full package out | "ISQ mode" — blank questionnaire in, full filled response out |
| Multi-format output (Master Ultimate PDF + ATS PDF + Cover Letter + Notion log) | Multi-format output (filled original PDF/XLSX + clean DOCX + structured JSON) |
| Iterative quality discipline ("draft first, then refine. First drafts close to final quality") | Iterative quality discipline (10 plans, build twice per feature) |

**The walkthrough opener this unlocks (use verbatim or close):**

> "Lee, the CV you commented on Monday was generated by a system I built called JobSearch2026 — five custom Claude Code skills, a master knowledge library, a voice constraint document built from eighteen months of my own real emails, multi-format output. The ISQ Agent uses the exact same architectural pattern: knowledge-grounded generation, multi-format output, voice constraint, iterative quality. I didn't build this assessment from scratch — I took a working pattern from my own product and applied it to your domain. The quality you've already seen in my CV is what you'll see today, just pointed at supplier security questionnaires instead of job applications."

**Why this matters more than any other talking point:**

1. **Answers the unspoken interviewer question** — "are you a one-trick pony, or do you have a repeatable way of producing quality?"
2. **Builds on something Gav already validated** — the CV is direct proof of the pattern working
3. **Reframes the ISQ Agent** — not a one-off demo, but an instance of a generalisable system Tom has shipped before
4. **Demonstrates meta-architecture thinking** — most candidates show one system, Tom shows the META-pattern across multiple systems
5. **It's literally true** — this isn't spin. The mapping above is structurally accurate.

---

## 7d. Working-style commitments for the planning + build phase

Tom's stated needs for this project:

### Manual coding sections (muscle memory for CGI interview + ISQ walkthrough)

Tom changed his approach to mostly *reviewing* code rather than *typing* it. He has a CGI interview this week where he'll be observed typing code. Plus he needs muscle memory in the ISQ codebase for the RiverAI walkthrough demo. 

**Commitment:** every plan from Plan 2 onwards will include a clearly-marked section called **🖐️ Manual Coding Exercise** where I write out a code snippet (10-30 lines, meaningful, related to the feature being planned) that Tom literally types from scratch into the repo. Goals: muscle memory, code-fluency confidence, working knowledge of every line.

These exercises will:
- Have a clear purpose stated upfront ("this is the entry point for X")
- Be typeable in 5-15 minutes
- Have one or two TODO comments where I deliberately leave choices for Tom to fill in (5-10 lines max)
- Compile and run when complete

### Concept Primer explanations when needed

Tom wants concepts broken down simply so he can re-explain them in the walkthrough. 

**Commitment:** when introducing a dense concept (vector embeddings, reranking, Pinecone namespaces, n8n credentials, etc.) I'll add a clearly-marked **📘 Concept Primer** subsection that uses simple analogies.

(Originally framed as "🧒 ELI5" — renamed for portfolio polish per Audit 2 recommendation. Same content, professional framing.)

### Relaxed multi-day pace

It's a hot bank holiday Monday. No deadline. Tom is happy to spend a few days on this and do it properly. Business value beyond the job is a real motivation.

**Commitment:** I'll pace the plans accordingly. Each plan is meaty enough to be a real day's planning input but not so meaty that it forces an all-nighter. Plans 2-5 will likely take 2-3 plans per day if Tom keeps the current pace; Plans 6-10 will lean on what's been built.

### Business value beyond the job

If RiverAI doesn't extend an offer, the ISQ Agent should still be valuable IP. 

**Commitment:** every plan will flag where a build choice has commercial relevance ("this pattern is reusable for any vendor-questionnaire workflow", "this could become a paid service for SaaS companies that get a lot of supplier questionnaires"). Keeps the longer view alive without distorting the assessment scope.

### TDD is paramount (locked retroactively, applies Plan 4 onwards)

**Commitment locked 2026-05-25:** every component built from Plan 4 onwards follows TDD. Tests are designed first, watched-to-fail, then implementation makes them pass. Manual Coding Exercises shift accordingly — you type the test file first (which is also better CGI Wednesday prep, because test-writing is observable code-typing).

Plan 4 has the methodology defined in full. Plans 1-3 produced architectural artefacts (decisions, diagrams, scaffolding) rather than production logic, so retrofitting tests for them is light-touch — the Voyage client (Exercise 1) and FastAPI main (Exercise 2) get test-file companions in Plan 5 when we set up the branching + CI workflow.

### Branching strategy as its own plan (added 2026-05-25)

Plan 5 will now cover **Branching Strategy + Git Workflow** (GitHub Flow, Conventional Commits, PR workflow, tagging, pre-commit hooks, GitHub Actions CI, public-repo hygiene). This was originally going to be deferred but it belongs before the bulk of the build to ensure clean commit history that Lee will see on the public repo.

**Plan order shift (locked 2026-05-25):**
- Plan 5 = Branching Strategy + Git Workflow (NEW)
- Plan 6 = Question Extraction (was Plan 5)
- Plan 7 = Answer Generation (was Plan 6)
- Plan 8 = Confidence + Flagging (was Plan 7)
- Plan 9 = Output Rendering (was Plan 8)
- Plan 10 = Demo + Walkthrough Script (was Plan 9)
- Plan 11 = Final Consolidation (was Plan 10)

Total plans: 11 (was 10). Tom's "10 iterations" rule was about discipline, not exact count.

---

## 8. Risks (updated after Morpheus audit)

| Risk | Severity | Mitigation |
|---|---|---|
| n8n learning curve | HIGH | Spin up Docker tonight, walk through Form Trigger + HTTP Request + Code nodes. That's 90% of what we need. |
| Filled-PDF rendering is genuinely hard | MEDIUM-HIGH | Plan 8 will scope this carefully. Fallback: typeset a clean PDF that mirrors layout but isn't an overlay. Acceptable. |
| Three output formats blows the time budget | LOW (was MEDIUM) | JSON + DOCX is the safe pair. Filled-original is the stretch. Documented degradation path. |
| Blackridge OT questions have no Northstar coverage | LOW | The flagging system IS the answer. Demo this as a feature, not a bug. |
| ISQ_03 sparse answers contaminate output | MEDIUM | Prompt weights policies > historical ISQs. Eval against ISQ_01 (gold) catches it. |
| Walkthrough rehearsal gets dropped at end | HIGH | Wednesday evening blocked for rehearsal, non-negotiable. |
| **NEW: n8n ↔ Python service integration friction** | MEDIUM | Demo both running in `docker compose up`. Health-check endpoint. Plan 3 includes contract definition. |
| **NEW: Pinecone fresh project setup** | LOW | Tom has existing Pinecone account; creating a fresh project inside it takes ~5 min. Free tier covers this corpus easily (30KB vs ~200MB headroom). |
| **NEW: Voyage API sign-up + first-time use** | LOW-MEDIUM | Tom hasn't used Voyage before. Sign-up + key generation ~5 min. First-time API call may have surprises — Plan 2 includes a smoke-test exercise. |
| **NEW: GitHub repo submission logistics** | MEDIUM | Need to confirm with Lee how he wants to receive the submission (public repo link, private repo with invites, zip file). Plan 2 will flag this as a question to email Lee about. |
| **NEW: Tone bleed from Morpheus into ISQ outputs** | MEDIUM | New `isq_prompts.py` module, never imports `morpheus_prompts.py`. Lint check in CI. |

---

## 9. Open questions — RESOLVED ✅

All 8 original open questions are now resolved. See "Final Decisions Locked" table at top of doc.

| # | Question | Resolution |
|---|---|---|
| 1 | n8n hosting | ✅ Both — Docker primary, Cloud secondary |
| 2 | PDF rendering library | ⏳ Deferred to Plan 8 (will recommend `weasyprint` for clean DOCX-style + `pypdf`/`pdf-lib` for overlay) |
| 3 | Embedding model | ✅ Voyage (voyage-3-large) |
| 4 | Confidence scoring | ✅ Hybrid — multi-dim LLM + retrieval-similarity sanity check |
| 5 | Next.js dashboard | ✅ Stretch only, with Claude Design prompt |
| 6 | Repo structure | ⏳ Plan 2 will define exact folders (top-level `/n8n`, `/rag-service`, `/docs`, `/eval`, `/plans`, `/source-corpus`) |
| 7 | Morpheus module lift strategy | ✅ Direct copy with attribution comments, Matrix-strip protocol applied |
| 8 | Eval corpus for Ralph loop | ⏳ Plan 9 will define — use ISQ_01 as gold standard |

### 🆕 New open questions surfaced during the final sweep

| # | Question | Notes |
|---|---|---|
| 9 | Repo on-disk location | `/Users/tombutler/Repos/isq-agent` recommended. Top-level so it's easy to share with Lee. |
| 10 | GitHub repo visibility | Public recommended (portfolio piece, you may reference later). Private fine if you prefer. |
| 11 | How to share submission with Lee/Gav | Email Lee asking: "Public GitHub URL OK, or do you want a private repo with invites?" Worth asking this week before submission day. |
| 12 | Email trigger upgrade | Brief lists email as input option. n8n IMAP/Gmail trigger is ~20 min. **Recommend promoting from stretch to must-have.** Shows you read the brief and met more of its input options than the minimum. |
| 13 | Submission deadline (real) | Lee said decisions "early June" but didn't state a hard submit-by date. Worth asking Lee when you reply with any questions. Working assumption: aim for end of this week (Friday 29 May) or early next week (Monday/Tuesday 1-2 June). |
| 14 | Notion logging as stretch | Could log every ISQ run to Notion as an audit trail (you already use Notion for job tracker). Light stretch goal worth flagging — but only after must-haves are done. |

---

## 9a. What success looks like (the anchor for every following plan)

Concrete picture of the walkthrough demo. Every Plan 2-10 decision should serve this end-state. If a feature doesn't, it's out of scope.

```
[00:00] Tom shares screen. Opens the n8n canvas. Workflow visible.

[00:15] "I'll walk you through what this does in three minutes,
        then we'll go under the hood. Here's the trigger."

[00:30] Drag the Sunflowers Charity PDF into the n8n Form Trigger upload.
        Click submit. n8n run indicator starts.

[00:45] Workflow lights up green per node. ~30 seconds total runtime
        (depending on Claude latency + 20 questions × generation calls).

[01:15] Three download links appear:
          1. Sunflowers_Filled.pdf  (overlay onto original)
          2. Sunflowers_Response.docx (clean report version)
          3. Sunflowers_Response.json (structured data)

[01:30] Open the DOCX. Walk through:
          - 3 answers that landed strong (cite policy + concise + on-tone)
          - 1 answer flagged [REVIEW] with reason (e.g. "no policy chunk supports
            this — Northstar policies don't cover X")
          - The footer showing tokens used + cost (~$0.04) + latency

[03:00] Open the PDF. Show that the original Sunflowers layout is preserved
        with answers in the Response: boxes.

[03:30] Open the JSON. Show that the same answers exist as structured data
        — "this is what a downstream system would consume."

[04:00] Pivot to architecture. Show the n8n workflow canvas + the Python
        service via Docker logs. "Here's why two-tier."

[06:00] Open the code. Walk through the Voyage embedding call, the Claude
        generation call, and the multi-dim confidence scorer.
        Reference the patterns: "this confidence approach is from ReviewBot,
        this single-call shape is from NewsPerspective, this strict rules
        prompt is from SQL-Ball."

[09:00] The JobSearch2026 meta-pattern moment.
        "The CV you saw Monday was built by a system that works exactly like
        this. Same shape, different domain."

[11:00] Honest "what I'd do with more time":
          - Production deployment via n8n Cloud (mention it's exported and ready)
          - Email trigger as second input
          - Self-evaluation pass (Claude critiquing its own draft)
          - Reranker stage for larger corpora
          - Notion audit logging

[13:00] Q&A.
```

**The non-negotiables baked into this picture:**
- One inbound ISQ runs end-to-end live, no pre-baked demo
- Three output formats demonstrably work
- At least one [REVIEW] flag is visible (proves the flagging is real, not theatre)
- Cost + latency visible (proves production thinking)
- Architecture explained before code, code explained before story
- JobSearch2026 meta-story lands in the middle (not the very end)
- "What I'd do with more time" closes — Lee explicitly asked for this

---

## 9b. Calendar / pacing (rough plan, adjustable)

Today is **Monday 25 May 2026** (UK bank holiday). Tom is fresh, no submission deadline yet confirmed. CGI interview Wednesday daytime is protected.

| Day | Focus | Plans |
|---|---|---|
| **Mon 25 (today)** | Planning sprint, foundation laid | ✅ Plan 1 done. Plan 2 if energy allows. |
| **Tue 26** | Deep planning + repo scaffold | Plans 2-5 (stack lock-in, knowledge base design, question extraction, answer generation). First manual coding exercise. n8n install. Voyage + Pinecone signup. |
| **Wed 27 morning** | 🚫 PROTECTED — CGI interview | No ISQ work scheduled. Use last 30min of Tue night to rehearse CGI typing if needed. |
| **Wed 27 evening** | Resume, momentum check | Plan 6-7 (confidence scoring, output rendering). Manual coding exercises continue. |
| **Thu 28** | Build day | Plan 8 (output rendering). Implementing what's been planned. RAG service running, basic n8n workflow assembled. |
| **Fri 29** | Build day + demo polish | Plan 9 (walkthrough script + Claude Design prompt for stretch dashboard). Run the demo end-to-end at least once. |
| **Sat 30 / Sun 31** | Optional polish + rehearsal | Plan 10 (final consolidation). Rehearse the walkthrough out loud 2-3 times. Address any rough edges. |
| **Mon 1 Jun** | Submission window opens | Submit if rehearsal felt strong. Otherwise buffer day. |
| **Tue 2 Jun** | Latest reasonable submission | Final buffer. Anything later risks looking like over-cooking. |

**Decisions to make this week:**
- Email Lee on Tuesday or Wednesday with: (a) confirm GitHub access preference (public vs private), (b) confirm submission deadline if any
- Decide by Friday whether the Next.js dashboard is genuinely going to ship or remain as a Claude Design prompt deliverable

---

## 10. What Plan 2 will tackle (now that Plan 1 is locked)

Given Tom's locked answers, Plan 2 focuses on:

- **Repo structure** — monorepo `isq-agent` with `/n8n` (workflows + exported JSON), `/rag-service` (Python service derived from Morpheus), `/docs` (architecture + walkthrough notes + learning markdown), `/eval` (Ralph loop corpus + scoring), `/plans` (this folder), `/source-corpus` (Northstar policies + ISQs)
- **Morpheus lift protocol** — exact module-by-module copy list with Matrix-strip checklist
- **Voyage embedding setup** — API key, model choice (voyage-3-large vs voyage-2 vs voyage-finance-2), Pinecone index dimensions
- **Fresh Pinecone project setup** — index config, namespace `default`, dimensions matching Voyage
- **n8n local Docker setup** — docker-compose.yml additions, persistent volumes, credentials store
- **Service contract** — `POST /answer` and `POST /index` HTTP schemas between n8n and the Python service
- **🖐️ Manual Coding Exercise 1** — typing out the Voyage embedding client wrapper (first hands-on code)
- **📘 Concept Primer sections** — vector embeddings, Pinecone namespaces vs projects, n8n credentials store

---

## Plan 1 closed out ✅

All 9 decisions locked (see top of doc). JobSearch2026 meta-pattern surfaced and integrated. Working-style commitments captured. Ready to start Plan 2.

**Plan 2 coming next:** Stack Lock-In + Service Contract + Repo Structure + first 🖐️ Manual Coding Exercise.
