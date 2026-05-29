# Plan 12 — Frontend Dashboard (Ralph-loop build, parallel via git worktree)

**Status:** Plan 12. The stretch deliverable. A Next.js dashboard for the locked "Claude × RiverAI Hybrid" design, built **headless via the Ralph loop in a git worktree**, in parallel with the backend, then glued to the live service.

**Owner:** Tom Butler
**Date:** 2026-05-29
**Prior plans:** Plans 1–9.5 (backend) ✅ · Plan 10 (demo) · Plan 11 (consolidation). Design locked in `plans/design-decision-locked.md` (Iteration 3). De-risked by the frontend audit (2026-05-29): the data-contract mismatch and the 6 locked tweaks were found ahead of the build, so this runs against a known target.

---

## 0. What this plan is (and the safety model)

The frontend is a **separate working tree on its own branch** (`feature/frontend-nextjs`), built by the Ralph loop while the backend work continues in the main checkout. Two worktrees, two branches, one shared `.git` — **no working-tree collision** because git refuses to check out the same branch in two places, and each worktree keeps its own copy of every tracked file.

**The one rule that keeps it safe:** never run `git checkout main` (or any backend branch) inside the frontend worktree, and never run the loop against `main`. The frontend worktree stays on `feature/frontend-nextjs` start to finish.

**Build-against-mock, glue-later.** The loop builds the whole UI against the prototype's mock data shape + a tested adapter, so it needs **no live backend** during the build. Wiring the adapter to the real `/process-questionnaire` is the final "glue" step (§8), done deliberately after the UI is green — that's the "extra tweak or two at the end" and nothing more.

**Scope:** the five screens of the locked design (Landing, Upload, Processing, Results, Settings), the component library, the data adapter, and the 6 must-do tweaks. Not in scope for the loop: backend changes (run_id, a `/runs` store) — those are the glue step, done in the backend chat.

---

## 1. Tech stack (from `plans/claude-design-spec.md`)

- **Next.js 14+ (App Router), TypeScript.**
- **Tailwind CSS** + **shadcn/ui** primitives.
- **Fonts via `next/font`:** Geist (UI), Geist Mono (labels/citations/JSON), Source Serif 4 (answer body only).
- **Tests:** Vitest + React Testing Library (`@testing-library/react`, `jsdom`). Pure logic (adapter, formatters, validation) is TDD-first; components get a render+behaviour smoke test.
- **Lint/format:** the Next.js ESLint config + Prettier (or Biome if you prefer one tool — pick in slice 1 and stick to it).
- **State:** hooks/`useState` only. No Redux.
- **No auth.** Desktop-primary, responsive to 375px.

---

## 2. Worktree + Ralph-loop setup (exact commands)

Run these from the **main checkout** (`~/Repos/isq-agent`) once this plan + the frontend `IMPLEMENTATION_PLAN.md` (§7) are committed to `main`:

```bash
# 1. From the main checkout, create the frontend branch in a SEPARATE worktree dir
git -C ~/Repos/isq-agent worktree add -b feature/frontend-nextjs ../isq-agent-frontend main

# 2. In the worktree, swap IMPLEMENTATION_PLAN.md for the frontend checklist (§7 of this doc),
#    then commit it on the frontend branch (the loop reads IMPLEMENTATION_PLAN.md CWD-relative)
cd ../isq-agent-frontend
#    (replace IMPLEMENTATION_PLAN.md with §7's checklist, then:)
git add IMPLEMENTATION_PLAN.md && git commit -m "docs(frontend): set IMPLEMENTATION_PLAN to the frontend build checklist"

# 3. Run the loop headless (5 narrated TDD iterations; --dangerously-skip-permissions via the env flag)
RALPH_ALLOW_UNSAFE_PERMISSIONS=1 ./loop.sh build 5 coach
```

