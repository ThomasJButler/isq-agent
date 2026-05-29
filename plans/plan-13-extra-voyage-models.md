# Plan 13 — Extra Voyage embedding models (retrieval-quality spike)

**Status:** Plan 13. Post-submission. A weekend task to make the retrieval the best it can be.
Do NOT start this before the RiverAI submission is in. `voyage-3-large` stays the default; this
plan only adds documented, opt-in alternatives and an honest A/B so any switch is evidence-based.

**Owner:** Tom Butler
**Prior plans:** 1-12.

---

## 0. Why this exists

The free Voyage account exposes a stack of embedding + rerank models well beyond the
`voyage-3-large` the project runs on today (`voyage-context-3`, `voyage-3.5`, `voyage-4`,
`rerank-2.5`, domain models, etc.), each with a generous free token quota. Retrieval is the
one place the system visibly strains: on the Blackridge run, several questions came back
"no source matched above the relevance threshold" and got flagged. Better embeddings (or a
rerank stage) could lift exactly those. This plan is the controlled experiment to find out,
not a blind swap.

The point is options, not a rewrite. `voyage-3-large` works and stays the default. By the end
of this plan the model is cleanly selectable, the cost reporting is honest whichever model
runs, and there's a written A/B result saying whether anything actually beats the default on
this corpus.

---

## 1. What's already in place (reuse, don't rebuild)

- **Model is one setting.** `rag-service/app/core/config.py` -> `voyage_model: str = "voyage-3-large"`,
  read by `VoyageClient.__init__(model=None)` (`rag-service/app/voyage/client.py`), which falls
  back to `settings.voyage_model`. Both the indexing pipeline (`POST /index`) and the retriever
  (`POST /answer`) go through `VoyageClient`, so one setting changes both. Switching model is
  already a one-line `.env` change in principle.
- **The Claude-side precedent.** Plan-12-era PR #25 made Claude token cost model-aware via
  `rag-service/app/core/pricing.py` (`rates_for(model)`, default fallback). This plan mirrors
  that pattern on the Voyage side.

## 2. The known gotchas (the real work is here, not the swap)

1. **Re-index is mandatory on any embedding-model change.** Pinecone stores vectors from one
   model; querying with a different model's vectors is meaningless. Every model swap needs a
   full `POST /index` rebuild (`{"force_reindex": true}`) before it's tested. Billable, but
   inside the free quota.
2. **Dimension match.** The Pinecone index is **1024 dims, cosine, serverless** (per CLAUDE.md /
   `plan-04`). `voyage-3-large` is 1024. Any candidate model that outputs a different dimension
   (some Voyage models support 256/512/1024/2048) needs either an output-dimension setting that
   matches 1024, or a **new index** at the right dimension. Confirm each candidate's dims before
   testing; never point a mismatched model at the existing index.
3. **Hardcoded Voyage cost.** `rag-service/app/voyage/client.py` has
   `VOYAGE_COST_PER_MTOK = 0.18` (voyage-3-large list pricing). This is the same model-pinned
   cost bug that PR #25 fixed for Claude: switch embedding model and the reported embedding cost
   is silently wrong. Make it model-aware too (see §4 step 2).
4. **`input_type` stays correct.** `VoyageClient.embed` passes `input_type` ("document" for
   indexing, "query" for retrieval). Keep that per-model; `voyage-context-3` and the contextual
   models in particular care about it.

## 3. Candidate models (what to actually try, and what to skip)

Worth testing on this corpus (policy prose + historical ISQs):
- **`voyage-context-3`** — contextualized embeddings (chunk embedded with document awareness).
  Directly targets the Blackridge "no source matched" misses. **Primary candidate.**
- **`voyage-3.5` / `voyage-4` / `voyage-4-large`** — newer general-purpose; fair baselines to
  compare against `voyage-3-large`. Check dims (some default to non-1024).
- **`rerank-2.5`** (separate lever, high value) — a reranker re-scores the retriever's top-k
  after retrieval. Already on the "what I'd do with more time" list. Doesn't need a re-index
  (it operates on retrieved chunks), so it's the cheapest quality win to trial.

Skip for this domain:
- `voyage-finance-2` / `voyage-law-2` — security/compliance isn't quite either; general models
  likely match or beat them here.
- `voyage-code-*` — for code, not policy prose.
- `voyage-multimodal-*` — only if embedding images/scanned PDFs; we extract text first.

## 4. Approach (branch `spike/voyage-models`, run post-submission)

1. **Confirm dims per candidate** (read-only, no spend): check each candidate model's output
   dimension against the index's 1024. Record which need an output-dim setting or a separate
   index. Decide the safe test matrix from that.
2. **Make Voyage cost model-aware** (TDD, mirrors `app/core/pricing.py`): replace the hardcoded
   `VOYAGE_COST_PER_MTOK = 0.18` with a small per-model rate lookup (a Voyage equivalent of
   `rates_for`, or fold Voyage rates into a shared pricing module). Default `voyage-3-large`
   keeps 0.18 so existing behaviour/tests are unchanged. Test-first.
3. **A/B harness** (lives under `eval/`, the existing eval dir): for each candidate that passes
   the dim check, re-index the corpus, run the three sample ISQs (Sunflowers, Blackridge,
   Simple Salvage) through `/process-questionnaire`, and capture per-run: flagged count,
   average confidence, and the specific questions that move from flagged to answered (or vice
   versa). `voyage-3-large` is the baseline row. The metric that matters: does a candidate
   recover the Blackridge "no source matched" misses without hurting Sunflowers/Salvage?
4. **Rerank trial** (separate, no re-index): add an optional `rerank-2.5` pass after retrieval
   in the retriever, behind a setting (default off). Compare top-k quality on the same three
   ISQs. This is the lever most likely to help and the cheapest to try.
5. **Decide + document.** Write the result to `docs/` (or `eval/results/`): a short table of
   each model's flagged/confidence numbers vs the default, and a one-line verdict. If something
   genuinely beats `voyage-3-large` on this corpus, switching is then a documented `.env`
   change + a re-index, not a guess. If nothing beats it, that's a finding too: "I benchmarked
   voyage-context-3 and rerank-2.5 against voyage-3-large; here's why I kept the default."

## 5. Guardrails

- **Default unchanged:** `voyage_model` stays `voyage-3-large` in `config.py` and `.env.example`.
  Alternatives are documented options, selected per-experiment, never silently made default.
- **TDD on any code** (the cost-lookup, the optional rerank pass): test-first, watch fail,
  implement, commit test + impl as the pre-commit hook allows. No `--no-verify`.
- **Never query a mismatched-dim model against the live index.** Re-index first, every time.
- **Billable but free-tier:** the re-indexes + A/B runs sit inside the Voyage free quota and a
  few cents of Claude for the `/process-questionnaire` runs. Tom's call to run; this plan only
  prepares it.

## 6. Definition of done

- Voyage cost is model-aware (no silent wrong embedding cost on a model switch).
- A documented A/B of `voyage-context-3` (+ any other dim-compatible candidate) and a
  `rerank-2.5` trial against the `voyage-3-large` baseline, with real flagged/confidence numbers
  from the three sample ISQs.
- A written verdict: keep `voyage-3-large`, or switch with the evidence to back it.
- `voyage-3-large` remains the default either way; alternatives documented in `.env.example`.

---

**Not before submission.** This is the weekend "make it the best version" pass, not a v1.0.0
blocker. Plan 11 (consolidation + submission) ships first.
