# Plan 7 — Answer Generation Strategy (TDD-first)

**Status:** Plan 7. TDD-first (Plan 4 lock). Branching + Conventional Commits + CI (Plan 5 lock). Unified LLM extraction lands questions (Plan 6).

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1-6 ✅

---

## 0. What this plan does and doesn't do

**Locks in:**
- The internal flow of `POST /answer` (the per-question RAG pipeline)
- System prompt for the answer generator (SQL-Ball strict rules + NewsPerspective single-call shape)
- Few-shot example selection from ISQ_01 (the gold-standard historical ISQ)
- Source weighting in the prompt (prompt-level, in addition to retrieval-time weighting from Plan 4)
- Citation tracking — how the LLM identifies which chunks it used
- The Anthropic tool-use schema for guaranteed structured output
- Edge case handling: no chunks retrieved, all chunks irrelevant, Claude refusal, token-limit truncation
- Test plan written FIRST

**Doesn't yet cover:**
- Confidence scoring weights + thresholds (Plan 8 — uses the self_score this plan produces)
- Output rendering (Plan 9)
- Demo script (Plan 10)
- Final execution timeline (Plan 11)

---

## 1. The internal flow of `POST /answer`

Per Plan 3 Section 2, the path is:

```
POST /answer
  ↓
1. Validate request (question text, source_format, hints)
  ↓
2. Query rewrite (Plan 4) → expanded retrieval query
  ↓
3. Embed expanded query (Voyage)
  ↓
4. Retrieve top-K chunks from Pinecone (Plan 4)
  ↓
5. Apply source weighting (Plan 4 — policies preferred over historical_isq)
  ↓
6. Build the generation prompt (THIS PLAN):
     - System prompt with strict rules + self-score definitions
     - Few-shot examples from ISQ_01 (2 examples, ~250 tokens each)
     - Retrieved chunks formatted with [source_id|type] prefixes
     - The actual question
  ↓
7. Call Claude with tool-use forcing the answer schema
  ↓
8. Parse tool-use response → AnswerResult
  ↓
9. Pass to confidence aggregator (Plan 8 will define how self_score becomes the final confidence)
  ↓
10. Return canonical response (Plan 2 service contract):
      { answer, citations, confidence, metrics }
```

This plan is responsible for **steps 6, 7, 8**. Steps 1-5 are from Plans 2-4. Step 9 hands off to Plan 8.

---

## 2. Test plan (defined FIRST)

### Tests for the answer generator (`tests/test_generator.py`)

| Test name | What it verifies |
|---|---|
| `test_generate_returns_answer_result` | Given retrieved chunks + question, returns `AnswerResult` with all required fields |
| `test_generate_calls_claude_with_tool_use` | Verifies the Anthropic call uses `tool_choice` to force structured output |
| `test_generate_includes_few_shot_examples` | System prompt includes ≥1 few-shot Q/A from ISQ_01 |
| `test_generate_formats_chunks_with_source_ids` | Each chunk in prompt is prefixed with `[source_id|type]` |
| `test_generate_returns_citations` | Response includes citations referencing chunk source_ids |
| `test_generate_self_scores_all_four_dimensions` | `cites_policy`, `on_topic`, `vendor_tone`, `complete` all present, all in [0.0, 1.0] |
| `test_generate_no_chunks_returns_needs_review` | Empty chunks list → answer says "no source supports this" + `needs_review=true` |
| `test_generate_only_low_score_chunks_returns_needs_review` | All chunks below min_score → `needs_review=true` |
| `test_generate_handles_anthropic_refusal` | When Claude returns refusal, surfaces as `needs_review=true` with reason |
| `test_generate_handles_anthropic_failure` | When API errors, raises `GenerationError` (n8n retries upstream) |
| `test_generate_respects_token_limit` | When chunks too large for context, truncates and adds warning |
| `test_generate_logs_metrics` | Logs tokens_in, tokens_out, cost_usd, latency_ms with `request_id` |
| `test_generate_prefers_policy_in_prompt` | Policy chunks listed before historical_isq chunks in the SOURCES block |
| `test_generate_includes_question_index_in_prompt` | Hint about question index/total surfaces in prompt context |

### Tests for the `/answer` endpoint (`tests/test_answer_endpoint.py`)

