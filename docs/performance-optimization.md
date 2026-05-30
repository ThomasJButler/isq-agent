# Performance optimisation: a 20-question ISQ from ~4 minutes to ~40 seconds

A worked example of profiling a live AI workflow, finding the real bottlenecks, and fixing
them with a small, targeted change. The whole optimisation is under ~500 lines of diff.

## The symptom

Running the three sample questionnaires end to end on the hosted deploy, a 20-question ISQ
took **~3–4 minutes**, and the service logs were dominated by ~100 repeated lines per run:

```
pinecone_plugin_interface ... Discovering subpackages ...
pinecone_plugin_interface ... Installing plugin inference into Pinecone
```

Slow runs hurt the demo, and the log noise made real signal hard to find.

## The diagnosis

Reading the run logs alongside a trace of the answering pipeline turned up three causes —
all sharing a root: **work that should happen once was happening once per question.**

1. **Clients rebuilt per question.** Each question constructed a new `Retriever`, which built
   a fresh `PineconeClient`, `VoyageClient` and `QueryRewriter`; answer generation built a
   fresh `AnswerGenerator`. Constructing a `PineconeClient` runs the Pinecone SDK's plugin
   discovery and an index-list round-trip — cheap once, but a 20-question run paid it ~40
   times (the log spam) plus the client setup each time.
2. **Questions answered sequentially.** The per-question loop was a plain list comprehension:
   each question waited for the previous one to finish. At ~10s per question (LLM-bound),
   that's ~200s on its own.
3. **Query rewriting ran on the heavy model.** The retrieval query-rewrite step — a cheap
   keyword expansion — was using the same Sonnet model as answer generation (~5s) instead of
   fast Haiku (~1s), wasting ~4s on every question.

### What were those Pinecone log lines?

The `Discovering subpackages` / `Installing plugin inference` messages are the Pinecone
Python SDK booting its **plugin system**. When you construct a Pinecone client, the SDK scans
the installed `pinecone_plugins` namespace and registers the `inference` plugin. That is meant
to happen **once per process**. Because the service built a brand-new Pinecone client for
every question, it re-ran that whole discovery roughly twice per question, so a 20-question run
produced ~40–100 of those lines and paid the discovery + client-setup cost each time. The lines
were harmless in themselves, but they were the smoking gun: a client was being rebuilt on a hot
path that should have reused a single shared one. Fixing the re-instantiation made the lines
vanish *and* removed the repeated setup cost.

The bottleneck was almost entirely **waiting on the Anthropic/Voyage/Pinecone APIs**
(network-bound), not local CPU — which is exactly what makes it parallelisable.

## The fix

| Change | Effect |
|---|---|
| **Shared client singletons** (`get_pinecone_client`, `get_voyage_client`) | Pinecone plugin discovery + client setup happen **once per process**, not per question. Kills the log noise and the repeated setup cost. |
| **Pre-warm the singletons at startup** | Build the shared clients once, single-threaded, in the app lifespan, so the first (now concurrent) request doesn't race to construct them and re-run discovery. Robustly zero plugin-discovery on requests, and a faster first request. Best-effort: falls back to lazy init if a dependency is unreachable at boot, so it never blocks startup. |
| **Concurrent answering** — bounded `ThreadPoolExecutor` (default 5) over the per-question work, order preserved | ~5 questions wait on the LLM at once instead of one. The dominant win. Each `_answer_one` already isolated its own failures, so a flaky question never breaks the pool. |
| **Query rewriting on Haiku** (`anthropic_query_rewrite_model`) | ~5s → ~1s per question, and it aligns the code with what the UI always promised. |
| **Quieten third-party loggers** (`pinecone_plugin_interface`, `httpx` → WARNING) | Belt-and-braces on the noise; app logs stay at INFO. |
| **Honest duration** — report wall-clock answering time, not the sum of per-question latencies | Once questions run in parallel, summing latencies overstates the wait. The results screen now shows the real elapsed time, so the speed-up is visible rather than hidden. |

It also threads the dashboard's picked model through to generation, validated against an
allowlist. Until this change the model picker was **cosmetic**: the frontend never told the
backend which model to use, so every run, including all the slow ones above, used the
default **Sonnet 4.5**. That makes the before/after a clean like-for-like comparison (both
Sonnet 4.5). The picker is now wired end to end, and the same questionnaire was re-run across
all five selectable models (Haiku 4.5, Sonnet 4.5/4.6, Opus 4.7/4.8) to confirm each works
and the cost scales by tier.

## The result (measured, 20-question Caldera Health run, Sonnet 4.5, local)

| Metric | Before | After |
|---|---|---|
| **Wall-clock time** | ~3–4 min | **~40s** (measured 40.3s; matched an external `curl` timing of 40.33s) |
| **Pinecone "discovering plugins" log lines** | ~100 | **0** |
| **Per-question compute (sum of latencies)** | ~124s | ~124s (unchanged — the work didn't shrink, it overlapped) |
| **Answer quality** | grounded, honestly flagged | unchanged — same retrieval, same prompts, same honesty |

The compute total is deliberately unchanged: the optimisation didn't make the model faster,
it stopped the service from *waiting* in series. Correctness, grounding and the confidence
flagging are untouched — verified by the full test suite and by re-running all three sample
questionnaires across all five selectable models.

**Being precise about the headline number.** The ~4 min was first hit on the hosted Render
starter tier; the ~40s was measured on a faster local backend, so part of the absolute gap is
hardware. The honest framing:

- **~6× end to end** as experienced (240s → 40s).
- **~5× like-for-like (same hardware).** The dominant fix — overlapping the LLM waits and
  moving query rewrite to Haiku — is network-bound, not CPU-bound, so it carries across
  machines: a sequential ~200s answering loop becomes ~40s.
- **Estimated ~1 min on the live Render iteration** (a ~4× cut there), since the per-call API
  latency dominates and Render's slower CPU barely touches network-bound waiting.

Either way it's a near-order-of-magnitude win, and the structural cause (not the hardware) is
what makes it real.

## What it cost in code

~500 lines of diff across the client wrappers, the retriever, the query rewriter, the
config, and the per-question assembler — plus tests for the singletons, the model allowlist,
and the wall-clock duration. No new dependencies. The change is small because the bottleneck
was structural (per-question re-work + serial waiting), not algorithmic.

## Trade-offs and follow-ups

- **Prompt cache on the first concurrent batch.** The answer prompt's static system block is
  cached; with 5 questions starting at once, the first few each write the cache instead of
  one writing and the rest reading. A small one-off cost for a large latency win.
- **Concurrency is bounded** (`answer_concurrency`, default 5) so a large questionnaire can't
  fan out unchecked against the Anthropic workspace rate limits. It's env-tunable.
- **Cost-display token accounting** under concurrency uses a non-atomic counter for Voyage
  tokens; it's for display only, not billing, so a tiny race is acceptable.
- **Further wins given more time (target: ~10s).** The next round would chase a sub-10s run:
  raise concurrency toward the questionnaire size (with proper rate-limit backoff), batch the
  per-question retrieval embeds into a single Voyage call, stream per-question progress to the
  UI so the showcase reflects real state, and add a reranker so fewer-but-better chunks keep
  the answer prompts short. The point of diminishing returns is real, though: most of the
  remaining time is the model thinking, which a workflow can overlap but not remove.
