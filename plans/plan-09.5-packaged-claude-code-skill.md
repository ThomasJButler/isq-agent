# Plan 9.5 — Packaged Claude Code Skill (the "Claude expert" walkthrough card)

**Status:** Inserted into the plan order after Plan 9 per Audit 2 + Audit 3 approval. Adds ~4 hours of build time, delivers a unique walkthrough beat no other candidate will have.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1-9 ✅, Plan 10-11 reference this addition

---

## 0. Why this plan exists

Three reasons:

1. **It closes the "Claude expert" gap.** The previous plans use Claude as an API. This plan packages the entire ISQ Agent as a Claude Code skill — installable with `claude skill install isq-agent.skill`. Lee installs it, types "process this ISQ" in any Claude Code chat, and the skill triggers automatically with the uploaded file. That's a "Claude expert" signal, not just a "Claude user" one.

2. **It mirrors JobSearch2026.** The JobSearch2026 system that produced your CV is packaged as five Claude Code skills (cv-generator, cs-apply, form-filler, interview-prep, job-tracker). The ISQ Agent gets the same packaging treatment. That's the JobSearch2026 → ISQ Agent meta-pattern made tangible.

3. **It's a second delivery surface.** The docker-compose stack is the primary deliverable. The packaged skill is a second one. Two ways to consume the same engine. Strong architectural-craft signal.

---

## 1. What this plan does and doesn't do

**Locks in:**
- The Claude Code skill manifest (SKILL.md)
- The scripts folder structure
- The triggers (natural-language phrases that activate the skill)
- The handoff from skill to running rag-service (HTTP call to localhost:8000)
- The packaging step (zipping to `isq-agent.skill`)
- The install + smoke-test instructions
- The walkthrough card the skill enables

**Doesn't yet cover:**
- The Next.js dashboard (separate stretch — see `claude-design-spec.md`)
- Hosted variant (skill needs the rag-service running locally to call)

---

## 2. What a Claude Code skill IS

A `.skill` file is a zipped directory containing:

```
isq-agent/
├── SKILL.md                # the brain — describes what the skill does + when to trigger
├── scripts/                # Python or shell scripts the skill can run
│   ├── process_isq.py      # main entry: takes a file path, calls rag-service, returns results
│   ├── check_health.py     # verifies rag-service is reachable
│   └── reindex_corpus.py   # one-off reindex
├── references/             # supporting docs the skill can read
│   └── service_contract.md # the HTTP contract reference for the skill's calls
└── examples/               # optional sample inputs
    └── sample_isq.pdf      # a known-good test ISQ
```

When zipped and renamed to `.skill`, the file is installable in Claude Code via `claude skill install` or via the Cowork UI's "Save skill" button.

**What this means for the walkthrough:** Lee can install the skill from your GitHub repo, then in any Claude Code chat, type "process the Sunflowers questionnaire" — and the skill triggers, calls your rag-service running locally, and returns the structured results. Zero docker-compose explanation needed; the skill is the demo.

---

## 3. SKILL.md design (the trigger document)

SKILL.md is the most important file. It's what Claude Code reads to decide "should I activate this skill?" Good SKILL.md = the skill triggers reliably when needed.

### Required frontmatter

```yaml
---
name: isq-agent
description: Process Information Security Questionnaires (ISQs) from suppliers. Takes a blank ISQ in PDF or XLSX format, retrieves grounded answers from Northstar Labs policies and historical responses via a RAG pipeline, generates Claude-powered answers with confidence scoring, and produces filled response documents in three formats (DOCX, XLSX overlay, structured JSON). Use this skill whenever the user uploads or refers to an ISQ, vendor security questionnaire, supplier security assessment, or supplier due diligence document. Also triggers on phrases like "process this questionnaire", "answer this ISQ", "fill out this security questionnaire", or "respond to a vendor assessment".
---
```

The description is the trigger surface — it must be specific enough that the skill fires only when wanted, broad enough that it fires when needed. ~1000 characters maximum (Claude Code skill description limit).