| Test name | What it verifies |
|---|---|
| `test_answer_endpoint_returns_200` | Valid request → 200 + full canonical JSON |
| `test_answer_endpoint_returns_422_for_missing_question` | Missing question field → 422 with clear error |
| `test_answer_endpoint_propagates_request_id` | `X-Request-Id` in request appears in logs |
| `test_answer_endpoint_handles_pinecone_failure` | Pinecone down → 503 (n8n retries) |
| `test_answer_endpoint_handles_voyage_failure` | Voyage down → 503 |
| `test_answer_endpoint_handles_anthropic_failure` | Claude down → 503 |
| `test_answer_endpoint_returns_canonical_response` | Response matches Plan 2 service contract shape |

**Test count for Plan 7 scope:** ~21 tests. Estimated writing time: ~100 minutes.

---

## 3. System prompt design (locked v0, refined in eval)

### Full system prompt

```
You are an Information Security Lead at Northstar Labs answering a supplier security
questionnaire. The questionnaire was sent by a potential client conducting vendor due
diligence.

STRICT RULES:
1. Use ONLY the chunks provided in the SOURCES section below.
2. Do not invent claims not present in the sources.
3. Prefer policy chunks over historical ISQ chunks when both cover the question.
4. Tone: professional, vendor-appropriate, concise. Mirror the style of historical ISQ answers.
5. Length: 2-4 sentences typical. Longer (5-7) for "describe" or "how do you" questions.
6. Format: prose, not bullet points (unless the source itself uses bullets).
7. If no source supports the answer, set needs_review: true with a specific reason.
8. Never apologise. Never add "as an AI". Never add a disclaimer.
9. Use UK English spelling (organisation, programme, behaviour).

You MUST call the `submit_answer` tool with this exact structure:
{
  "answer": "the answer to the requester",
  "citations": [{ "source_id": "string from chunk header", "text_snippet": "up to 200 chars of cited text" }],
  "self_score": {
    "cites_policy": 0.0-1.0,
    "on_topic": 0.0-1.0,
    "vendor_tone": 0.0-1.0,
    "complete": 0.0-1.0
  },
  "needs_review_reason": "string explaining why review is needed, or null"
}

SELF-SCORE DEFINITIONS:
- cites_policy: 1.0 if grounded in ≥1 [policy] chunk; 0.5 if only [historical_isq] chunks; 0.0 if invented or no sources used
- on_topic: 1.0 if directly answers the question; lower if drifting or partial
- vendor_tone: 1.0 if matches historical ISQ style; lower if too casual, marketing-flavoured, or hedging
- complete: 1.0 if fully answers the question; lower if partial, evasive, or missing scope

Set needs_review_reason WHEN:
- No sources support the answer
- The question is outside Northstar Labs' scope (e.g. operational technology, when Northstar is software-only)
- Sources contradict each other
- The question is ambiguous and a clarification would help
Otherwise set it to null.
```

### Few-shot examples (from ISQ_01 — the gold-standard historical ISQ)

Two examples chosen to anchor tone + show schema usage:

