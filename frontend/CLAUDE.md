@AGENTS.md

# CLAUDE.md — ISQ Agent frontend (Next.js dashboard)

> Runtime as scaffolded: Next.js 16 (App Router) + React 19 + Tailwind v4.
> The imported AGENTS.md above warns this Next.js has breaking changes vs. older
> releases — check `node_modules/next/dist/docs/` before reaching for an unfamiliar API.

This directory is the stretch dashboard. It is TypeScript/Next.js, separate from the
Python rag-service. The root CLAUDE.md's pytest/ruff/Pinecone guidance does NOT apply here.

## Commands (run from frontend/)

- Dev: `npm run dev`
- Test: `npm test` (Vitest, single run); watch with `npm run test:watch`
- Lint: `npm run lint` · Build check: `npm run build` · Format: `npm run format`

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
