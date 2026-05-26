# Claude Design Spec — ISQ Agent Frontend

> **STATUS: SUPERSEDED 2026-05-26.** This spec was handed to Claude Design overnight Monday→Tuesday. Three iterations were produced. **Iteration 3 (Claude × RiverAI Hybrid) was selected and locked.** See `plans/design-decision-locked.md` for the decision record, must-do tweaks, and risk monitoring. The selected design lives at `design/design_handoff_isq_agent/designs/prototype-hybrid/`. This file is preserved as the original brief for the historical record.

**Purpose:** Hand this document to Claude Design for overnight visual iteration. The output will be reviewed Tuesday morning and merged into Plan 9.5 (packaged Claude Code skill) + stretch Next.js dashboard work.

**Date:** Monday 2026-05-25 evening
**Owner:** Tom Butler
**Context:** Frontend for the ISQ Agent — a knowledge-grounded AI workflow that processes supplier security questionnaires. This frontend is the **stretch deliverable** for the RiverAI AI Engineer assessment.

---

## 1. The product (one paragraph)

The ISQ Agent receives blank Information Security Questionnaires (PDF or XLSX), retrieves grounded answers from a knowledge base of company policies + historical responses, generates Claude-powered answers with confidence scoring, and produces filled response documents in three formats.

The functional MVP runs entirely through n8n's built-in Form Trigger (out-of-the-box UI). **This frontend is a polished alternative** — a thin Next.js dashboard that wraps the same n8n webhook with a considered, on-brand experience.

**Why a custom frontend exists:** to demonstrate full-stack craft. The runtime works in n8n; the dashboard shows that I can ALSO build a clean React UI when it's the right call.

---

## 2. Audience for this design

**Primary viewer:** Lee Jackson (Senior AI Engineer at RiverAI). He will see this during a 15-minute walkthrough demo. He's evaluating:
- Does this person care about craft beyond the LLM layer?
- Could this person own front-end work as well as AI?
- Does the visual quality match the engineering quality?

**Secondary viewer:** Gav Winter (Chief AI & Operations Officer at RiverAI). Less technical, more product-instinct. Looking for:
- Does this feel like something we'd be proud to put in front of a client?
- Is the brand polish consistent with our agency-grade work?

**Imagined end-user (notional):** an InfoSec or compliance team member at Northstar Labs (fictional) who uses this to clear ~10-50 supplier questionnaires a month. They want minimum-clicks, maximum-trust, clear-flagging.

---

## 3. Visual direction (locked)

**Three words: professional, minimalistic, smooth.**