```
EXAMPLE 1 ─────────────────────────────────────────────

QUESTION: Do you maintain a formal information security policy?

SOURCES:
[isp-s0|policy] Northstar Labs is a UK-based software development and AI solutions company committed to maintaining high standards of information security, data protection, and operational resilience. Document Owner: Information Security Lead. Review Frequency: Annually.

[hist01-q1|historical_isq] Q: Do you maintain a formal information security policy?
A: Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership. The policy covers access control, encryption, acceptable use, security responsibilities, asset management, and incident management.

TOOL CALL (submit_answer):
{
  "answer": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership. The policy covers access control, encryption, acceptable use, security responsibilities, asset management, and incident management.",
  "citations": [
    { "source_id": "isp-s0", "text_snippet": "Northstar Labs is a UK-based software development and AI solutions company committed to maintaining high standards of information security" },
    { "source_id": "hist01-q1", "text_snippet": "Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership" }
  ],
  "self_score": { "cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 0.95, "complete": 1.0 },
  "needs_review_reason": null
}

EXAMPLE 2 ─────────────────────────────────────────────

QUESTION: How is privileged access to operational technology (OT) systems controlled?

SOURCES:
[isp-s2|policy] Access to company systems, applications, repositories, and customer environments must follow the principle of least privilege. User accounts must be uniquely assigned to individuals and shared accounts are prohibited unless formally approved for operational reasons.

[ssdlc-s1|policy] Northstar Labs follows a secure software development lifecycle (SDLC) that incorporates security considerations throughout the design, development, testing, deployment, and maintenance phases of software delivery.

TOOL CALL (submit_answer):
{
  "answer": "Northstar Labs does not operate operational technology (OT) systems or critical infrastructure environments. We are a software development and AI solutions company. For our software environments, privileged access follows the principle of least privilege with unique user accounts, formal approval for shared accounts, multi-factor authentication, and quarterly access reviews. Please contact us to confirm the scope of your assessment.",
  "citations": [
    { "source_id": "isp-s2", "text_snippet": "Access to company systems must follow the principle of least privilege. User accounts must be uniquely assigned to individuals" }
  ],
  "self_score": { "cites_policy": 0.7, "on_topic": 0.7, "vendor_tone": 0.95, "complete": 0.6 },
  "needs_review_reason": "Question asks specifically about operational technology (OT). Northstar Labs is a software-only company and does not operate OT environments. Answer represents a scope-limitation statement. Recommend manual review to confirm the requester accepts this framing."
}
```

These two examples cover:
- **Example 1:** the easy case — policy + historical answer both cover the question, high confidence, no review needed
- **Example 2:** the awkward case — question asks about something Northstar doesn't do, answer explains the scope mismatch honestly + flags for review

### User prompt template

```
QUESTION (#{question_index} of {total_questions}): {question_text}

SOURCES (ranked by relevance, policies first):

{formatted_chunks}

Submit your answer using the submit_answer tool.
```

### Chunk formatting

Each retrieved chunk is rendered as:

```
[{source_id}|{type}|score={score:.2f}] {chunk_text}
```

Example:

```
[isp-s3-c0|policy|score=0.91] Multi-factor authentication (MFA) is mandatory for all cloud platforms, administrative accounts, source control platforms, VPN access, and business-critical systems.

[hist01-q2|historical_isq|score=0.85] Q: Is multi-factor authentication (MFA) enforced for critical systems?
A: Yes. Multi-factor authentication is mandatory for all cloud platforms, VPN access, source control systems, CI/CD tooling, administrative accounts, and customer production environments.
```

The `[id|type|score]` header lets the LLM cite by id and respect the type-based weighting rule.

---

## 4. Source weighting in the prompt (in addition to Plan 4 retrieval weighting)

Plan 4 weights `historical_isq` chunks by 0.95 at retrieval time (gentle post-retrieval re-rank). This plan adds a **prompt-level** preference:

- Chunks are listed in retrieval-rank order (already policy-preferred)
- The system prompt rule #3 explicitly says "Prefer policy chunks over historical ISQ chunks when both cover the question"
- The `cites_policy` self-score rewards policy citations (1.0) over historical_isq citations (0.5)

This is **belt + braces**: retrieval-level + prompt-level + self-score-level all push toward policy grounding.

Walkthrough talking point: "I made source preference explicit at three layers — retrieval rank, prompt instruction, and self-scoring weight. Lee can read the system prompt and see exactly how the preference is encoded."

---

## 5. Citation tracking — how the LLM identifies chunks

The LLM returns `citations: [{ source_id, text_snippet }]`. We use `source_id` to:

1. **Cross-reference back to the chunk** in Pinecone metadata (for the renderers — filled-PDF needs to know which page to overlay)
2. **Verify the citation is real** (lint check: every cited `source_id` must exist in the chunks we provided. If not, log a warning — it means the LLM hallucinated a citation, which is rare but worth catching)
3. **Build a "sources used" tally per ISQ** (for the summary metrics section of the output)

### Lint check pseudocode

```python
def verify_citations(claimed_citations: list, provided_chunks: list) -> list[str]:
    """Return list of source_ids that the LLM claimed but weren't in the provided chunks."""
    provided_ids = {c["source_id"] for c in provided_chunks}
    claimed_ids = {c["source_id"] for c in claimed_citations}
    hallucinated = claimed_ids - provided_ids
    return list(hallucinated)
```

