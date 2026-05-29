# Build notes

The engineering-process story behind the ISQ Agent: how it was built, what it reuses, the
tooling, and the issues I hit and fixed along the way. This is the "approach and thought
process" half of the brief, written down. The walkthrough covers the highlights out loud; this
is the fuller record.

---

## Built from the standout features of my other projects

I didn't start this from a blank page. The ISQ Agent is a synthesis of patterns I'd already
proven in my own work, applied to a new domain:

- **Knowledge-grounded generation with a voice constraint and multi-format output** is the
  meta-pattern from my job-search product. That's the same shape: a knowledge base, a generation
  step that has to stay in a defined voice, and output in several formats. The CV RiverAI saw on
  Monday came out of that system. The ISQ Agent applies the same shape to security
  questionnaires.
- **A single-call, multi-field analysis** comes from my news-analysis project: one model call
  returns the answer, its citations, its confidence and a review reason together, instead of
  chaining four separate calls. Cheaper, faster, and the fields stay consistent with each other.
- **Multi-dimension confidence scoring** comes from my code-review tool, which scored code across
  several independent dimensions and aggregated them. Here it's four dimensions on every answer
  (grounding, on-topic, vendor tone, completeness), aggregated into one score.
- **Strict-rules-in-the-system-prompt grounding** comes from my SQL project: numbered, explicit
  rules in the prompt that force the model to stay grounded ("use only the chunks provided,
  never invent").
- **The retrieval core** (chunking, query rewriting, the vector-store wrapper) is adapted from
  my production RAG project. Rebuilding that from scratch inside n8n would've been lower quality
  than what I already had, which is exactly why the architecture is two-tier.
- **Judgement about when not to embed** comes from an earlier project where I deliberately used
  structured grounding for structured data and reserved embeddings for unstructured prose. That
  informed using embeddings for the policy documents but not for the questionnaire structure
  itself.

The full file-level attribution lives in `docs/attributions.md`.

---

## How it was built: design first, code later

This was the first time I ran a full design-first workflow end to end. I went wireframes ->
designs -> plans, and didn't touch code for a long stretch. The `plans/` folder is that process,
eleven planning iterations written before a line of implementation. Each plan locked decisions,
defined the service contract, and laid out the tests before the code existed.

That discipline paid off in the build: because the contract and the test cases were already
written down, the implementation was tighter and easier to walk through. It's the opposite of
the usual "write code first, explain after." I explained first, so the code had less to argue
with.

---

## The dev harness and tooling

- **TDD throughout.** Every module had its tests written first, watched fail, then implemented.
  Tests and implementation committed as separate concerns where the pre-commit hook allowed it.
  The full suite runs in pre-commit and in CI.
- **A narrated build loop ("Ralph").** I drove the test-first slices through an autonomous loop
  that reads the implementation checklist, runs one TDD slice at a time, and narrates what it's
  doing. For the module-building plans this kept the rhythm consistent: red, green, commit, next.
- **Git worktrees for parallel work.** The backend and the frontend dashboard were built in two
  separate worktrees on two branches at once, so the dashboard build could run in its own loop
  without touching the backend's working tree. Same repo, two checkouts, no collisions.
- **Claude-native runtime.** Question extraction and answer generation both use Anthropic's
  tool-use API for guaranteed structured output. The whole thing is also packaged as an
  installable Claude Code skill, so the same engine runs from inside a Claude Code chat, not just
  the docker stack.
- **GitHub Flow with squash-merged PRs**, Conventional Commits, pre-commit hooks, and GitHub
  Actions CI. Every change went through a PR and a review before it hit main.

---

## Issues I hit, and how I dealt with them

Honest engineering means writing down what went wrong, not just what worked.

- **The renderers were in-process only.** When I decided the demo should run through n8n, I hit a
  real dependency: n8n runs in its own container and can't import the Python renderers the way
  the packaged skill does. So I built a `/render` HTTP endpoint that takes the results envelope
  and a format and returns the file. That unblocked n8n and is reusable beyond it.
- **XLSX rendering needed the original workbook.** The overlay renderer was written to drop
  answers into the source spreadsheet, but PDF inputs have no source workbook. I added a
  standalone mode so a PDF run still produces a real XLSX, and kept the overlay path for XLSX
  inputs.
- **A temp-directory leak in the render endpoint.** A code review caught that the endpoint
  created a temp dir per request and never cleaned it up, because the file response streams after
  the handler returns. I fixed it with a background cleanup task and pinned it with a regression
  test, test-first.
- **The skill's client timeout was too tight.** A real 20-question run failed at about 128
  seconds with a read-timeout, even though the server was still working fine, the logs showed a
  steady stream of successful Claude calls, one per question at about six seconds each. The
  client's hard-coded 120-second timeout was simply too low for a full questionnaire. I raised
  the default and made it configurable, again test-first. This also told me the n8n HTTP node
  needs a generous timeout.
- **The pre-commit hook versus separate test/impl commits.** The hook runs the whole suite and
  stashes unstaged changes, so a tests-only commit can't pass while the implementation is
  stashed. Rather than use `--no-verify` (which the project bans), I let tests and implementation
  share a commit where needed; the squash-merge collapses it to one commit on main anyway.

None of these were dramatic, and that's the point: a design-first build surfaces the
integration questions early, so what's left are small, fixable seams rather than architectural
surprises.

---

## Real numbers (captured 2026-05-29)

| Questionnaire | Format | Questions | Flagged | Cost | Time | Avg confidence |
|---|---|---|---|---|---|---|
| Sunflowers Charity | PDF | 20 | 1 | $0.18 | ~2 min | 0.92 |
| Blackridge Wind Energy | PDF | 20 | 11 | $0.14 | ~99s | 0.76 |
| Simple Salvage | XLSX | 10 | 0 | $0.08 | ~50s | 0.91 |

Blackridge's high flag count is the system being honest: it's the wrong-shaped questionnaire for
a software-only company (lots of operational-technology questions Northstar can't answer from
its policies), and it flags the mismatch rather than bluffing.
