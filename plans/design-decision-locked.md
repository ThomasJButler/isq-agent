# Design Decision — LOCKED

**Date locked:** 2026-05-26 (early Tuesday, post-Claude-Design overnight)
**Selected:** Iteration 3 — "Claude × RiverAI Hybrid"
**Location on disk:** `design/design_handoff_isq_agent/designs/prototype-hybrid/`

---

## What was chosen and why

After producing three iterations of the same 5-screen Next.js dashboard via Claude Design overnight (spec-locked / Claude Design System / Hybrid), Iteration 3 was selected as the lead.

**Decision criteria scores (out of 10):**

| Criterion | Iteration 1 | Iteration 2 | Iteration 3 |
|---|---|---|---|
| Visual polish | 7 | 9 | 9 |
| Professional credibility | 8 | 8 | 9 |
| Brand-fit for RiverAI | 5 | 7 | **10** |
| "Proud to show Lee" | 6 | 9 | **10** |
| **Total** | 26 | 33 | **38** |

**Why Iteration 3:**
- The only iteration that demonstrates "I studied your visual language" (RiverAI-specific signature: black pill CTAs, blue interactive accent, sparkle wordmark)
- Built on Claude DS foundation = signals fluency in the Anthropic partner ecosystem
- The single "Powered by Claude" Crail-orange badge is conceptually elegant — partnership story in one moment
- Strategic sophistication that goes beyond surface styling

---

## What survives — keep these

These elements are the design's strongest moments. Defend them through any final iteration:

1. **The "Powered by Claude" Crail-orange badge** on landing footer — the ONLY orange in the entire UI. Conceptually perfect.
2. **The black `#0A0A0A` pill CTAs** — unambiguously RiverAI.
3. **RiverAI blue `#2A7BE2` as interactive accent** — links, focus rings, timeline pulse, tab underline.
4. **The wordmark sparkle** echoing RiverAI's "AI" pattern (with one tweak — see below).
5. **The cream `#FAF9F5` paper foundation** with warm shadows — Claude DS foundation.
6. **Tighter type tracking** (`-0.005em` body, `-0.03em` H1) matching RiverAI marketing.
7. **Press-scale on primary** for RiverAI's exact button-feel (with one tweak — see below).
8. **Token architecture extending Claude DS** — single flip switches theme. Design-system thinking.

---

## Must-do tweaks before shipping (from review)

These are non-negotiable. Apply when building the Next.js stretch dashboard.

### 1. Replace sparkle clip-path with inline SVG

The 8×8 clip-path polygon can pixel-snap badly at small sizes. Use SVG `<polygon>` with `shape-rendering="geometricPrecision"` instead.

```jsx
// Replace this CSS pattern:
// clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);

// With this inline SVG:
<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision">
  <polygon points="4,0 4.8,3.2 8,4 4.8,4.8 4,8 3.2,4.8 0,4 3.2,3.2" fill="#3B82F6" />
</svg>
```

### 2. Stress-test the diagonal blue gradient ribbon

Render at 1440 / 1280 / 1024 / 768 / 375. If it reads as "AI-generated decorative blob" at any width → REMOVE entirely. A clean hero with no ribbon beats a hero with a half-tuned one.

Test on hero ONLY (must not appear on inner pages — already locked in plan).

Fallback if ribbon doesn't hold up: a faint coloured underline under the hero heading + a subtle background tint behind the upload CTA. Minimal, considered, no gradients.

### 3. Reduce press-scale from 0.985 to 0.99

Smaller scale = less reactive, more premium. Two-character change in tokens.css.

### 4. Run the orange-leakage audit before submission

```bash
cd ~/Repos/isq-agent
grep -rE "#CC785C|claude-orange|var\(--accent\)|crail|#C97A2B" \
  --include="*.tsx" --include="*.jsx" --include="*.css" \
  --include="*.html" --include="*.md" \
  src/ app/ public/ 2>/dev/null
```