If hallucinated citations appear:
- Log warning with `request_id`, the hallucinated id, and the question
- Don't fail the response — the answer might still be good, the citation is the issue
- Mark confidence dimension `cites_policy` down by 0.2

---

## 6. Edge case handling

### Edge case 1: zero chunks retrieved

When Pinecone returns nothing above `min_score=0.5`:

```python
if not retrieved_chunks:
    return AnswerResult(
        answer="Northstar Labs cannot provide a grounded answer to this question from our published policy documents. Please contact us directly to discuss this specific area.",
        citations=[],
        self_score={"cites_policy": 0.0, "on_topic": 0.5, "vendor_tone": 0.9, "complete": 0.3},
        needs_review_reason="No source documents matched this question above the relevance threshold. Recommend manual review and possible policy gap analysis.",
        metrics=metrics_so_far,
    )
```

We do NOT call Claude in this case — saves a token, and the answer is deterministic and honest.

### Edge case 2: chunks retrieved but all irrelevant

The LLM should detect this itself (the self-score `cites_policy` will be low). We trust the LLM's self-assessment. Plan 8's confidence aggregator will catch low scores and flag.

### Edge case 3: Claude refuses to answer

Anthropic's Claude can refuse if it interprets the question as harmful or out-of-scope. This is rare for security questionnaires but worth handling.

```python
try:
    response = await call_claude_with_tool_use(prompt, ...)
except RefusalError as e:
    return AnswerResult(
        answer="An automated draft cannot be produced for this question.",
        citations=[],
        self_score={"cites_policy": 0.0, "on_topic": 0.0, "vendor_tone": 0.0, "complete": 0.0},
        needs_review_reason=f"LLM declined to produce an answer: {e.reason}",
        metrics=metrics_so_far,
    )
```

### Edge case 4: token limit exceeded

If retrieved chunks + few-shots + question exceed the model's context window (200K tokens for Claude Sonnet 4.5 — very unlikely for our scope), we truncate from the lowest-scored chunks first and add a warning.

### Audit 3 — Anthropic rate limit handling (added 2026-05-25)

Claude Sonnet 4.5 is typically rate-limited to 50 RPM on standard accounts. Running 20 questions in parallel will hit this.

**n8n configuration:**
- HTTP Request node `Batch size = 5` (not 10+ default)
- Retry on 429 status per Plan 3 Section 4 retry policy
- Honour `Retry-After` header

**rag-service handling:**
- Catch `anthropic.RateLimitError`
- Re-raise as HTTP 503 so n8n's retry logic kicks in
- Log the wait time from `Retry-After`

This is operational hygiene — without it, Sunflowers could half-finish then 429 the remaining questions all at once.

### Audit 3 — explicit metric fields in AnswerResult (added 2026-05-25)

The Plan 2 service contract specifies these metric fields. Make them explicit in the dataclass:

```python
@dataclass
class AnswerMetrics:
    tokens_in: int       # prompt tokens (system + few-shots + user)
    tokens_out: int      # generation tokens
    embedding_tokens: int  # from the Voyage query embed call
    cost_usd: float      # combined cost across Claude + Voyage
    latency_ms: int      # total round-trip including retrieval

@dataclass
class AnswerResult:
    answer: str
    citations: list[Citation]
    self_score: dict[str, float]
    needs_review_reason: str | None
    metrics: AnswerMetrics  # always populated, never None
```

Plan 9 renderers + Plan 8 confidence aggregator depend on this shape.

### Audit 3 — extended thinking DEFERRED

Original Plan 7 mentioned Claude extended thinking for hard questions as a stretch. **Cut from v1 per Audit 3.** Mention in Plan 10's "what I'd do with more time" only. No code path.

```python
def truncate_chunks_to_token_budget(chunks: list, budget: int) -> tuple[list, int]:
    """Trim chunks from the bottom until total token count fits the budget."""
    kept = []
    used_tokens = 0
    for chunk in chunks:  # already sorted by score, highest first
        chunk_tokens = estimate_tokens(chunk["text"])
        if used_tokens + chunk_tokens > budget:
            break
        kept.append(chunk)
        used_tokens += chunk_tokens
    truncated_count = len(chunks) - len(kept)
    return kept, truncated_count
```

For our 30KB corpus this will never trigger. Worth implementing anyway — production-thinking signal.

---

## 7. Anthropic tool-use schema

