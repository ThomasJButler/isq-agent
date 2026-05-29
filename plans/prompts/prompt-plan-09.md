# Companion Prompt — Plan 9 (Output Rendering)

**Use this prompt in Claude Code (VSCode) when you're ready to build Plan 9.**

Paste everything below the `---` line as your first message.

---

You're helping me build **Plan 9 — Output Rendering Strategy (TDD-first)** of the ISQ Agent project.

## Read these first

In `plans/`:
- **plan-09-output-rendering.md** (the plan you're executing)
- **plan-08-confidence-and-flagging.md** (the `needs_review` flag we render)
- **plan-01-initial-sketch.md** Section 7a (locked visual style) + Section 7d (working-style commitments)

## Branch + workflow

Plan 9 has FOUR renderers, so four feature branches in sequence:

```bash
cd ~/Repos/isq-agent

# Branch 1
git checkout -b feature/render-docx
# ... do DOCX work, PR, merge

# Branch 2
git checkout main && git pull
git checkout -b feature/render-pdf
# ... etc.
```

Conventional Commits format on every commit. Squash-and-merge to main via PR.

## What to do FIRST (DOCX renderer)

Guide me through typing `rag-service/tests/test_render_docx.py` per **Plan 9 Section 8 Part A**.

- Do NOT write the implementation for me. Section 8 Part C is mine to code-write.
- The TODOs in the test file are mine. Do NOT solve them.
- After I type the tests, run `pytest tests/test_render_docx.py -v` and confirm they fail for the right reason.

Then guide me through implementing `app/render/render_docx.py` (Part C). I'll code-write at normal pace.

Then repeat the same TDD cycle for the other three renderers (PDF, XLSX, JSON).

## What's LOCKED (don't change)

- **Strategies:** DOCX = typeset; PDF = typeset; XLSX = overlay onto source; JSON = canonical structure
- **Libraries:** python-docx (DOCX), reportlab (PDF), openpyxl (XLSX), stdlib json
- **Visual style constants** in `app/render/shared.py`:
  - `NAVY = "#1F2A44"`
  - `AMBER_REVIEW = "#FFEB9C"`
  - `RED_REVIEW = "#B91C1C"`
  - `GREY_CITATION = "#6B7280"`
  - `BODY_FONT = "Calibri"`
  - `BODY_SIZE_PT = 11`
- **Banner condition:** `"all_flagged"` only (other banners deferred)
- **No emoji** in DOCX/PDF/XLSX outputs EXCEPT `⚠` for review badges (single exception for accessibility)
- **No Matrix terminology** in output — `test_no_matrix_terminology_in_output` enforces this per renderer

## File paths to create (in order)

```
rag-service/app/render/__init__.py
rag-service/app/render/shared.py            # style constants + helpers
rag-service/app/render/render_docx.py       # FIRST — most complex, most-shown
rag-service/tests/test_render_docx.py       # FIRST — typed by Tom
rag-service/app/render/render_pdf.py
rag-service/tests/test_render_pdf.py
rag-service/app/render/render_xlsx.py
rag-service/tests/test_render_xlsx.py
rag-service/app/render/render_json.py
rag-service/tests/test_render_json.py
```

## Wire into n8n (after all four renderers green)

Update the n8n workflow to call the renderers in parallel after answer assembly:

```
[Assemble canonical JSON]
       ↓
   ┌───┼───┬───┐
   ↓   ↓   ↓   ↓
 [JSON][DOCX][PDF][XLSX]   (parallel HTTP nodes)
   ↓   ↓   ↓   ↓
   └───┴───┼───┘
           ↓
   [Form response with 4 download links]
```

n8n stores each rendered file in its binary data store and returns a download URL.

## Acceptance

- [ ] All renderer tests pass (~26 across the four modules)
- [ ] Each renderer outputs a valid file (opens cleanly in Word / Excel / Acrobat)
- [ ] Flagged answers visually distinct in each format
- [ ] All-flagged banner appears when triggered
- [ ] No Matrix terminology in any output (per-renderer lint test passes)
- [ ] n8n workflow updated to call all four renderers
- [ ] Smoke test: real Sunflowers run produces 4 valid files
- [ ] Tag `v0.5.0` after all four PRs merged

## Smoke test once everything merged

```bash
# Start the stack
docker compose up

# Trigger a full run via n8n Form Trigger
# (Open http://localhost:5678 in browser, upload Sunflowers PDF)
# Expected: 4 download links, all open as valid files
```

## Failure modes to avoid

- Don't attempt true PDF overlay — locked to typeset for v1 (Section 1 trade-off)
- Don't introduce additional libraries beyond the locked four
- Don't change the style constants — they're the brand
- Don't use emoji except the single `⚠` allowed for accessibility
- Don't skip the no-Matrix-terminology test — it's defence-in-depth against leakage
- Don't write code for the TODOs — those are mine

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 9 + Plan 8 + Plan 1 Section 7a
2. The exact next step (first branch, first file, first content)
3. Any clarifying questions

Then ask me: "Ready to start with `feature/render-docx` and type `test_render_docx.py`?"