**How the loop consumes this** (verified against `loop.sh` + `PROMPT_build.md`): each iteration reads `IMPLEMENTATION_PLAN.md` (the §7 checklist), `RALPH.md` (safety/TDD rules), `CLAUDE.md`, the active `plans/plan-12-frontend-dashboard.md` slice spec, and `plans/git-conventions.md` — all **CWD-relative**, so in the worktree they're the worktree's copies. It finds the first `[ ]` item, does that slice TDD-first, validates, marks `[x]`, commits (explicit staging, no `git add .`, no `--no-verify`), and updates "Next recommended build slice". Logs land in `.claude-run/` (gitignored).

**Frontend conventions override (critical):** the root `CLAUDE.md` is Python/pytest-centric. Slice 1 creates **`frontend/CLAUDE.md`** with the frontend conventions below, and the §7 checklist header restates them, so every iteration sees: *the test command is `npm test` (Vitest) run in `frontend/`, NOT pytest; lint is `npm run lint`; build check is `npm run build`. Ignore the root CLAUDE.md's pytest/ruff/rag-service specifics for frontend slices — but the git discipline, no-Matrix rule, Tom's-voice rule, and no-Claude-footer rule still apply.*

---

## 3. `frontend/CLAUDE.md` content (slice 1 writes this)

```markdown
# CLAUDE.md — ISQ Agent frontend (Next.js dashboard)

This directory is the stretch dashboard. It is TypeScript/Next.js, separate from the
Python rag-service. The root CLAUDE.md's pytest/ruff/Pinecone guidance does NOT apply here.

## Commands (run from frontend/)
- Dev: `npm run dev`
- Test: `npm test` (Vitest; `npm test -- --watch` while iterating)
- Lint: `npm run lint`  ·  Build check: `npm run build`

## TDD
- Pure logic (adapter, formatters, validation) — test FIRST, watch fail, implement, green.
- Components — a render + key-behaviour test via React Testing Library.
- Commit test and implementation as separate commits where there is a separate test.

## Design system (LOCKED — see plans/design-decision-locked.md + design/.../prototype-hybrid/)
- Warm-paper aesthetic: bg #FAF9F5, surface #F0EEE5, text #191919, borders #E8E6DC.
- RiverAI blue #2A7BE2 for ALL interactive accents (links, focus rings, tabs, progress, the "Agent" wordmark).
- Black pill CTAs (#0A0A0A). All buttons/inputs/badges/tabs are full pills (radius 9999px).
- Semantic: success #4A7C59, warning/flag #C97A2B, danger #B5443A.
- Orange #CC785C ("Crail") appears in EXACTLY ONE place: the "Powered by Claude" footer badge. Anywhere else is a design leak — run the orange audit (§9) before finishing.
- Fonts: Geist (UI), Geist Mono (labels/citations/JSON), Source Serif 4 (answer body only, .t-serif).
- Motion ≤200ms, calm easing cubic-bezier(0.2,0.6,0.2,1); honour prefers-reduced-motion.
- Focus rings: 2px river-blue, never `outline:none` without a replacement. Contrast ≥ WCAG AA.

## Rules that still apply from the root project
- Tom's voice for ALL user-facing copy: direct, Northern, contractions, confident-not-cocky. Banned: "genuinely", "leverage", "cutting-edge", em dashes. Prefer "properly", "I'm after".
- ZERO Matrix theming anywhere.
- No "Generated with Claude Code" footer on any commit/PR.
- Git: short-lived work on feature/frontend-nextjs; explicit staging; no `git add .`; no `--no-verify`; no auto-push/tag; NEVER `git checkout main` in this worktree.

## The data contract
The UI is built against the mock shape in design/.../prototype-hybrid/data.js via a tested
adapter (lib/adapter.ts) that maps the BACKEND canonical envelope to the view model. The
backend shape is canonical; the adapter absorbs the mismatch. See plans/plan-12 §5.
```

---

## 4. Reference material (the loop reads these)