Expected matches: ONLY the "Powered by Claude" badge component + the token definitions. Anything else = orange leakage = kills the concept.

`#C97A2B` (warm amber semantic) might appear in the flagged-answer badge styling — that's NOT Crail orange, it's amber. Distinct visual purpose. Verify it doesn't visually conflate.

### 5. Render Source Serif 4 for answer body text

Lift from Iteration 2 (now deleted, but the import was: Google Fonts `Source Serif 4`). Apply only to the answer paragraph in the Results page answer cards. Not to headings, not to citations. Sans for everything else.

```jsx
<p className="t-serif">{answer.text}</p>
```

```css
.t-serif {
  font-family: "Source Serif 4", ui-serif, Georgia, serif;
  font-size: 17px;
  line-height: 1.7;
  color: var(--fg-1);
}
```

This is the editorial-quality detail most candidates skip. Answers ARE reading material. Treat them as such.

### 6. Add visible light/dark mode toggle to top bar

Right side, next to the "About" nav link. Tokens already support dark mode. Make it visible. Signals "complete product, not half-finished light theme."

```jsx
<button
  className="btn btn-ghost btn-sm"
  onClick={() => document.documentElement.classList.toggle('dark')}
  aria-label="Toggle dark mode"
>
  {isDark ? <Sun /> : <Moon />}
</button>
```

---

## Risk monitoring

