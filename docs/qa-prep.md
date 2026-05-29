# Q&A prep

Likely questions and how I'll answer them. Short answers, then stop. If they want more they'll
ask. Numbers are from real runs on 2026-05-29.

---

**"Why two tiers instead of doing it all in n8n?"**

> "Two reasons. First, I'd already built a proper RAG core in an earlier project, query
> rewriting, retrieval, the lot. Rebuilding that inside n8n's code nodes would've been worse
> than what I already had. Second, the brief said 'not entirely code-based.' Two tiers honours
> that: n8n is properly the orchestrator, and the code earns its place doing the part n8n can't
> do well. n8n where it shines, Python where the expertise already lives."

---

**"Why a FastAPI endpoint for the whole questionnaire instead of looping in n8n?"**

> "The loop, the per-question failure handling, the confidence roll-up and the summary all live
> together in one place, with tests around them. Spreading that across n8n nodes would've been
> harder to test and harder to reason about. The endpoint returns one clean envelope that
> everything downstream consumes. n8n still owns the orchestration around it; it just calls one
> well-defined thing instead of doing the bookkeeping itself."

---

**"Why a separate /render endpoint?"**

> "n8n runs in its own container and can't import the Python renderers directly. So the service
> exposes a render endpoint: hand it the results envelope and a format, it hands back the file.
> Keeps the rendering logic in one tested place, and the skill and n8n both go through the same
> path."

---

**"What does the packaged skill add over the docker stack?"**

> "It's the same engine with a different front door. The docker stack is the full two-tier
> system with n8n. The skill is for when you're already in a Claude Code chat and just want to
> say 'process this questionnaire' without leaving the editor. Same backend, same honest
> flagging. It's the workflow I actually use day to day, so I packaged it."

---

**"Why Voyage instead of OpenAI embeddings?"**

> "I'm invested in the Anthropic ecosystem, and Voyage is the aligned choice there. The quality
> difference against OpenAI's small embedding model is marginal for a corpus this size, both are
> 1024 dimensions, so it's about staying in one ecosystem rather than a performance gap."

---

**"What happens if Claude is down?"**

> "It fails per-question, not per-run. Each question is isolated. If one fails after retries,
> it comes back with null confidence and a 'needs review' flag, and the rest of the
> questionnaire still completes. Partial completion is a design decision, not a bug. There's a
> run-level banner if every question fails, so you can tell 'one wobble' from 'the whole thing's
> down.'"

---

**"How do you stop it inventing citations?"**

> "Two layers. The system prompt is strict: use only the chunks you're given. And every citation
> it claims is checked against the chunks we actually sent it. If it cites something we didn't
> provide, that's caught and the grounding score drops. Rare, but caught when it happens."

---

**"How did you pick the confidence weights?"**

> "Grounding is weighted heaviest, because for an audit tool an ungrounded answer is the worst
> kind of failure. Completeness is lightest, because a partial-but-correct answer is recoverable
> and a complete-but-wrong one isn't. The exact numbers are in the code with the reasoning next
> to them, so anyone can audit them. I'd treat them as a first version and tune against more real
> data."

---

**"What does it cost to run?"**

> "About 18 pence for the 20-question Sunflowers run. Embedding cost is tiny; the Claude
> generation is the bulk. And it's not an estimate, the cost is in the metadata of every run.
> Each question is its own call, so cost scales with size, which is why a question cap is on my
> next-steps list."

---

**"How long does a run take?"**

> "About two minutes for 20 questions, because it answers one at a time and each answer is its
> own grounded call. I'd rather be honest about that than quote a number I can't hit. The
> questions parallelise cleanly, so that's the first speed-up I'd make, it'd bring it down to
> seconds."

---

**"How would you scale it for, say, 100 questionnaires a day?"**

> "Two changes. The service is stateless, so I can scale it horizontally, more workers behind the
> same endpoint. And I'd move from synchronous to a queue and worker pattern for batches, which
> n8n supports natively. Plus the per-question parallelism. None of it needs a rewrite, the
> shape's already right for it."

---

**"Why TDD?"**

> "Two reasons. The honest one: a test suite is how whoever inherits this in six months knows
> what each part is meant to do. And the practical one: you can run the tests yourself and see
> them pass. Every module had its tests written before the code. It also caught real things, the
> render endpoint had a temp-file leak that a test pinned down before it ever shipped, and the
> skill had a timeout that a real run exposed."

---

**"What's the biggest weakness?"**

> "Two honest ones. The prompt and the few-shot examples are a first version; with more cycles
> against real questionnaires I'd tune both a lot. And it's a local two-tier system with no auth
> between the tiers, fine for a demo behind n8n but I'd add an internal key or network isolation
> before it went near production. I've written both up rather than hide them."

---

**"Could this be a product?"**

> "Yes, and that's part of why I scoped it the way I did. The pattern, knowledge-grounded
> generation with honest confidence and multi-format output, works for any vendor-questionnaire
> workflow. Plenty of SaaS companies drown in supplier security questionnaires. To productise it
> I'd add multi-tenant isolation, a self-service way to upload your own policies, and Slack or
> Notion integration."

---

## Questions I'll ask them back

- "What does your current questionnaire process actually look like day to day? Who fills them in
  now?"
- "What's a typical questionnaire size for you, ten questions or a hundred?"
- "Where would something like this sit, internal tooling, or something you'd put in front of
  customers?"