```python
SUBMIT_ANSWER_TOOL = {
    "name": "submit_answer",
    "description": "Submit a grounded answer to a security questionnaire question.",
    "input_schema": {
        "type": "object",
        "properties": {
            "answer": {
                "type": "string",
                "description": "The answer to provide to the requester.",
            },
            "citations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "source_id": {"type": "string"},
                        "text_snippet": {"type": "string", "maxLength": 200},
                    },
                    "required": ["source_id", "text_snippet"],
                },
            },
            "self_score": {
                "type": "object",
                "properties": {
                    "cites_policy": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "on_topic": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "vendor_tone": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "complete": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                },
                "required": ["cites_policy", "on_topic", "vendor_tone", "complete"],
            },
            "needs_review_reason": {
                "type": ["string", "null"],
                "description": "Reason if needs_review, otherwise null.",
            },
        },
        "required": ["answer", "citations", "self_score", "needs_review_reason"],
    },
}
```

Force the tool call with `tool_choice={"type": "tool", "name": "submit_answer"}` so Claude can't reply in any other shape.

---

## 8. 🖐️ Manual Coding Exercise 6 — TEST FILE FIRST

**Purpose:** TDD cycle for answer generation. ~80 lines tests + ~150 lines implementation. Total ~50 minutes.

### Part A — type the test file FIRST

**File:** `rag-service/tests/test_generator.py`