| Risk | Severity | Mitigation |
|---|---|---|
| Diagonal ribbon reads as AI-slop | HIGH | Stress-test + remove if not perfect (#2 above) |
| Orange leaks beyond Powered-by-Claude badge | HIGH | Grep audit before shipping (#4 above) |
| Wordmark sparkle pixel-snaps | MEDIUM | Replace with SVG (#1 above) |
| Black pill on cream too aggressive at small sizes | LOW | Visual check at `.btn-sm`; soften to `#1A1A1A` if needed |
| Type tracking hurts caption legibility | LOW | Check captions at 12px specifically |
| Dark mode breaks visual hierarchy | MEDIUM | Test toggle, verify black pills become inverse in dark |

---

## What this means for the build

### For Plan 9.5 (packaged Claude Code skill)

No design dependency. The skill is text-based — SKILL.md + scripts. Ships independent of the dashboard.

### For Plan 9 (output rendering)

No change. The DOCX/PDF/XLSX renderers use the **Plan 7a navy/amber palette** for compliance-document output. That's correct — printed compliance documents should look like compliance documents, not like the dashboard. The dashboard is the UI; the rendered outputs are the artefacts.

### For the stretch Next.js dashboard (if built Friday)

Iteration 3 is the spec. Lift directly from:
- `design/design_handoff_isq_agent/designs/prototype-hybrid/tokens.css`
- `design/design_handoff_isq_agent/designs/prototype-hybrid/claude-tokens.css`
- `design/design_handoff_isq_agent/designs/prototype-hybrid/hifi.jsx`
- `design/design_handoff_isq_agent/designs/prototype-hybrid/components.jsx`

The 5 screens (Landing / Upload / Processing / Results / Settings) are already designed. The Next.js build is mostly: scaffold the App Router routes + drop the JSX in + connect to the n8n webhook URL.

### For the README + docs

Embed screenshots of Iteration 3's landing + results pages. The screenshots ARE the design story.

The README's "How it was built" section can mention the design iteration explicitly:
> "I produced three design iterations before settling on the lead: the standard B2B baseline, the Anthropic-aligned version, and the RiverAI-blended one shipped here. I picked the blend because it tells the partnership story most clearly. See `design/design_handoff_isq_agent/` for the design handoff artefacts."

---

## What was discarded (and why kept track)

- **Iteration 1 (Spec-locked, zinc + orange-600)** — competent but forgettable. Reads as "every YC product 2024." No specificity to RiverAI or to the Anthropic partnership. Deleted.
- **Iteration 2 (Claude DS, cream + Crail orange)** — beautiful and on-brand for Anthropic ecosystem, but no RiverAI signature. Derivativeness risk if Lee reads it as "you cosplayed claude.ai." Deleted.

The 10-second walkthrough beat that uses this history:
> "I did three iterations of the visual treatment — the standard B2B baseline, the Anthropic-aligned version, and the RiverAI-blended one I shipped. I picked the blend because it tells the partnership story most clearly."

That sentence is worth 10 seconds in the demo. Most AI engineers can't talk about design at this level. The fact that you did three iterations and have reasoning for the choice is itself a signal.

---

## Locked.

This decision is closed. Build Iteration 3 with the six tweaks above. No further design iteration before submission. The Next.js dashboard, if shipped, follows this spec exactly.

---

## Post-audit addendum (2026-05-29) — frontend review outcome

A read-only frontend-design audit (multi-agent + live browser render of the prototype) on 2026-05-29 confirmed the design is distinctive and production-grade, and that nothing about it blocks Plans 8/9 (backend). It surfaced items to handle **before the dashboard is built** — recorded here so they aren't lost. The locked decision above is unchanged.

### Data-contract reconciliation (do this in the dashboard build, NOT in Plan 8)

The prototype mock (`design/.../prototype-hybrid/data.js`) and Plan 8's `/answer` `response_model` disagree on shape. Plan 8's nested shape is canonical — keep it; adapt the dashboard (a thin adapter):

- **Confidence dimensions:** mock reads flat `confidence.cites_policy`; Plan 8 emits `confidence.dimensions.cites_policy`. (The math matches — same weights 0.40/0.25/0.20/0.15, same 0.60 threshold, same green/amber/brick bands.)
- **Flag flag:** mock reads `answer.needs_review`; Plan 8 emits `confidence.needs_review`.
- **Citations:** mock expects `{id, source, page}` ("ISP §5.2"); the API returns `{source_id: "nlisp-p1-c0", text_snippet}` (page/chunk vector IDs, not section refs). Either re-attach `source`/`page` in the generator/orchestrator or render `source_id`.
- **Run envelope:** `meta / summary / top_citations / stages`, `average_confidence`, `flagged_question_indices` (canonical name; mock calls it `flagged_indices`) have no backend producer — `/answer` is per-question. Decide where run-aggregation lives (n8n or a new `/runs` endpoint). See Plan 9 §0a (canonical-JSON assembler).
- Add `failed`/`confidence=null` handling, the `all_failed` banner, 375px responsive, and Results loading skeletons — states the prototype doesn't model.

### Six must-do tweaks — status as of 2026-05-29

- **#1 sparkle clip-path → inline SVG** — pending (clip-path still live; an SVG glyph exists in `icons.jsx` but isn't wired to the wordmark).
- **#2 ribbon stress-test** — holds visually at 1440 and 375 (clean directional gradient, not a blob); still the most-flagged element — keep it crisp or add a flat export fallback.
- **#3 press-scale 0.985 → 0.99** — pending (still 0.985).
- **#4 orange-leakage — FIXED in the prototype.** The Settings model-radio and the Processing "Generate" latency bar were leaking Crail via `--accent`; both are now RiverAI blue. When porting, re-point `--accent` → `--river-blue` and re-run the grep.
- **#5 Source Serif 4 on answer body** — pending (answer body still renders Geist sans).
- **#6 visible light/dark toggle** — pending; dark mode is also only half-wired (topbar darkens, cards stay light) — finish the dark theme, not just the toggle.

### Screenshots / README design story

17 reference PNGs exist at `design/.../prototype-hybrid/pngs/` (10 screens + 7 wireframes), kept out of git by choice. Deliver the README design story via GitHub asset URLs (see Plan 11 §2b). Lead shots: `01-landing`, `05-results-answer-expanded`, `wireframe-06-userflow`.
