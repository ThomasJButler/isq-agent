# Unplanned fixes: the work in the shadows

The plan covered the features. This is everything that wasn't in the plan but had to be fixed
anyway, because it surfaced once the thing was wired up and run for real, or because a review
caught it. It's the work no one sees in a demo, and it's most of why "polishing" takes longer
than "building": you can't hand over something part-baked when it needs to be fast, honest,
secure and private.

Each entry: what it was, how it surfaced, the fix, and why it mattered.

## Surfaced by running it for real (end-to-end testing)

These only show up when the frontend and backend are wired together and you put real documents
through. Unit tests pass; the system still misbehaves.

1. **"10 answers, not 20" was the example data, not the pipeline.**
   *How:* uploading the samples returned fewer answers than expected. *Diagnosis:* the extraction
   pipeline was fine — `pypdf` pulled all 20 questions. The frontend's canned example
   questionnaires were fabricated and truncated (10/7/5 questions) versus the real 20/20/10. A
   second tool (`pdftotext`) had falsely suggested "only 7 questions" — a reminder to verify with
   the library the app actually uses. *Fix:* replaced the examples with three of our own 20-question
   fictional companies. *Why it mattered:* the headline behaviour looked broken when it wasn't, and
   the fix improved the demo (three realistic suppliers instead of fabricated stubs).

2. **A 20-question run took ~4 minutes, and the logs were ~100 lines of Pinecone noise.**
   *How:* live testing the three samples. *Diagnosis:* every question rebuilt the Pinecone/Voyage
   clients (re-running the SDK's plugin discovery), the questions were answered serially, and the
   query-rewrite step ran on the heavy Sonnet model. *Fix:* shared client singletons + pre-warm,
   bounded concurrency, and query-rewrite on Haiku. **~4 min → ~40s** wall-clock, zero log noise.
   Full write-up in [`performance-optimisation.md`](performance-optimisation.md). *Why it mattered:*
   a 4-minute wait is a bad demo and a bad product; the fix is hardware-independent and carries to
   the hosted deploy.

3. **The model picker was cosmetic.**
   *How:* found while wiring the perf work — the Settings picker never told the backend which model
   to use, so every run (including all the slow ones) silently used the default Sonnet 4.5. *Fix:*
   thread the picked model end to end, validated against an allowlist. *Why it mattered:* honesty —
   a control that does nothing is a lie in an app whose whole point is "grounded, not generative."

4. **Query rewriting ran on the wrong model.**
   *How:* reading the code during the perf work — the Settings UI said "query rewriting always uses
   Haiku," but the code used the generation model (Sonnet). *Fix:* move it to Haiku via config.
   *Why it mattered:* code now matches the promise, and it's a big per-question latency + cost win.

5. **The duration display lied once answering went parallel.**
   *How:* the perf fix dropped the real time to ~40s, but the results screen still showed "2m 4s."
   *Diagnosis:* the duration was the *sum* of per-question latencies, which equalled wall-clock when
   serial but overstated it once questions overlapped. *Fix:* report true wall-clock (`time.monotonic`
   around the loop); the per-question latencies stay in each answer's metrics. *Why it mattered:* the
   speed-up has to be *visible* and *honest* — and it's a subtle bug that only a parallel change exposes.

## Caught in code review (every PR, adversarial)

Every PR was reviewed by independent agents for bugs, CLAUDE.md adherence, and — added mid-project
— compliance with the challenge brief. These are the real findings.

6. **The upload-size guard ran too late to stop an OOM.**
   *Diagnosis:* Starlette's multipart parser buffers an uploaded file part to an uncapped temporary
   file *before* the route handler runs, so the in-handler size check was useless — a multi-GB upload
   could fill the disk first. *Fix:* enforce the cap at the ASGI layer (`MaxBodySizeMiddleware`), on
   the raw stream, before parsing. *Why it mattered:* a real denial-of-service / cost vector on a
   small hosted instance, invisible to functional testing.

7. **Raw parser errors leaked to the client.**
   *Diagnosis:* the upload endpoint's 422 interpolated the raw `pypdf`/`docx` exception text into the
   response. *Fix:* a generic client message, full detail logged server-side. *Why it mattered:*
   information disclosure on a public endpoint.

8. **Blocking work on the async event loop.**
   *Diagnosis:* the upload route was `async` but called the blocking PDF parse + LLM loop directly,
   freezing every concurrent request. *Fix:* offload via `asyncio.to_thread`. *Why it mattered:* one
   upload would stall the whole service.

9. **The 413 had to keep its CORS headers.**
   *Detail:* the body-size middleware is registered *before* CORS so the rejection still carries CORS
   headers — otherwise the browser can't read the error and shows a confusing "failed to fetch."

10. **A first-request race on the new singletons.**
    *Diagnosis:* under the new concurrency, the lazy client singletons could be constructed a few
    times on the very first request. *Fix:* a best-effort startup pre-warm. *Why it mattered:* makes
    the zero-log-noise guarantee robust, not just usually-true.

## Caught by CI / hygiene, and one non-bug

11. **A version bump broke the smoke test.** Bumping the service to 1.2.0 left the root smoke test
    asserting the old version — CI caught it, fixed in the same PR.

12. **A transitive dependency CVE.** Dependabot flagged `postcss < 8.5.10` (pulled in by Next.js);
    forced the patched line via an npm `override`.

13. **Em dashes, repeatedly.** Tom's voice bans em dashes in user-facing copy; review caught them in
    several PRs (error messages, the n8n form copy, docs). Small, but it's the standard.

14. **The "405 Method Not Allowed" was NOT a bug.** A reported Anthropic error turned out to be what
    `api.anthropic.com/v1/messages` returns for a **GET** (it's POST-only) — a browser/manual probe,
    not the app, whose real calls are all `POST → 200`. *Why it's here:* knowing what *isn't* a bug,
    and being able to prove it from the logs, is part of the job too.

## The pattern

Most of these share a shape: **work that's correct in isolation misbehaves once it's integrated,
run at scale, or exposed to the public.** Unit tests don't catch a 4-minute wall-clock, a cosmetic
control, a pre-parse buffering DoS, or a duration that only lies under concurrency. Running it for
real and reviewing every change does. That's the difference between a thing that demos and a thing
that works.