### Body of SKILL.md

```markdown
# ISQ Agent

Generate professional, evidence-backed answers to supplier Information Security Questionnaires (ISQs).

## What it does

1. Accepts a blank ISQ in PDF or XLSX format
2. Extracts the questions using Claude with tool-use for guaranteed schema
3. Retrieves relevant policy chunks + historical answers from the indexed knowledge base
4. Generates per-question answers via Claude Sonnet, with strict grounding rules
5. Scores each answer across four dimensions (cites_policy, on_topic, vendor_tone, complete)
6. Flags low-confidence answers as "needs review"
7. Produces three output formats: filled DOCX report, populated XLSX, structured JSON

## When to use

- User uploads a PDF or XLSX questionnaire
- User says "process this ISQ" or similar
- User asks "answer this vendor security assessment"
- User wants to draft responses to a supplier due diligence questionnaire

## Prerequisites

- The ISQ Agent rag-service must be running locally: `cd ~/Repos/isq-agent && docker compose up`
- The corpus must be indexed: `curl -X POST http://localhost:8000/index`
- API keys for Voyage, Anthropic, Pinecone must be configured in `.env`

## How to use

When the user asks to process an ISQ:

1. Run `scripts/check_health.py` to verify rag-service is reachable
2. If unreachable, instruct the user to run `docker compose up` and try again
3. Identify the file path of the ISQ (from user-provided path or uploaded file)
4. Run `scripts/process_isq.py <file_path>` to process it
5. Present the results: number of questions answered, number flagged for review, download links to the three output files, total cost

## Outputs

- `outputs/<filename>_response.docx` — clean DOCX report
- `outputs/<filename>_response.xlsx` — populated XLSX (for XLSX inputs only)
- `outputs/<filename>_response.json` — structured JSON for downstream systems

## Notes

- This skill is a packaged version of the ISQ Agent docker-compose stack
- The same engine also runs as an n8n workflow at http://localhost:5678
- All processing is local-first; nothing leaves your machine except the Anthropic, Voyage, and Pinecone API calls

## See also

- Repo: https://github.com/ThomasJButler/isq-agent
- Architecture: docs/architecture.md
- Walkthrough: docs/walkthrough-script.md
```

---

## 4. Scripts the skill needs

Three scripts. Each is a small Python file that the skill invokes.

### `scripts/check_health.py`

```python
"""Check the rag-service is reachable. Exit 0 if green, non-zero if red."""

import sys
import httpx

try:
    response = httpx.get("http://localhost:8000/health", timeout=5.0)
    response.raise_for_status()
    health = response.json()
    if all(health["dependencies"].values()):
        print("rag-service: OK")
        sys.exit(0)
    else:
        print(f"rag-service unhealthy: {health['dependencies']}")
        sys.exit(2)
except Exception as e:
    print(f"rag-service unreachable: {e}")
    print("Run `cd ~/Repos/isq-agent && docker compose up` and try again.")
    sys.exit(1)
```

### `scripts/process_isq.py`

```python
"""Process a single ISQ file end-to-end. Outputs to ./outputs/."""

import sys
import os
import httpx
import json
from pathlib import Path

if len(sys.argv) != 2:
    print("Usage: process_isq.py <path-to-isq.pdf-or-xlsx>")
    sys.exit(1)

input_path = Path(sys.argv[1])
if not input_path.exists():
    print(f"File not found: {input_path}")
    sys.exit(1)

# Detect format
suffix = input_path.suffix.lower()
if suffix not in [".pdf", ".xlsx"]:
    print(f"Unsupported file type: {suffix}. Use PDF or XLSX.")
    sys.exit(1)

source_format = "pdf" if suffix == ".pdf" else "xlsx"

# 1. Extract questions
print(f"Extracting questions from {input_path.name}...")
with open(input_path, "rb") as f:
    file_bytes = f.read()

