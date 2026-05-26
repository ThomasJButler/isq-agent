# Handoff: ISQ Agent Frontend — Claude × RiverAI Hybrid

## Overview

The ISQ Agent is a knowledge-grounded AI workflow that processes supplier Information Security Questionnaires (ISQs). The agent receives a blank questionnaire (PDF or XLSX), retrieves grounded answers from a knowledge base of company policies + historical responses, generates Claude-powered answers with confidence scoring, and produces filled response documents (DOCX, XLSX, JSON).

The functional MVP runs through n8n's built-in Form Trigger. This frontend is the **stretch deliverable** — a thin Next.js dashboard covering five screens:

1. **Landing** (`/`) — explains the agent, primary CTA to upload
2. **Upload** (`/upload`) — drop zone for PDF/XLSX, validates, hands off
3. **Processing** (`/runs/{id}`) — live timeline polled from n8n
4. **Results** (`/runs/{id}/results`) — answers, flagged review queue, citations, metrics, downloads
5. **Settings** (`/settings`) — API keys, model selection, confidence threshold

## About this theme — the Claude × RiverAI blend

This handoff is a **deliberate aesthetic blend** of two brand systems:

- **Foundation** — the Claude Design System: warm cream paper, hairline borders, Geist + Source Serif typography, soft warm shadows, calm motion, sentence-case copy with no emoji or exclamation marks.
- **Overlay** — the RiverAI brand language (riverai.co.uk): black pill-shaped CTAs (the "Start Your Project" lockup), RiverAI bright blue `#2A7BE2` as the interactive accent, the "RiverAI" wordmark pattern adapted to "ISQ Agent" with a small sparkle glyph, a discreet diagonal blue gradient ribbon on the landing hero.
- **Tie-in** — Crail orange `#CC785C` is held back to the "Powered by Claude" badge only. That single restrained moment signals the Anthropic-partner story without competing with RiverAI's blue.

The blend is intentional and small: ~90% Claude DS, ~10% RiverAI signature applied where it matters most (CTAs, focus accent, hero moment, wordmark). Don't fight either system — both are deliberately restrained and they amplify each other.

## About the Design Files

The files in `designs/` are **design references created in HTML** — vanilla HTML + a small React-via-Babel layer. They show intended look and behaviour; they are **not production code to ship as-is**.

Recreate these in the target codebase (Next.js 14+ App Router + Tailwind + shadcn/ui). Use shadcn primitives where they map cleanly (button, card, tabs, badge, progress, dialog, tooltip, separator, skeleton, sonner, slider, input/label/form). Build custom pieces (dropzone, timeline, confidence bar, answer card) on top.

Two CSS files matter:

- `designs/prototype-hybrid/claude-tokens.css` — canonical Claude DS tokens. Source of truth for colours, type, spacing, radii, shadows, motion.
- `designs/prototype-hybrid/tokens.css` — component-level CSS + the **hybrid overrides** (RiverAI blue, black pill buttons, ribbon, wordmark accent). Read this file to see every deviation from pure Claude DS in one place.

Open `designs/Hi-Fi Designs (Hybrid).html` for the flat reference, or `designs/Interactive Prototype (Hybrid).html` to click through the full happy path.

## Fidelity

**High-fidelity.** Pixel-faithful recreate the layouts, motion, copy, and the two-system blend. Don't drift toward "pure Claude DS" or "pure RiverAI" — the value is in the deliberate middle.

`designs/Wireframes (Hybrid).html` is provided for IA context only.

---

## Hybrid design tokens

The Claude DS tokens still apply (see `claude-tokens.css` — all 94 `--*` properties). The hybrid overlay adds these on top, defined at the top of `prototype-hybrid/tokens.css`:

### Brand additions (RiverAI)

| Token | Hex / value | Used for |
|---|---|---|
| `--river-blue` | `#2A7BE2` | Primary interactive accent — links, focus rings, active timeline pulse, "Agent" in wordmark, progress bar fill |
| `--river-blue-deep` | `#1F5FB8` | Hover / pressed state on links |
| `--river-blue-bright` | `#3B82F6` | AI sparkle glyph, hero ribbon brightest band |
| `--river-blue-light` | `#93C4FD` | Hero ribbon highlight band |
| `--river-blue-soft` | `rgba(42, 123, 226, 0.32)` | Focus rings |
| `--river-blue-tint` | `rgba(42, 123, 226, 0.10)` | Hover wash, badge-accent bg, dragging dropzone fill |
| `--river-ink` | `#0A0A0A` | Primary CTA fill (RiverAI black pill) |
| `--river-ink-hover` | `#1F1F1E` | Primary CTA hover |