```python
"""
Tests for the answer generator.
Written FIRST per TDD discipline. Implementation in app/rag/generator.py follows.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.rag.generator import generate_answer, AnswerResult, GenerationError


# Fixtures

@pytest.fixture
def policy_chunks():
    """Mocked retrieval result — two policy chunks for an MFA question."""
    return [
        {
            "source_id": "isp-s3-c0",
            "source_type": "policy",
            "source": "Northstar_Labs_Information_Security_Policy.pdf",
            "text": "Multi-factor authentication (MFA) is mandatory for all cloud platforms, "
                    "administrative accounts, source control platforms, VPN access, and business-critical systems.",
            "score": 0.91,
        },
        {
            "source_id": "hist01-q2",
            "source_type": "historical_isq",
            "source": "Northstar_Labs_Previous_ISQ_Completed_01.pdf",
            "text": "Q: Is multi-factor authentication (MFA) enforced for critical systems? "
                    "A: Yes. Multi-factor authentication is mandatory for all cloud platforms, VPN access, "
                    "source control systems, CI/CD tooling, administrative accounts, and customer production environments.",
            "score": 0.85,
        },
    ]


@pytest.fixture
def empty_chunks():
    return []


@pytest.fixture
def mock_claude_response():
    """Mocked Anthropic tool-use response shape."""
    response = MagicMock()
    response.content = [
        MagicMock(
            type="tool_use",
            name="submit_answer",
            input={
                "answer": "Yes. Multi-factor authentication is mandatory for all cloud platforms, "
                          "administrative accounts, source control, VPN access, and business-critical systems.",
                "citations": [
                    {"source_id": "isp-s3-c0", "text_snippet": "MFA is mandatory for all cloud platforms"},
                ],
                "self_score": {
                    "cites_policy": 1.0,
                    "on_topic": 1.0,
                    "vendor_tone": 0.95,
                    "complete": 0.9,
                },
                "needs_review_reason": None,
            },
        )
    ]
    response.usage.input_tokens = 1240
    response.usage.output_tokens = 95
    return response


# Tests

class TestGenerateAnswer:
    @patch("app.rag.generator.call_claude_with_tool_use")
    def test_returns_answer_result(self, mock_call, policy_chunks, mock_claude_response):
        mock_call.return_value = mock_claude_response

        result = generate_answer(
            question="Is MFA enforced for staff access to business systems?",
            chunks=policy_chunks,
            request_id="test-001",
        )

        assert isinstance(result, AnswerResult)
        assert result.answer.startswith("Yes")
        assert len(result.citations) >= 1
        assert result.self_score["cites_policy"] == 1.0

    @patch("app.rag.generator.call_claude_with_tool_use")
    def test_includes_few_shot_in_prompt(self, mock_call, policy_chunks, mock_claude_response):
        mock_call.return_value = mock_claude_response

        generate_answer(
            question="Test question?",
            chunks=policy_chunks,
            request_id="test-002",
        )

        # The system prompt or messages passed to Claude should include the word "EXAMPLE"
        call_args = mock_call.call_args
        prompt_text = str(call_args)
        # TODO ① — Tom: assert that the prompt includes "EXAMPLE" (case-insensitive)
        # Hint: assert "example" in prompt_text.lower()
        # ~1 line.
        pass

    @patch("app.rag.generator.call_claude_with_tool_use")
    def test_chunks_formatted_with_source_id_prefix(self, mock_call, policy_chunks, mock_claude_response):
        mock_call.return_value = mock_claude_response

        generate_answer(
            question="Test question?",
            chunks=policy_chunks,
            request_id="test-003",
        )

        call_args = mock_call.call_args
        prompt_text = str(call_args)
        assert "[isp-s3-c0|policy" in prompt_text
        assert "[hist01-q2|historical_isq" in prompt_text

    def test_no_chunks_returns_needs_review_without_calling_claude(self, empty_chunks):
        # Should NOT call Claude when no chunks retrieved
        with patch("app.rag.generator.call_claude_with_tool_use") as mock_call:
            result = generate_answer(
                question="A question with no matching policies",
                chunks=empty_chunks,
                request_id="test-004",
            )

            mock_call.assert_not_called()
            assert result.self_score["cites_policy"] == 0.0
            assert "manual review" in result.needs_review_reason.lower()

    @patch("app.rag.generator.call_claude_with_tool_use")
    def test_handles_anthropic_failure(self, mock_call, policy_chunks):
        mock_call.side_effect = ConnectionError("Anthropic API unreachable")

        with pytest.raises(GenerationError):
            generate_answer(
                question="Test?",
                chunks=policy_chunks,
                request_id="test-005",
            )

    @patch("app.rag.generator.call_claude_with_tool_use")
    def test_self_score_has_all_four_dimensions(self, mock_call, policy_chunks, mock_claude_response):
        mock_call.return_value = mock_claude_response

        result = generate_answer(
            question="Test?",
            chunks=policy_chunks,
            request_id="test-006",
        )

        assert "cites_policy" in result.self_score
        assert "on_topic" in result.self_score
        assert "vendor_tone" in result.self_score
        assert "complete" in result.self_score
        # TODO ② — Tom: assert that each score is between 0.0 and 1.0 inclusive
        # Hint: for dim, score in result.self_score.items():
        #           assert 0.0 <= score <= 1.0
        # ~2 lines.
        pass


class TestCitationVerification:
    @patch("app.rag.generator.call_claude_with_tool_use")
    def test_warns_on_hallucinated_citation(self, mock_call, policy_chunks, caplog):
        """If Claude cites a source_id that wasn't provided, log a warning."""
        # Mock Claude returning a citation to a chunk we never provided
        hallucinated_response = MagicMock()
        hallucinated_response.content = [
            MagicMock(
                type="tool_use",
                name="submit_answer",
                input={
                    "answer": "Some answer.",
                    "citations": [
                        {"source_id": "made-up-id-999", "text_snippet": "..."},
                    ],
                    "self_score": {"cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 1.0, "complete": 1.0},
                    "needs_review_reason": None,
                },
            )
        ]
        hallucinated_response.usage.input_tokens = 100
        hallucinated_response.usage.output_tokens = 50
        mock_call.return_value = hallucinated_response

        result = generate_answer(
            question="Test?",
            chunks=policy_chunks,
            request_id="test-007",
        )

        # Warning logged about hallucinated citation
        assert any("hallucinated" in r.message.lower() for r in caplog.records)
        # cites_policy penalised
        assert result.self_score["cites_policy"] < 1.0
```

### Part B — run tests, watch them fail

```bash
cd rag-service
pytest tests/test_generator.py -v
# Expected: ModuleNotFoundError. Tests fail for the right reason.
```

### Part C — implement to make tests pass

**File:** `rag-service/app/rag/generator.py`

Structure (code-write at normal pace, ~150 lines):