# (rag-service expects either source_text for PDF, or source_rows for XLSX;
#  this script does the parsing locally then calls /extract-questions)

# ... rest of orchestration: extract questions, loop answers, assemble, render ...

# 2. Save outputs
output_dir = Path("./outputs")
output_dir.mkdir(exist_ok=True)
# ... write the 3 output files ...

print(f"Done. Outputs in {output_dir.absolute()}")
```

The full process_isq.py is ~80 lines — it orchestrates the same calls the n8n workflow makes, but from a Python script.

### `scripts/reindex_corpus.py`

```python
"""Trigger a corpus reindex on the running rag-service."""

import httpx

response = httpx.post(
    "http://localhost:8000/index",
    json={"force_reindex": True},
    timeout=60.0,
)
print(response.json())
```

---

## 5. The packaging step

Once SKILL.md + scripts/ are written, package via:

```bash
cd ~/Repos/isq-agent/skill
zip -r ../isq-agent.skill isq-agent/
```

The output `isq-agent.skill` file is what Lee downloads + installs.

To install:

```bash
# Option 1: CLI
claude skill install ./isq-agent.skill

# Option 2: GUI (Cowork users)
# Drag the .skill file into the chat → "Save skill" button appears
```

---

## 6. Test plan (TDD-first, as always)

### Tests for the skill (`tests/test_skill_install.py`)

| Test | Verifies |
|---|---|
| `test_skill_md_has_required_frontmatter` | SKILL.md frontmatter has `name`, `description` fields |
| `test_skill_description_under_1000_chars` | Description fits Claude Code limit |
| `test_skill_md_no_matrix_terminology` | Defence-in-depth lint |
| `test_check_health_returns_0_when_green` | Mock /health returns ok → exit 0 |
| `test_check_health_returns_1_when_unreachable` | Mock connection error → exit 1 |
| `test_check_health_returns_2_when_dependencies_down` | Mock /health with degraded deps → exit 2 |
| `test_process_isq_handles_missing_file` | Non-existent file → exit 1 with clear error |
| `test_process_isq_rejects_unsupported_format` | .txt → exit 1 with clear error |
| `test_zip_packaging_produces_valid_skill_file` | `zip -r` output is a valid zip with SKILL.md at root |

Approximately 9 tests. Estimated time: ~45 minutes.

---

## 7. 🖐️ Manual Coding Exercise 8.5 — Type SKILL.md + check_health.py

**Purpose:** SKILL.md is the most important file in this plan. Type it character-by-character so the trigger surface is yours, not boilerplate.

### Part A — type SKILL.md

Type the file from Section 3 above. ~70 lines (frontmatter + markdown).

### Part B — type `scripts/check_health.py`

Type the file from Section 4. ~20 lines.

The other two scripts (process_isq.py, reindex_corpus.py) can be code-written at normal pace — they're more boilerplate-y.

### Part C — write the tests

`tests/test_skill_install.py` per Section 6. ~50 lines.

### Part D — package + install + smoke

```bash
cd ~/Repos/isq-agent/skill
zip -r ../isq-agent.skill isq-agent/
ls -la ../isq-agent.skill  # confirm zip created
```

Install in a fresh Claude Code chat:
```
claude skill install ./isq-agent.skill
```

In that chat:
```
> "process the file at ~/Repos/isq-agent/source-corpus/Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf"
```

The skill should trigger (you'll see `<command-message>The "isq-agent" skill is loading</command-message>`), run process_isq.py, and return the results.

### Acceptance

- [ ] SKILL.md present with frontmatter
- [ ] Description triggers reliably on phrases listed in Section 2
- [ ] check_health.py works (returns appropriate exit codes)
- [ ] process_isq.py orchestrates full pipeline successfully
- [ ] reindex_corpus.py works
- [ ] Tests pass (~9 tests)
- [ ] `isq-agent.skill` packaged
- [ ] Skill installs cleanly in Claude Code
- [ ] End-to-end test passes: install, trigger, get results

---

## 8. The walkthrough card this enables

Section 4 of Plan 10 (live demo) gets a new beat:

> "Quick second demo — I've also packaged this as a Claude Code skill. Let me install it."
>
> [Run `claude skill install ./isq-agent.skill`]
>
> [Open a fresh Claude Code chat]
>
> > process the Sunflowers questionnaire at source-corpus/Sunflowers...pdf
>
> [Skill triggers, runs, returns results]
>
> "Same engine as the docker-compose demo, packaged as a Claude Code skill. Lee, you can install this in your Claude Code right now and it works in any chat where you reference an ISQ. The skill is in the repo, MIT-licenced."

That's 90 seconds of demo time that distinguishes you from every other candidate.

---

## 9. End-of-Plan-9.5 checklist

For the build session (Thursday afternoon or Friday morning):

- [ ] `git checkout -b feature/packaged-skill`
- [ ] Create `skill/isq-agent/SKILL.md` (Manual Coding Exercise 8.5 Part A) — TYPE
- [ ] Create `skill/isq-agent/scripts/check_health.py` — TYPE
- [ ] Create `skill/isq-agent/scripts/process_isq.py` — code-write at normal pace
- [ ] Create `skill/isq-agent/scripts/reindex_corpus.py` — small
- [ ] Create `skill/isq-agent/references/service_contract.md` — copy from docs/architecture.md
- [ ] Write `tests/test_skill_install.py` per Section 6
- [ ] Run pytest, fix any failures
- [ ] Package: `cd skill && zip -r ../isq-agent.skill isq-agent/`
- [ ] Install in fresh Claude Code chat, verify triggers
- [ ] Add to README: "Also available as a Claude Code skill — install from `isq-agent.skill`"
- [ ] Commit: `feat(skill): package ISQ Agent as installable Claude Code skill`
- [ ] PR, self-review, squash-merge

---

## 10. Updates this triggers in other plans

Once Plan 9.5 ships, update:

- **Plan 1 Section 3 (scope):** promote packaged skill from optional to must-have ✓
- **Plan 2 Section 1 (repo structure):** add `/skill/` folder ✓
- **Plan 10 Section 2 (live demo):** add the 90-second skill install + trigger beat
- **Plan 11 Section 1 (README structure):** add "Install as Claude Code skill" section
- **Plan 11 Section 4 (final polish):** add "test skill install end-to-end" to checklist
- **Plan 5 Section 5 (tagging):** v0.6.0 = packaged skill shipped

---

## Git execution block

See `git-conventions.md` for the full reference. The Section 9 checklist is the build steps — this block is the canonical commit + tag sequence.

**Branch:** `feature/packaged-skill`

**Commits (in order):**
1. `test(skill): add tests for skill install and structure` — stages `rag-service/tests/test_skill_install.py`
2. `feat(skill): add SKILL.md and scripts (check_health, process_isq, reindex_corpus)` — stages `skill/isq-agent/SKILL.md`, `skill/isq-agent/scripts/*`, `skill/isq-agent/references/service_contract.md`
3. `docs(readme): document skill install path` — stages updated `README.md`
4. Package: `cd skill && zip -r ../isq-agent.skill isq-agent/`
5. Install in a fresh Claude Code chat — confirm trigger words work end-to-end before pushing.

**Push + PR:**
```bash
git push -u origin feature/packaged-skill
gh pr create --fill
```

**After merge — tag `v0.6.0`:**
```bash
git checkout main && git pull
git tag -a v0.6.0 -m "v0.6.0 — packaged Claude Code skill"
git push origin v0.6.0
```

---

## Plan 9.5 done ✅

Packaged Claude Code skill defined. SKILL.md drafted. Scripts specified. Test plan written first. Manual Coding Exercise 8.5 details the typing exercise. The walkthrough card this enables is locked.

**No questions for Tom on this one — it's locked from prior audit approval.**