- **Design source (the source of truth for look + components):** `design/design_handoff_isq_agent/designs/prototype-hybrid/` — `tokens.css` + `claude-tokens.css` (every token + RiverAI override), `components.jsx` (TopBar, Button, Badge, ConfidenceBar, Card, Dropzone, Timeline, Tabs, Toast, Skeleton…), `pages.jsx` (the five screens), `icons.jsx`, `data.js` (the 20-answer mock), `app.jsx` (shell + client routing).
- **Hi-fi reference:** `design/design_handoff_isq_agent/designs/Hi-Fi Designs (Hybrid).html` and `Interactive Prototype (Hybrid).html`.
- **Locked decision + the 6 must-do tweaks:** `plans/design-decision-locked.md`.
- Port the prototype's CSS tokens into `app/globals.css` and translate the `.jsx` components to TSX + Tailwind/shadcn. The prototype is plain JSX/CSS — it is the spec, not code to copy wholesale.

---

## 5. The data adapter — the GLUE contract (build it TDD, slice 3)

The prototype's `data.js` and the backend's canonical envelope disagree. The backend shape is **canonical**; `lib/adapter.ts` absorbs the difference so the UI binds to one stable view model. Build it test-first against a fixture of the real backend envelope.

**Backend canonical envelope** (`POST /process-questionnaire`, from `rag-service/app/api/process.py`):
```
questionnaire_meta: { origin, filename, received_at, completed_at, total_questions }
answers[]: { question_id, question_text, answer, citations[{source_id, text_snippet}],
             confidence: { score, dimensions{cites_policy,on_topic,vendor_tone,complete},
                           needs_review, review_reason } | null,
             metrics{tokens_in,tokens_out,cost_usd,latency_ms} }
summary_metrics: { total_cost_usd, total_tokens, total_latency_ms,
                   questions_flagged_for_review, average_confidence,
                   flagged_question_indices, banner }
```

**Mapping the adapter must perform** (backend → view model the components consume):