1. `AnswerResult` dataclass: `answer`, `citations`, `self_score`, `needs_review_reason`, `metrics`
2. `GenerationError` exception class
3. `generate_answer(question, chunks, request_id)` — main entry point
   - Handle empty chunks → return deterministic needs_review response
   - Build messages: system prompt + few-shots + user prompt with chunks
   - Call `call_claude_with_tool_use` (mockable in tests)
   - Parse tool-use response
   - Verify citations against provided chunks (Section 5 lint)
   - Penalise self-score for hallucinated citations
   - Return `AnswerResult`
4. `call_claude_with_tool_use(messages, system, tools, tool_choice)` — thin wrapper around `anthropic.Anthropic().messages.create`
5. `_build_system_prompt()` — returns the full system prompt (Section 3)
6. `_build_few_shot_messages()` — returns the 2 few-shot example messages
7. `_format_chunks_for_prompt(chunks)` — renders `[source_id|type|score=N] text`
8. `_verify_citations(claimed, provided)` — returns list of hallucinated source_ids

### Part D — verify all tests green

```bash
pytest tests/test_generator.py -v
# Expected: all green
```

### Part E — wire up the `/answer` endpoint

**File:** `rag-service/app/api/answer.py`

```python
from fastapi import APIRouter, HTTPException, Header
from app.rag.query_rewriter import rewrite_query
from app.rag.retriever import retrieve_chunks
from app.rag.generator import generate_answer, GenerationError
from app.models.answer import AnswerRequest, AnswerResponse

router = APIRouter()

@router.post("/answer", response_model=AnswerResponse)
async def answer_endpoint(
    request: AnswerRequest,
    x_request_id: str = Header(default="unknown"),
) -> AnswerResponse:
    try:
        rewritten = await rewrite_query(request.question)
        chunks = await retrieve_chunks(rewritten, top_k=5)
        result = generate_answer(
            question=request.question,
            chunks=chunks,
            request_id=x_request_id,
        )
        # Plan 8 will add the confidence aggregator here
        return AnswerResponse(**result.to_canonical_response())
    except GenerationError as e:
        raise HTTPException(status_code=503, detail=str(e))
```

Plus `tests/test_answer_endpoint.py` per Section 2.

### Acceptance for TODOs

- **TODO ①** (Part A line ~95): `assert "example" in prompt_text.lower()` — 1 line
- **TODO ②** (Part A line ~140): loop through `result.self_score` and assert each value in [0.0, 1.0] — 2 lines

### Commit pattern

```bash
git checkout -b feature/answer-generator
git add tests/test_generator.py
git commit -m "test(generator): add failing tests for answer generation"
# Implement
git add app/rag/generator.py app/models/
git commit -m "feat(generator): add Claude tool-use answer generator with citation verification"
# Endpoint
git add app/api/answer.py tests/test_answer_endpoint.py
git commit -m "feat(api): wire /answer endpoint with retriever + generator"
git push -u origin feature/answer-generator
# Open PR, self-review, squash-merge
```

---

## 9. 📘 Concept Primer

### Few-shot prompting

When you give Claude a task with no examples, it's working from general training only — it'll do the task, but the style and shape of the output can vary.

When you give Claude **2-3 examples** of the task done well, it sees the pattern and produces output that matches those examples. The examples are called "few-shot" (a few examples, vs "zero-shot" with none).

For us, the few-shot examples come from ISQ_01 — the gold-standard historical questionnaire. We show Claude: "here's a question, here are the sources, here's the perfect response." Then we ask: "Now do this one." Claude matches the tone, structure, and self-scoring approach automatically.

It's like onboarding a new employee. You don't just give them the job description — you show them two examples of "here's what good looks like." They calibrate quickly.

### Citations vs grounding

These two words sound similar but mean different things:

- **Grounding** = the answer is BASED ON the provided source documents. No invented facts.
- **Citations** = the answer LABELS which specific documents support each claim.

You can have grounding without citations ("the answer is based on sources, but I haven't said which ones"). You can have citations without grounding ("I cite source X but my answer doesn't actually use what X says"). We want BOTH.

Our self-score `cites_policy` measures grounding (is the answer based on policy?). Our `citations` array provides the labels (which chunks?). Our lint check (Section 5) verifies the citations are real and not hallucinated.

### Refusal handling

Sometimes the AI will refuse to answer — maybe it thinks the question is harmful, ambiguous, or outside its capability. This is rare for security questionnaires (low-risk content) but possible.