### Foundation preserved (Claude DS)

| Token | Value | Role |
|---|---|---|
| `--bg-0` | `#FAF9F5` | Page background (warm cream paper) |
| `--bg-2` | `#F0EEE5` | Quiet card surface (manilla) |
| `--fg-1` | `#191919` | Primary text (warm charcoal) |
| `--fg-3` | `#5C5B57` | Secondary text |
| `--border-1` | `#E8E6DC` | Hairlines |
| `--claude-orange` | `#CC785C` | **Only** used on the "Powered by Claude" badge |
| `--success` | `#4A7C59` | Done state, high confidence |
| `--warning` | `#C97A2B` | Flagged answers, REVIEW badge |
| `--danger` | `#B5443A` | Failures, low confidence |
| `--font-sans` | `"Geist", …` | All UI type |
| `--font-mono` | `"Geist Mono", …` | Run IDs, mono numbers, citations |
| `--font-serif` | `"Source Serif 4", …` | Reserved for long-form reading surfaces (we don't use it in chrome) |

### Radii — buttons go full-pill in the hybrid

The hybrid overrides `--r-md` to `var(--radius-pill)` so any component using "button-rounding" reads as a pill:

```css
--r-md: var(--radius-pill);  /* hybrid: buttons are pills */
```

Other radii stay aligned with Claude DS:

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | 6px | Small chips, skeleton |
| `--radius-md` | 10px | (unused in hybrid — buttons are pills) |
| `--radius-lg` | 16px | Cards, dropzone, textarea |
| `--radius-xl` | 20px | (reserved) |
| `--radius-pill` | 9999 | **All buttons, all inputs, all badges, all tabs underline endcaps** |

### Type — slightly bolder, slightly tighter than pure Claude DS

RiverAI's marketing surface uses heavier weights and tighter tracking than the Claude UI. The hybrid splits the difference:

| Class | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|
| `.h1` | 48px | 700 (`--fw-bold`) | -0.03em | Bolder than Claude DS H1 |
| `.h2` | 32px | 600 (`--fw-semibold`) | -0.025em | |
| `.h3` | 20px | 600 | -0.015em | |
| body | 14px | 400 | -0.005em | Subtle tracking pull |
| `.eyebrow` | 12px | 600 | 0.04em uppercase | **Colour: `--river-blue`** (was muted in pure Claude DS) |

### Motion (unchanged from Claude DS)

- `--dur-fast` 120ms — hover, link underline
- `--dur-base` 180ms — state transitions
- `--ease` `cubic-bezier(0.2, 0.6, 0.2, 1)`
- Calm. No bounces. 200ms ceiling on most things. Active timeline step pulses on **RiverAI blue tint** (was Crail in pure Claude DS).
- Press: primary button scales to `0.985` (subtle nod to RiverAI's button feel).
- Respect `prefers-reduced-motion: reduce`.

### Focus rings (override)

`outline: 2px solid var(--river-blue-soft)` with `outline-offset: 2px` and `border-radius: var(--radius-pill)`. Replaces Claude DS's Crail focus ring with RiverAI blue.

---

## Signature elements

### The wordmark

The "ISQ Agent" wordmark mirrors RiverAI's "RiverAI" lockup (where "AI" is blue with a sparkle glyph after it). Markup:

```html
<a class="wordmark" href="/">
  <span>ISQ</span>
  <span style="width: 6px"></span>          <!-- 6px optical gap -->
  <span class="accent">Agent</span>          <!-- coloured blue, gets sparkle -->
</a>
```

CSS (already in `tokens.css`):

```css
.topbar .wordmark { font-weight: 700; font-size: 19px; letter-spacing: -0.02em; color: var(--fg-1); }
.topbar .wordmark .accent {
  color: var(--river-blue);
  position: relative;
  padding-right: 14px;
}
.topbar .wordmark .accent::after {
  content: "";
  position: absolute;
  right: 0; top: 4px;
  width: 8px; height: 8px;
  background: var(--river-blue-bright);
  clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
}
```

The sparkle is a CSS clip-path 8-point star. If you have the official RiverAI sparkle SVG, swap the clip-path for an `<img>` or inline SVG.

### The diagonal blue ribbon (landing hero only)

Two real `<span>` children inside a `.river-ribbon` wrapper give the screenshot-safe gradient sweep. Real elements (not pseudo-elements) — some renderers drop pseudo-elements with `transform: skewX`.

```html
<div class="river-ribbon" style="position: relative;">
  <span class="river-ribbon-fill river-ribbon-fill-1" aria-hidden="true"></span>
  <span class="river-ribbon-fill river-ribbon-fill-2" aria-hidden="true"></span>
  <section class="container" style="position: relative; z-index: 1;">
    <!-- hero content -->
  </section>
</div>
```

CSS — two layered skewed gradient panels anchored top-right of the wrapper:

```css
.river-ribbon { position: relative; overflow: hidden; }
.river-ribbon-fill { position: absolute; pointer-events: none; z-index: 0; }
.river-ribbon-fill-1 {
  top: -10%; right: -8%; width: 55%; height: 130%;
  background: linear-gradient(115deg,
    rgba(147,196,253,0)    0%,
    rgba(147,196,253,0.55) 32%,
    rgba(59,130,246,0.65)  55%,
    rgba(31,95,184,0.55)   100%);
  transform: skewX(-14deg);
  filter: blur(1px);
}
.river-ribbon-fill-2 { /* secondary, shorter, less opaque */ }
```

**Use only on the landing hero.** It is the single chromatic moment in the product surface. Do not repeat it on upload, processing, results, or settings — the rest of the product stays on quiet warm paper.

A `.subtle` modifier on `.river-ribbon` halves the opacity for surfaces where the band would otherwise be too loud — currently unused.

### Buttons — RiverAI black pill is default primary

```css
.btn { height: 44px; padding: 0 22px; border-radius: var(--radius-pill); font-weight: 500; }
.btn-primary,
.btn-accent { background: var(--river-ink); color: #fff; }  /* both variants map to the pill */
.btn-primary:hover,
.btn-accent:hover { background: var(--river-ink-hover); }
.btn-secondary { background: #fff; box-shadow: 0 0 0 1px var(--border-2); color: var(--fg-1); }
.btn-secondary:hover { box-shadow: 0 0 0 1px var(--fg-3); }
.btn-ghost { color: var(--fg-2); }
.btn-link { color: var(--river-blue); font-weight: 500; }
.btn-link:hover { color: var(--river-blue-deep); text-decoration: underline; }
.btn-lg { height: 50px; padding: 0 28px; }
.btn-sm { height: 32px; padding: 0 14px; }
.btn:active:not(:disabled) { transform: scale(0.985); }  /* subtle press */
```

In the hybrid both `btn-primary` and `btn-accent` resolve to the same black pill. The "accent" name is preserved for API compatibility with the Claude DS theme — components calling `<Button variant="accent">` still work.

### Inputs — pill-shaped

All single-line inputs are pill-shaped (`border-radius: var(--radius-pill)`); the textarea keeps `--radius-lg` (16px) so block content doesn't read like a giant lozenge:

```css
.input { height: 44px; border-radius: var(--radius-pill); background: #fff; border: 1px solid var(--border-2); }
.input:focus { border-color: var(--river-blue); box-shadow: 0 0 0 3px var(--river-blue-tint); }
.textarea { border-radius: var(--radius-lg); padding: 14px 16px; }
```

### Tabs

Tab underline switches from Claude DS charcoal to RiverAI blue. Underline ends are pinched inward (`left: 12px; right: 12px`) and softly capped at the top corners (`border-radius: 2px 2px 0 0`) — a small RiverAI-esque detail.

### Progress bar / active timeline step

Both swap to `--river-blue`:

```css
.progress > span { background: var(--river-blue); }
.tl-step.active .tl-dot {
  border-color: var(--river-blue);
  color: var(--river-blue);
  box-shadow: 0 0 0 4px var(--river-blue-tint);
  animation: tl-pulse 2s ease-in-out infinite;
}
```

### Toast (inverse, pill)

```css
.toast {
  background: var(--river-ink);
  color: var(--cloud-light);
  border-radius: var(--radius-pill);
  padding: 12px 18px;
}
```

### "Powered by Claude" badge (only Crail moment)

Kept exactly as in the Claude DS theme:

```css
.badge-claude {
  background: transparent;
  color: var(--claude-orange);  /* #CC785C — the ONLY place orange appears */
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
}
```

This single restrained moment is the partnership tie-in. Don't add Crail anywhere else.

---

## Screens — what's the same, what's different

The five screens follow the same layout, copy, and component spec as the pure Claude DS handoff. The deltas in the hybrid:

| Surface | Pure Claude DS | Hybrid |
|---|---|---|
| Page background | `#FAF9F5` warm cream | `#FAF9F5` warm cream (preserved) |
| Top bar wordmark | "ISQ Agent" with 26×26 Crail square + "I" glyph | "ISQ Agent" with "Agent" in `--river-blue` + 8×8 sparkle clip-path glyph |
| Eyebrow labels | `--fg-4` muted | `--river-blue` |
| Primary CTA | Warm charcoal pill or Crail accent | **Black pill** `#0A0A0A` |
| Button radius | 10px | **9999 (full pill)** |
| Link colour | Crail | RiverAI blue |
| Focus ring | Crail at 40% | RiverAI blue at 32% |
| Landing hero | Plain cream paper | **Diagonal blue ribbon** sliding in top-right |
| Active timeline pulse | Crail tint halo | RiverAI blue tint halo |
| Progress bar fill | `--fg-1` charcoal | RiverAI blue |
| Tab active underline | Charcoal | RiverAI blue, pinched & top-rounded |
| Toast bg | `--bg-inv` `#262624` warm charcoal | `--river-ink` `#0A0A0A` deeper black |
| Flagged answer treatment | Warm amber left border + tint | **Unchanged** — still warm amber |
| Confidence indicator | Same — green / amber / brick by threshold | **Unchanged** |
| "Powered by Claude" badge | Crail | **Unchanged** — Crail |

All screen layouts, copy, keyboard handling, accessibility, and data shapes are identical to the pure Claude DS handoff. The previous handoff README (or section 6 of the original Claude Design Spec) is the source for layouts; this file is the source for the hybrid styling overlay.

---

## UI Copy — Claude voice (unchanged)

Hold the Claude voice rules. RiverAI's own marketing voice is bolder and more declarative ("Human + AI. Delivered.") — fine for the wordmark and a single hero line, but don't let it bleed into product chrome.

- Sentence case everywhere
- British English (organise, colour, behaviour)
- No emoji, no exclamation marks
- Single calm sentence for empty states and errors
- Factual help text
- No "Oops!" / "Let's do this!" / "Hold tight!"

Canonical strings:

- "Drop a questionnaire here, or click to browse."
- "PDF or XLSX. Up to 10 MB."
- "Processing 14 of 20 questions."
- "We couldn't read this file. Try a PDF or XLSX."
- "Flagged: scope mismatch — question asks about ISO 27001 audit dates we don't have on file."

If you want a brand nod to RiverAI's marketing surface, "Ready, Set, Flow" is their methodology cadence ("Explore → Ready → Set → Flow → SAIL"). You could mirror that on the upload page step indicator ("Ready" → "Set" → "Flow" instead of "1 of 3 → 2 of 3 → 3 of 3") **if the client confirms**. Otherwise stay neutral.

---

## Conscious deviations from each source system

Flag these to whoever owns brand approval — they're not bugs, they're choices.

1. **Page background is warm cream, not RiverAI's neutral white.** RiverAI's live site uses `#FAFAFA` (and exposes `<meta name="theme-color" content="#FAFAFA">`). We kept Claude's `#FAF9F5` warm paper as the foundation to give the Anthropic partnership story equal visual weight. To switch to RiverAI's neutral white, override `--bg-0: #FAFAFA;` (and probably `--bg-2: #F0F0EE;`) in a root override.
2. **Claude DS button-radius preset (10px) is replaced by full pill.** This is the strongest RiverAI signature; we override `--r-md` to `--radius-pill` so any component using "button-rounding" reads as a pill without per-component changes. If you reuse the components in a non-RiverAI surface, restore `--r-md: 10px`.
3. **Crail orange is allow-listed to one place only.** The "Powered by Claude" badge. Don't add Crail accents elsewhere — the colour vocabulary in the hybrid is black + RiverAI blue + warm cream + warm charcoal text + restrained semantic moss/amber/brick.
4. **No serif type in chrome.** Geist is the only family on screen. Source Serif 4 is loaded and available for any reading-flow content you add later, but the product UI is sans throughout.
5. **Body type tracking is -0.005em (subtle pull).** Pure Claude DS sits at 0. RiverAI sits a touch tighter. Splitting the difference.

---

## Files in this handoff

```
design_handoff_isq_agent_hybrid/
├── README.md                                            (this file)
└── designs/
    ├── Wireframes (Hybrid).html                         Lo-fi IA + flow
    ├── Hi-Fi Designs (Hybrid).html                      5 screens at 1440×900 + components
    ├── Interactive Prototype (Hybrid).html              Clickable happy path
    ├── design-canvas.jsx                                Canvas used by wireframes + hi-fi
    └── prototype-hybrid/
        ├── claude-tokens.css                            Canonical Claude DS tokens (light + dark)
        ├── tokens.css                                   Component CSS + hybrid overrides (READ THIS)
        ├── icons.jsx                                    Inline SVG icon set (Lucide-style)
        ├── components.jsx                               Topbar, button, card, badge, dropzone, timeline, conf bar, tabs, answer card. The wordmark JSX with the sparkle accent lives here.
        ├── pages.jsx                                    Five page-level components. Landing has the .river-ribbon wrapper.
        ├── hifi.jsx                                     Hi-fi artboard wrappers
        ├── wireframes.jsx                               Wireframe artboard contents
        ├── app.jsx                                      Prototype app shell — routing, state, mounting
        └── data.js                                      Mock run data (20 ISQ Q&As, 2 flagged) — use for fixtures
```

### How to view the designs

Open `designs/Hi-Fi Designs (Hybrid).html` in a browser, or any deliverable directly. Self-contained — no build step. The interactive prototype is the highest-fidelity reference.

### Recommended implementation order

1. **Scaffold:** Next.js 14 App Router + Tailwind + shadcn/ui (button, card, tabs, badge, progress, dialog, tooltip, separator, skeleton, sonner, slider, input, label, form).
2. **Tokens:** copy `claude-tokens.css` into `app/globals.css`. Then add the hybrid overrides — the brand-additions block + button/input/wordmark/ribbon overrides — verbatim from `prototype-hybrid/tokens.css`. Optionally port to `tailwind.config.ts` (`colors.river.blue`, `colors.river.ink`, `colors.paper.0`, etc.).
3. **Fonts** — add the Google Fonts import at the top of `globals.css`:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap');
   ```
   Or use `next/font` to self-host (Geist is published by Vercel and works with `next/font/google`).
4. **Wordmark first** — the "ISQ Agent" lockup is the single most recognisable hybrid moment. Get this right on day one. Use the markup + CSS in the "Signature elements" section above.
5. **Button primitives** — override shadcn's `button` so default + accent variants both render as black pill. Secondary variant is white pill with a shadow-ring border.
6. **Ribbon** — implement as two `<span>` children inside a `<div className="river-ribbon">` on the landing route only. Do not lift it into a layout shell.
7. **Remaining primitives, smallest first:** badge → confidence bar → citation chip → timeline step → answer card → dropzone → tab list.
8. **Screens:** Settings → Landing → Upload → Processing → Results.
9. **n8n wiring:** `POST /api/runs` proxies the file upload to the existing n8n webhook; a status endpoint streams or polls progress. Out of scope for the design.

### Inherited caveats

From the Claude Design System project:

1. **Fonts are substituted.** Real Claude uses Styrene (sans) and Tiempos (serif), both commercial. We use Geist and Source Serif 4 from Google Fonts.
2. **Icons are substituted.** Lucide stands in for Claude's hand-curated icon family.
3. **Claude starburst logo is reconstructed** from memory.

From the RiverAI side:

1. **RiverAI logo is not used.** The "ISQ Agent" wordmark is a pattern echo, not a brand mark. Don't ship without confirming with RiverAI brand whether they're comfortable with this homage.
2. **RiverAI blue is approximated** from the live hero gradient (`#2A7BE2` central tone, `#3B82F6` brighter, `#1F5FB8` deep, `#93C4FD` light). If their brand book has exact swatches, swap them in via the `--river-blue*` tokens.
3. **Sparkle glyph is a CSS clip-path.** If RiverAI has the official sparkle SVG, swap it in.

---

## Reference: spec sections honoured

This handoff implements every "locked" decision from the original Claude Design Spec, restyled to the Claude × RiverAI blend:

- ✅ Five screens (landing, upload, processing, results, settings)
- ✅ Palette remapped: zinc → Claude paper/manilla; orange-600 → black pill + RiverAI blue accent; amber-500 → warm amber `#C97A2B`; red-600 → brick `#B5443A`
- ✅ Typography remapped: Inter → Geist (bolder weights, tighter tracking); JetBrains Mono → Geist Mono
- ✅ Spacing aligned with Claude's 8px grid
- ✅ Radii: full pill for buttons + inputs (RiverAI signature); 16px for cards (Claude DS)
- ✅ Shadows: warm rgba(60, 40, 20, *) — minimal use
- ✅ Locked motion: 120–200ms ease, no bounces, reduced-motion respected, subtle press-scale on primary button
- ✅ British sentence-case copy, no emoji, no exclamation marks
- ✅ All UI states represented (empty, loading, data, error)
- ✅ Component-level mocks (dropzone, answer card, confidence bar, timeline step, badges)
- ✅ Do/don't comparisons on risky decisions (flagged-card styling, confidence visualisation, accent usage)
- ✅ Annotations on each artboard
- ✅ Accessibility commitments documented

---

End of handoff. Open `designs/Hi-Fi Designs (Hybrid).html` to start.