| View model (mock `data.js`) | Backend canonical | Adapter rule |
|---|---|---|
| `meta` | `questionnaire_meta` | rename |
| `meta.run_id` | (absent) | synthesise client-side until the backend adds it (§8); fall back to `filename`+`completed_at` |
| `summary` | `summary_metrics` | rename |
| `summary.flagged_indices` | `flagged_question_indices` | rename |
| `summary.flagged_count` | `questions_flagged_for_review` | rename |
| `summary.total_tokens_in/out` | `total_tokens` (single) | backend pre-sums; view shows one figure (don't fabricate a split) |
| `answer.question` | `question_text` | rename |
| `answer.confidence.cites_policy` etc. | `confidence.dimensions.{…}` | **flatten** the nested `dimensions` for the bar's tooltip |
| `answer.needs_review` / `review_reason` | `confidence.needs_review` / `confidence.review_reason` | lift out of `confidence` |
| **failed question** | `confidence: null` | treat as flagged; show "generation failed", no score bar; exclude from averages |
| citations `{id, source, page}` | `{source_id, text_snippet}` | backend has chunk IDs + snippet, no page; render `source_id` + snippet (don't invent page numbers) |
| `top_citations`, `stages` | (not produced) | derive `top_citations` client-side from `answers[].citations`; OMIT the per-stage timeline (or show total latency only) until the backend emits stages |

**Tests (slice 3, FIRST):** map a fixture envelope → expected view model; assert every rename; a flagged answer surfaces `needs_review`+reason; a `confidence: null` answer is flagged with no score and excluded from `average_confidence`; `banner: "all_failed"` and `"all_flagged"` both surface a banner; an empty `answers: []` yields a coherent empty view model.

---

## 6. Build order (mirrors the design handoff)

Foundation → glue logic → primitives → screens → polish. Tokens + the adapter come early because everything depends on them; Settings is the first screen (simplest, exercises the primitives); Results is last (richest, consumes the adapter).

---

## 7. `IMPLEMENTATION_PLAN.md` for the frontend worktree (copy this into the worktree, commit on `feature/frontend-nextjs`)

```markdown
# IMPLEMENTATION_PLAN — ISQ Agent frontend dashboard

> FRONTEND build (Next.js/TS). Test command: `npm test` (Vitest) in `frontend/`, NOT pytest.
> Lint `npm run lint`; build check `npm run build`. Full spec: plans/plan-12-frontend-dashboard.md.
> Design source: design/design_handoff_isq_agent/designs/prototype-hybrid/. Conventions: frontend/CLAUDE.md.
> Git: feature/frontend-nextjs only; explicit staging; no auto-push/tag; NEVER checkout main here.

## Active phase
Phase A — Foundation.

## Ordered checklist

### Phase A — Foundation
- [ ] Slice 1 — Scaffold `frontend/`: `npx create-next-app@latest frontend --ts --tailwind --app --eslint --no-src-dir` (accept defaults), add Vitest + React Testing Library + jsdom + a `test` script, add Prettier, and write `frontend/CLAUDE.md` (plan-12 §3). Validate: `npm run build` and `npm test` (one trivial passing test) green. Commit scaffold + frontend/CLAUDE.md.
- [ ] Slice 2 — Design tokens + fonts: port `claude-tokens.css` + the hybrid overrides from `tokens.css` into `app/globals.css` as CSS variables; map them into the Tailwind theme; load Geist, Geist Mono, Source Serif 4 via `next/font`. Validate: build green + a smoke test asserting a token var resolves. Commit.

### Phase B — Glue logic (TDD-first)
- [ ] Slice 3 — `lib/types.ts` + `lib/adapter.ts`: `toRunViewModel(canonical)` per plan-12 §5. Tests FIRST (fixture → view model; renames; flagged; confidence=null; both banners; empty). Commit test, then impl.
- [ ] Slice 4 — `lib/format.ts`: `formatCurrency`, `formatDuration`, `formatConfidence`. Tests FIRST. Commit test, then impl.
- [ ] Slice 5 — `lib/validate.ts`: accept `.pdf`/`.xlsx`, reject others + >10MB, with messages. Tests FIRST. Commit test, then impl.

### Phase C — Primitives (render + behaviour tests)
- [ ] Slice 6 — `Wordmark` (sparkle on "Agent") + `TopBar` (nav + repo link).
- [ ] Slice 7 — `Button` (primary black pill / secondary / ghost / link) + `Badge` (default/success/warning/error/accent/claude).
- [ ] Slice 8 — `Card` (+ paper/lift variants) + `ConfidenceBar` (compact + expanded with 4-dim tooltip).
- [ ] Slice 9 — `Dropzone` (empty/dragging/selected/error states) + `Toast` + `Skeleton` + `Spinner`.
- [ ] Slice 10 — `Timeline` (5 steps, active pulse) + `Tabs` (blue underline) + `AnswerCard` (collapsible; flagged variant w/ amber border + review reason).
- [ ] Slice 11 — `Ribbon` (landing hero ONLY; never on inner pages).

### Phase D — Screens
- [ ] Slice 12 — `/settings` (API keys masked, model radio, confidence slider, reindex button, save bar).
- [ ] Slice 13 — `/` Landing (hero + ribbon + how-it-works + grounded-not-generative strip + footer w/ Powered-by-Claude badge).
- [ ] Slice 14 — `/upload` (dropzone + 3 example shortcuts + validation + helper strip).
- [ ] Slice 15 — `/runs/[id]` Processing (timeline + live counters + activity log; driven by a polling stub).
- [ ] Slice 16 — `/runs/[id]/results` Results (summary + 3 download buttons + mini stats + flagged card + Answers/Flagged/Citations/Metrics tabs + answer cards). Binds to `toRunViewModel(mockEnvelope)`.

### Phase E — Polish
- [ ] Slice 17 — The 6 must-do tweaks (plan-12 §9): sparkle clip-path→inline SVG; ribbon stress-test at 1440/1280/1024/768/375 (remove if it reads as a blob); press-scale 0.985→0.99; orange-leakage audit; Source Serif 4 on answer body; visible light/dark toggle + finish dark theme.
- [ ] Slice 18 — Responsive pass (375/768/1024/1440) + a11y (focus rings, prefers-reduced-motion, contrast, keyboard nav) + loading skeletons + the failed-question / all_failed states.

## Notes / discoveries
(loop appends blockers + decisions here)

## Next recommended build slice
Slice 1 — scaffold.
```

---

## 8. Glue plan (after the UI is green — done in the BACKEND chat, not the loop)

The build needs none of this; it's the deliberate end-step.

1. **Backend `run_id` + persistence:** add `run_id` to the `/process-questionnaire` response and store each run (a JSON file under a runs dir is enough for v1), plus `GET /runs/{id}` returning the stored canonical envelope. (Noted as missing in `plan-09` §0a.) TDD, its own PR.
2. **Wire the adapter:** point the frontend at the live service — POST to `/process-questionnaire` (or GET `/runs/{id}`), feed the response through `toRunViewModel`, drop the mock. Add a `.env.local` `NEXT_PUBLIC_API_URL`.
3. **Citations + stages:** decide whether to map chunk `source_id`s back to human-readable refs (hard — likely v1.1) and whether n8n emits per-stage latency for the Processing timeline; until then the adapter's client-side derivations (§5) stand.
4. **Integration check** end-to-end against a real Sunflowers run, then a single integration PR merges `feature/frontend-nextjs` → `main` (Tom reviews + merges).

---

## 9. The 6 must-do design tweaks (from `plans/design-decision-locked.md`)

1. Sparkle `clip-path` → inline SVG `<polygon>` (`shape-rendering="geometricPrecision"`).
2. Stress-test the diagonal blue ribbon at 1440/1280/1024/768/375; if it reads as an "AI blob" at any width, remove it (fallback: faint underline under the hero heading + subtle tint behind the upload CTA).
3. Primary-button press scale `0.985` → `0.99`.
4. Orange-leakage audit: `grep -rE "#CC785C|claude-orange|crail|#C97A2B" frontend/app frontend/components` → expect ONLY the Powered-by-Claude badge + token defs.
5. Source Serif 4 (`.t-serif`) on answer body paragraphs only, not headings.
6. Visible light/dark toggle in the top bar + finish the half-wired dark theme.

---

## 10. Git execution + integration

- **Branch:** `feature/frontend-nextjs` (in the `../isq-agent-frontend` worktree).
- **Commits:** Conventional Commits, `feat(frontend)`/`test(frontend)`/`chore(frontend)`/`style(frontend)` (scope `frontend` is in `git-conventions.md`). Test-then-impl separation where there's a separate test. Explicit staging.
- **Do NOT push/tag from the loop** (RALPH.md). When a phase is solid, Tom pushes the branch manually.
- **No merge until the glue step (§8) is done and Tom reviews.** The integration is one reviewed PR → `main`. Then the dashboard ships under the existing milestone story (a `v0.7.0` "dashboard" tag is reasonable, or fold into `v1.0.0` — Tom's call; the tag table in `git-conventions.md` stops at `v0.6.0`/`v1.0.0`, so slot the dashboard in deliberately).
- **Cleanup when done:** `git worktree remove ../isq-agent-frontend` after the branch is merged.

---

## 11. Risks + how this stays low-risk (Tom's "no risk, maybe a tweak or two")

- **Worktree isolation:** different branch = separate working tree; the only shared state is `.git`. The single discipline is "never checkout main / never run the loop on main inside the frontend worktree."
- **No backend dependency during the build:** the UI binds to the tested adapter + mock, so a half-finished backend (open PRs #17/#18) can't break it.
- **The mismatch is already mapped** (§5) — the frontend audit found it, so the glue is a known, bounded adapter wiring, not a discovery exercise. That's the "extra tweak or two at the end."
- **The loop's safety rails hold** (no auto-push/tag, explicit staging, no `--no-verify`, pre-commit runs) — the worktree can't accidentally touch `main` or push.

---

## Plan 12 done ✅

A self-contained, Ralph-loop-runnable frontend plan: worktree + loop setup, frontend conventions, the de-risked data adapter as the glue contract, an 18-slice TDD checklist the loop advances through, the 6 locked tweaks, and a bounded glue step. Build it in parallel; wire it at the end; one reviewed PR to merge.