We treat refusal as a normal outcome, not an error. The response says "an automated draft cannot be produced for this question" and the `needs_review_reason` explains why the LLM declined. The user gets a clear flag to handle that question manually.

The point: don't pretend refusals don't happen. Handle them as a first-class case so the system is honest about its limits.

---

## 10. End-of-Plan-7 checklist

For the build session:

- [ ] `git checkout -b feature/answer-generator`
- [ ] Create `rag-service/tests/test_generator.py` (Manual Coding Exercise 6 Part A) — TYPE
- [ ] Run `pytest tests/test_generator.py -v` — confirm failures
- [ ] Implement `rag-service/app/rag/generator.py` (Part C) — code-write at normal pace
- [ ] Run tests until green
- [ ] Commit: `test(generator): add failing tests for answer generation`
- [ ] Commit: `feat(generator): add Claude tool-use answer generator with citation verification`
- [ ] Add `app/api/answer.py` + `app/models/answer.py` + `tests/test_answer_endpoint.py`
- [ ] Commit: `feat(api): wire /answer endpoint with retriever + generator`
- [ ] Open PR, self-review, squash-merge
- [ ] Delete feature branch
- [ ] Tag `v0.3.0` once Plan 7 fully complete (RAG core can answer one question end-to-end)

Optional smoke test against real corpus:

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoketest-q01" \
  -d '{"question": "Do you maintain a formal Information Security Policy?", "source_format": "pdf"}'
# Expected: JSON with answer, citations, self_score, metrics
```

---

## 11. What Plan 8 will tackle

Plan 8 — **Confidence + Flagging Strategy (TDD-first)**:

- The hybrid confidence aggregator (LLM self-score + retrieval similarity sanity check, per Plan 1 decision)
- Weighted-mean aggregation of the 4 self-score dimensions (cites_policy weighted heaviest)
- Threshold logic for `needs_review: true` (when aggregate < 0.6 OR cites_policy < 0.5)
- How needs_review propagates into the rendered outputs (DOCX, filled-PDF, JSON)
- Edge cases: all answers flagged, mixed confidence within one ISQ
- 🖐️ **Manual Coding Exercise 7** — typing `tests/test_confidence.py` first, then the aggregator module
- 📘 Concept Primer sections: weighted means, thresholds, hybrid scoring

---

## Git execution block

See `git-conventions.md` for the full reference.

**Branch:** `feature/answer-generation`

**Commits (in order):**
1. `test(generator): add tests for answer generator (mocked claude, real prompt)` — stages `rag-service/tests/test_generator.py`
2. Run `pytest rag-service/tests/test_generator.py -v` — confirm tests fail for the right reason
3. `feat(generator): add system prompt with strict rules and few-shot examples` — stages `rag-service/app/generator/prompts.py`, `rag-service/app/generator/few_shots.py`
4. `feat(generator): add single-call claude generator with tool-use schema` — stages `rag-service/app/generator/generator.py`
5. `feat(api): wire POST /answer endpoint to generator` — stages `rag-service/app/api/answer.py`
6. End-to-end smoke test (one question, verify JSON shape with `answer`, `citations`, `self_score`, `metrics`).

**Push + PR:**
```bash
git push -u origin feature/answer-generation
gh pr create --fill
```

**After merge — tag `v0.3.0`:**
```bash
git checkout main && git pull
git tag -a v0.3.0 -m "v0.3.0 — answer generation live"
git push origin v0.3.0
```

---

## Plan 7 done ✅

Answer generation locked. Single-call Claude with tool-use for guaranteed schema. Few-shot from ISQ_01. SQL-Ball strict rules in system prompt. Source weighting at three layers (retrieval, prompt, self-score). Citation verification with hallucination penalty. Edge cases mapped. Test plan written first. Manual Coding Exercise 6 follows the TDD-with-branching pattern.

**Tom's reaction needed before Plan 8:**

1. System prompt (Section 3) — happy with the strict rules and self-score definitions, or anything to tune?
2. Few-shot examples (Section 3) — happy with the 2 examples (one easy, one scope-mismatch), or want more / different ones?
3. Source weighting at three layers — agreed, or too much / not enough?
4. Citation hallucination penalty (-0.2 on cites_policy) — too gentle, right, too harsh?
5. Plan 8 outline — happy?

Say "go" if happy and I'll write Plan 8.