Inspirations to draw from:
- **Linear** ([linear.app](https://linear.app)) — the gold standard for considered B2B SaaS UI
- **Vercel dashboard** ([vercel.com/dashboard](https://vercel.com/dashboard)) — clean monochrome with restrained colour
- **Claude.ai** ([claude.ai](https://claude.ai)) — Anthropic's own UI; we're aligned with the Claude ecosystem so this should feel like a sibling
- **shadcn/ui** ([ui.shadcn.com](https://ui.shadcn.com)) — the component library we'll use; the showcase examples are the visual baseline

Aesthetics to avoid:
- Gradients, glassmorphism, glows
- Hero illustrations or 3D shapes
- Brand mascots, emoji decoration
- Cards-everywhere layouts
- Decorative typography (no script fonts, no display fonts beyond the heading)

The frontend should look like it was built by someone who's seen a lot of UI and learned to take stuff out, not add stuff in.

---

## 4. Brand & style system

### Colour palette (locked)

```
Background          zinc-50    #FAFAFA
Surface             white      #FFFFFF
Border              zinc-200   #E4E4E7
Foreground          zinc-900   #18181B
Muted foreground    zinc-500   #71717A
Accent              orange-600 #EA580C   (Claude-aligned, used sparingly)
Success             emerald-600 #059669  (status only)
Warning             amber-500  #F59E0B   (flagged answers, REVIEW badges)
Error               red-600    #DC2626   (failures only)
```

Total chromatic content: very low. The interface is essentially monochrome with single-colour accents to mark status. **No backgrounds use the accent colour. Accent appears in: primary button fill, links, focused states, the small "POWERED BY CLAUDE" badge.**

### Typography (locked)

- **Sans-serif:** Inter (Google Fonts) at standard weights 400, 500, 600
- **Monospace:** JetBrains Mono (for JSON previews, code blocks, technical labels)
- Scale: Tailwind's default (text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl)
- No bold-everything — emphasis comes from weight 500 vs 400, plus colour value

### Spacing rhythm

Tailwind 4 → 6 → 8 → 12 → 16 → 24. Generous whitespace is the brand. If unsure: more whitespace, not less.

### Border radius

`rounded-lg` (8px) for cards. `rounded-md` (6px) for buttons + inputs. `rounded-full` for pills/badges.

### Shadows

Sparing. `shadow-sm` for cards. `shadow-md` for the modal/dialog only. Never `shadow-xl` or above — feels casual.

### Motion (smooth-as-butter directive)

- **Page transitions:** 200ms cubic-bezier ease (Tailwind's `transition-all duration-200`)
- **Hover states:** 150ms colour shifts only — no transforms
- **Modal/dialog enter:** 200ms fade + tiny scale (0.98 → 1.0)
- **Progress indicators:** smooth shimmer or determinate bar
- **No bounces.** No spring physics. No bouncy easings. Linear/ease only.
- **Reduced motion respected:** `prefers-reduced-motion` → all transitions become instant fades or none.

---

## 5. Tone of voice in UI copy

- Direct. No emoji.
- Sentence case for headings ("Upload questionnaire", not "Upload Questionnaire")
- British English spelling (organise, colour, behaviour)
- Concise. Empty states + error messages should be a single calm sentence.
- No exclamation marks. No "Oops!" or "Whoops!" copy. No "Let's do this!" CTAs.
- Help text: factual. ("PDF or XLSX. Up to 10 MB.")

**Examples:**
- ✅ "Drop a questionnaire here, or click to browse."
- ❌ "Drag and drop your file to get started! 🚀"
- ✅ "Processing 14 of 20 questions."
- ❌ "Hold tight while we work our magic ✨"
- ✅ "We couldn't read this file. Try a PDF or XLSX."
- ❌ "Oops! Something went wrong. Please try again later."

---

## 6. The screens (scope-locked)

For the stretch deliverable, **five screens**:

### Screen 1 — Landing / Home (`/`)

Lands a visitor with zero context. They should know in 5 seconds:
1. What this is
2. What they can do with it
3. Where to start

**Layout (top to bottom):**
- Slim top bar: ISQ Agent wordmark (left), single nav link "About" (right). Very subtle border-bottom.
- Hero section: large but considered heading + one-sentence description + primary CTA button.
  - Heading: "Answer supplier security questionnaires with grounded AI."
  - Subhead: "Upload a questionnaire. The agent retrieves answers from your policies and historical responses, flags anything that needs a human, and outputs three deliverable formats."
  - Primary CTA: "Upload questionnaire" → goes to /upload
  - Secondary CTA (text link): "How it works" → scrolls to next section
- "How it works" section: three numbered cards in a row (desktop) / stacked (mobile)
  - 1. Upload — PDF or XLSX
  - 2. AI extracts questions, retrieves grounded answers
  - 3. Download filled response in your preferred format
- Footer: minimal. "Built with Claude · Tom Butler · MIT" — small muted text, centred.

**Visual notes:**
- Hero text alignment: left, not centred (less marketing-y, more product-y)
- The "How it works" cards have a thin border, no shadow, generous padding
- "POWERED BY CLAUDE" badge top-right of footer (orange-600 text, very small)

### Screen 2 — Upload (`/upload`)

The user drops a file or browses. State: empty → file selected → uploading → handing off to workflow.

**Layout:**
- Same top bar as landing
- Centred upload zone — full-card-width drop zone, dashed border, height ~280px on desktop
- Drop zone copy when empty: "Drop a questionnaire here, or click to browse."
- Sub-copy: "PDF or XLSX. Up to 10 MB."
- After file selected: filename + size + "Remove" link + primary CTA "Start processing" enabled
- Below the drop zone: a one-line "Or send to: isq-agent@yourdomain.example" (showing email trigger as alternative)

**States:**
- Empty (drag prompt visible)
- Dragging over (zone border becomes solid + accent-coloured)
- File selected (preview chip + Start button)
- Validating (spinner + "Checking file...")
- Submitting (spinner + "Sending to workflow...")
- Error (red border + single error message)

### Screen 3 — Processing (`/runs/{id}`)

Visible after submission. Polls or SSE-streams workflow state from n8n.

**Layout:**
- Top bar
- Run ID + filename header
- Vertical progress timeline with 5 steps:
  1. ✓ Document uploaded
  2. ✓ Questions extracted (20 found)
  3. ◐ Answering (14 of 20)
  4. ○ Rendering outputs
  5. ○ Done
- Live counters: questions answered, average confidence, est. cost so far, elapsed time
- The currently-active step has a soft pulse animation (smooth, not anxious)
- Once done: page redirects to /runs/{id}/results

**Visual notes:**
- Use a vertical timeline component (shadcn doesn't have one out of the box — build with flex + circles + connecting line)
- Completed steps: filled circle + checkmark, muted
- Active step: ring with progress
- Future steps: empty circle, muted
- Status copy is plain ("Answering 14 of 20", not "Working hard on question 14!")

### Screen 4 — Results (`/runs/{id}/results`)

The deliverable. User sees what was produced.

**Layout (top to bottom):**
- Top bar
- Summary card at top:
  - Filename
  - Completion time + cost
  - "20 questions answered · 2 flagged for review"
- Three download buttons in a row:
  - "Download DOCX" (primary)
  - "Download XLSX" (secondary)
  - "Download JSON" (secondary)
  - (PDF if shipped: same secondary style)
- Tabbed sections below:
  - **Answers** (default) — list view, one card per Q+A pair, with confidence indicator + flagged badge if applicable
  - **Flagged** — only flagged questions, surfaced for review
  - **Citations** — list of which policy chunks were most-cited across all questions
  - **Metrics** — cost breakdown, token counts, latency
- Each answer card:
  - Question number + question text (heading)
  - Answer text (body)
  - Confidence score (small bar or numeric, muted)
  - Citations (chip list, small)
  - If flagged: amber-bordered card + "[REVIEW]" badge + review reason in italic below

**Visual notes:**
- Flagged cards have a thin amber left border (3px) + slightly amber-tinted background (very subtle)
- Confidence as a small inline bar: 0% red → 60% amber → 100% emerald (matches the threshold)
- The download buttons are NOT tucked in a corner; they're prominent because they're the actual deliverable

### Screen 5 — Settings (light) (`/settings`)

Minimal. Just enough.

**Sections:**
- API Configuration (Anthropic key, Voyage key, Pinecone key — masked, never displayed in plaintext)
- Model selection (radio: Claude Sonnet 4.5, Claude Haiku 4.5)
- Confidence threshold (slider: 0.3 → 0.9, default 0.6)
- "Reindex knowledge base" button (triggers POST /index)

No tabs, no complex form. Single column, generous spacing, "Save" at bottom.

---

## 7. Component spec (shadcn-grounded)

Required shadcn components (Tom installs as needed):
- `button` (primary, secondary, ghost, link variants)
- `card` (container for upload zone, summary, answer cards)
- `dropzone` (custom-built using `input[type=file]` + drag handlers — shadcn has no native dropzone)
- `tabs` (results page sections)
- `badge` (status pills — REVIEW, completion count, etc.)
- `progress` (processing screen)
- `dialog` (settings save confirmation, error modals)
- `tooltip` (citation chips, confidence hover)
- `separator` (between sections)
- `skeleton` (loading states on results page)
- `sonner` or `toast` (transient success/error messages)
- `slider` (settings confidence threshold)
- `input` + `label` + `form` (settings page)

All components installed via `pnpm dlx shadcn@latest add <name>`.

---

## 8. Interaction patterns

### Loading states
- Skeleton placeholders, not spinners-everywhere
- Page transitions: brief skeleton, then content fades in over 200ms
- Buttons in loading state: disabled + small inline spinner replacing the icon (not full-button replacement)

### Error states
- Inline errors below the affected field, single sentence
- Page-level errors: top-of-page banner, red-600 left border (4px), white background, dismissable
- Never use alert dialogs for errors that aren't blocking

### Empty states
- Single illustration (line-art style, monochrome) — OPTIONAL, can omit entirely
- One-sentence description of what to do
- One CTA button

### Hover states
- Buttons: background colour shifts subtly (e.g. white card → zinc-50 background)
- Links: underline appears smoothly
- Cards: subtle scale not allowed; only border colour or background tint shifts

### Focus states
- 2px ring in accent colour (orange-600 with opacity 50%)
- No outline-none without replacement (accessibility)

### Keyboard navigation
- Tab order matches visual order
- Modal dialogs: focus trapped, Escape closes
- Drop zone: Enter/Space triggers file picker

---

## 9. Accessibility (non-negotiable)

- WCAG AA contrast ratios (zinc-900 on zinc-50 ≈ 16:1, well above 4.5:1)
- All interactive elements keyboard-reachable
- Screen reader: aria-labels on icons, aria-live on toasts and processing updates
- Reduced motion: `prefers-reduced-motion: reduce` disables all transitions
- Form fields: labels always present, even if visually compact
- Focus rings always visible (never `outline: none` without replacement)

---

## 10. Constraints

**In scope for this design:**
- Five screens listed in Section 6
- shadcn/ui components only (no custom design system from scratch)
- Tailwind CSS for styling
- Next.js 14+ App Router
- Responsive: works at 1440px desktop and 375px mobile
- Light mode only (dark mode = stretch beyond stretch)

**Out of scope:**
- Multi-tenant org management
- User auth / login
- Real-time collaborative editing
- Mobile-first complex flows (mobile responsive but desktop-primary)
- Onboarding tour / product tour
- Animations beyond the simple ones listed
- Custom illustrations (use sparingly if at all; consider omitting)

---

## 11. What I want from Claude Design

Hand this spec to Claude Design. I want back:

1. **Visual mockups** for each of the 5 screens at 1440×900 desktop viewport
   - Hi-fidelity, using the locked colour palette + typography
   - Light mode
   - All UI states represented (empty / loading / data / error per relevant screen)

2. **Component-level mockups** for the key reusable pieces:
   - The drop zone (empty, dragging, file selected, error)
   - An answer card (clean, flagged, processing)
   - The confidence bar / inline indicator
   - The processing timeline step (pending, active, done)
   - The status badge variants (Done, Flagged, Processing, Error)

3. **Annotations** on each mockup explaining:
   - Component choices (which shadcn primitive maps to what)
   - Tailwind class names for the critical layout pieces
   - Edge case handling (long text, very-long filename, etc.)

4. **A small set of "do" vs "don't" comparisons** for the riskiest design decisions (e.g. flagged-card styling, confidence visualisation).

5. **An overview spec sheet** with:
   - The final colour token list (matched to Tailwind tokens)
   - The final typographic scale
   - The motion timing values

6. **Plain-text export of layouts** suitable for handing to Claude Code in VSCode for implementation. JSX scaffolding for each screen, even if loose.

---

## 12. References Claude Design should pull from

If Claude Design needs visual reference:
- **Linear app** — every screen
- **Vercel dashboard** — list views + table designs
- **Claude.ai** — colour palette + typography (especially the muted-foreground / foreground contrast)
- **Anthropic.com** — page headers + typography weight choices
- **Stripe dashboard** — form design + settings page
- **shadcn examples** — [ui.shadcn.com/examples](https://ui.shadcn.com/examples) — the dashboard + cards examples are directly relevant

**Avoid drawing from:**
- B2C product UI (Notion, Linear's marketing site, Spotify)
- Anything with strong personality / mascots
- Glass-morphism design libraries
- Anything labelled "AI startup hero" — too tropey

---

## 13. Handoff plan (after Claude Design delivers)

When the design pass returns Tuesday morning:

1. **Review with fresh eyes** — does each screen feel professional, minimalistic, smooth?
2. **Pick one screen as the gold-standard reference** — probably the Results page (highest information density, most chance to get colour and rhythm right)
3. **Iterate once on weak spots** — quick-turn second pass on anything that feels off
4. **Translate to Plan 9.5 deliverable** — the design becomes the spec for the stretch Next.js dashboard build, only if time permits in the Friday morning window
5. **Embed key mockups in the README** — even if Next.js dashboard isn't shipped, the design mockups in the README signal full-stack capability

**Important:** the design getting "approved" doesn't commit Tom to building all of it. The realistic outcome is:
- Always ships: the design mockups embedded in README + docs
- If time permits: a 1-screen Next.js build (the upload screen, deep-linked to the n8n webhook)
- Stretch: the full 5-screen flow

---

## 14. Walkthrough card this design unlocks

When Lee asks "did you build the frontend?" Tom can answer one of three ways:

**Minimum (always available):**
> "I designed the full UI specification — five screens, full component spec, accessibility commitments. The mockups are in the README. The functional MVP runs through n8n's Form Trigger because that's what the brief asked for. The custom frontend was the stretch, which I scoped but didn't ship — here's exactly how I'd build it given another day."

**Partial (if 1 screen built):**
> "I shipped the upload screen as a proof-of-concept — it's the entry point to the n8n workflow with the custom UI on top. The full five-screen spec is in the README. I could build out the rest in a day."

**Full (if all 5 screens built):**
> "Here's the dashboard end-to-end. n8n still owns the workflow; this is the front-of-house. Five screens covering upload, processing, results, history, settings. Same design system you'd see from a polished B2B SaaS product."

All three are credible. Even the minimum option lands "I think about UX, not just AI."

---

## 15. Notes Claude Design should know

- **Tom's voice in UI copy**: direct, Northern English, no AI-fluff. See Section 5.
- **The brief explicitly didn't ask for a frontend** — n8n Form Trigger satisfies. This is the stretch deliverable.
- **The plan-folder discipline**: 11+ planning iterations precede any UI code. This frontend spec is itself an artefact, not a brief.
- **Lee and Gav are evaluating** the design as a signal of full-stack craft. Quality > quantity.
- **No deadline pressure on the design**: Claude Design has overnight; Tom reviews Tuesday morning.

**End of spec. Hand to Claude Design tonight.**
