# IMPLEMENTATION_PLAN — ISQ Agent frontend dashboard

> FRONTEND build (Next.js 14 / TypeScript). Test command: `npm test` (Vitest) run in `frontend/`, **NOT pytest**.
> Lint `npm run lint`; build check `npm run build`. Full spec: `plans/plan-12-frontend-dashboard.md`.
> Design source of truth: `design/design_handoff_isq_agent/designs/prototype-hybrid/` (tokens.css, claude-tokens.css, components.jsx, pages.jsx, data.js, icons.jsx). Conventions: `frontend/CLAUDE.md` (created in Slice 1).
> The root `CLAUDE.md` is Python/pytest-centric — ignore its pytest/ruff/rag-service specifics for these slices. STILL APPLIES: Tom's voice for UI copy (direct, Northern, contractions; banned: "genuinely", "leverage", "cutting-edge", em dashes), ZERO Matrix theming, no "Generated with Claude Code" footer.
> Git: work only on `feature/frontend-nextjs`; explicit staging (never `git add .`); no `--no-verify`; no auto-push/tag; **NEVER `git checkout main` in this worktree**.
> Design system in one line: warm-paper (#FAF9F5 bg / #191919 text), RiverAI blue (#2A7BE2) for all interactive accents, black pill CTAs (#0A0A0A), orange (#CC785C) ONLY on the "Powered by Claude" badge, Geist + Geist Mono + Source Serif 4 (answer body only).

## Current status summary and code review

- **Branch:** `feature/frontend-nextjs` (git worktree at `/Users/tombutler/Repos/isq-agent-frontend`, off `main` @ 3937956).
- **State:** fresh — no `frontend/` code yet. Plan 12 + this checklist committed. Backend (Plans 1–9.5) is the data source; build against the mock + a tested adapter, glue to the live service later (plan-12 §8).
- **Tests:** none yet (Slice 1 sets up Vitest + React Testing Library).
- **Data contract:** the backend canonical envelope (`/process-questionnaire`) maps to the view model via `lib/adapter.ts` — see plan-12 §5 for the exact field mapping. Build the adapter TDD-first (Slice 3); it is the de-risked "glue".

## Active phase

Phase A — Foundation.

## Ordered checklist

### Phase A — Foundation
- [ ] **Slice 1 — Scaffold.** `npx create-next-app@latest frontend --ts --tailwind --app --eslint --no-src-dir` (accept defaults). Add Vitest + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` + a `test` script + `vitest.config.ts`; add Prettier. Write `frontend/CLAUDE.md` from plan-12 §3. Validate: `npm run build` green and `npm test` passes one trivial test. Commit scaffold + `frontend/CLAUDE.md`.
- [ ] **Slice 2 — Design tokens + fonts.** Port `claude-tokens.css` + the hybrid overrides from `tokens.css` into `frontend/app/globals.css` as CSS variables; expose them through the Tailwind theme; load Geist, Geist Mono, Source Serif 4 via `next/font`. Validate: build green + a smoke test that a token CSS var resolves on `:root`. Commit.

### Phase B — Glue logic (TDD-first)
- [ ] **Slice 3 — Data adapter.** `lib/types.ts` + `lib/adapter.ts` with `toRunViewModel(canonical)` per plan-12 §5. Tests FIRST (Vitest): fixture envelope → expected view model; every rename; flagged answer surfaces `needs_review` + reason; `confidence: null` → flagged, no score, excluded from averages; `banner` "all_failed" and "all_flagged" both surface; empty `answers: []`. Commit test, then impl.
- [ ] **Slice 4 — Formatters.** `lib/format.ts`: `formatCurrency`, `formatDuration`, `formatConfidence`. Tests FIRST. Commit test, then impl.
- [ ] **Slice 5 — Upload validation.** `lib/validate.ts`: accept `.pdf`/`.xlsx`, reject other types and >10 MB, with clear messages. Tests FIRST. Commit test, then impl.

### Phase C — Primitives (render + behaviour tests via RTL)
- [ ] **Slice 6 — Wordmark + TopBar** ("Agent" in river-blue + sparkle; nav + repo link).
- [ ] **Slice 7 — Button + Badge.** Button: primary black pill / secondary / ghost / link. Badge: default / success / warning / error / accent / claude.
- [ ] **Slice 8 — Card + ConfidenceBar.** Card (+ paper/lift variants); ConfidenceBar compact + expanded (4-dimension tooltip).
- [ ] **Slice 9 — Dropzone + Toast + Skeleton + Spinner.** Dropzone states: empty / dragging / selected / error.
- [ ] **Slice 10 — Timeline + Tabs + AnswerCard.** Timeline (5 steps, active pulse); Tabs (blue underline); AnswerCard (collapsible; flagged variant with amber border + review reason).
- [ ] **Slice 11 — Ribbon.** Diagonal blue hero ribbon — landing page ONLY, never on inner pages.

### Phase D — Screens
- [ ] **Slice 12 — `/settings`.** API keys (masked), model radio, confidence slider (0.3–0.9, default 0.6), reindex button, save bar.
- [ ] **Slice 13 — `/` Landing.** Hero + ribbon + "how it works" (3 cards) + "grounded, not generative" strip + footer with the "Powered by Claude" badge.
- [ ] **Slice 14 — `/upload`.** Dropzone + 3 example shortcuts + validation + "what happens next" helper strip.
- [ ] **Slice 15 — `/runs/[id]` Processing.** Vertical timeline + live counters + activity log; driven by a polling stub (no live backend yet).
- [ ] **Slice 16 — `/runs/[id]/results` Results.** Summary + 3 download buttons (DOCX/XLSX/JSON) + mini stats + flagged card + Answers / Flagged / Citations / Metrics tabs + answer cards. Binds to `toRunViewModel(mockEnvelope)`.

### Phase E — Polish
- [ ] **Slice 17 — The 6 must-do tweaks** (plan-12 §9): sparkle clip-path → inline SVG; ribbon stress-test 1440/1280/1024/768/375 (remove if it reads as a blob); press-scale 0.985 → 0.99; orange-leakage audit; Source Serif 4 on answer body only; visible light/dark toggle + finish dark theme.
- [ ] **Slice 18 — Responsive + a11y + states.** Responsive 375/768/1024/1440; focus rings, prefers-reduced-motion, contrast, keyboard nav; loading skeletons; failed-question + all_failed states.

## Notes / discoveries

(loop appends blockers + tech decisions here)

## Next recommended build slice

**Slice 1 — Scaffold.** Then Slice 2 (tokens/fonts), then the adapter (Slice 3) before any screen.
