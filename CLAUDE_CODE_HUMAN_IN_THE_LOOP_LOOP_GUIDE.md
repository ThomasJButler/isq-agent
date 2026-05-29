# Claude Code Human-In-The-Loop Loop Guide

This note describes a shareable pattern for making a Claude Code loop easier to scan, easier to review, and more useful for learning.

It is separate from the Codex guide because the core idea is portable, but the CLI shape and event format are different.

## Goal

The goal is to keep the speed benefits of an agent loop without losing track of:

- why the agent chose a path
- what evidence it gathered
- what it learned before editing
- what its validation actually proved

In practice, the structure is the same:

1. run the agent in a non-interactive or headless way
2. save the raw structured output
3. render a readable live stream for the human
4. keep prompts repo-local
5. keep planning state repo-local
6. bias the prompts toward narrated decisions, not just actions

## What to keep repo-local

For a Claude Code repo, the useful bundle is:

- `CLAUDE.md`
- `PROMPT_plan.md`
- `PROMPT_build.md`
- `IMPLEMENTATION_PLAN.md`
- a loop wrapper such as `loop.sh`
- a Claude-specific stream renderer such as `scripts/render_claude_stream.py`
- this guide or an equivalent repo note

## Core idea

Do not force yourself to choose between:

- machine-readable logs
- human-readable live output

Keep both.

The wrapper should:

1. run Claude Code in headless mode
2. save the raw structured stream to disk
3. pipe the same stream through a small renderer for the terminal
4. save the final assistant response separately if the CLI supports it

## Starter pack

If you want a minimal reusable bundle, start with:

- `loop.sh`
- `PROMPT_plan.md`
- `PROMPT_build.md`
- `PROMPT_coach.md`
- `IMPLEMENTATION_PLAN.md`
- `CLAUDE.md`
- `scripts/render_claude_stream.py`

This folder now includes a generic `loop.sh` template you can copy into a repo and adapt.

### Minimal coach prompt

```text
Operate in coach mode for this run.

Before each investigation batch, explain:
- what you are checking
- why this is the right next step
- what evidence you expect

After each investigation batch, explain:
- what you learned
- what changed in your understanding
- what you will do next

Before editing, explain:
- which files you will edit
- what behavior you intend to change
- the main invariant or regression you must preserve

During validation, explain:
- what the validation proves
- what it does not prove

Keep these summaries concise and decision-focused.
Do not expose private chain-of-thought.
Do expose visible decision summaries, assumptions, evidence, and tradeoffs.
```

### Renderer contract

Your renderer only needs to surface:

- assistant progress messages
- command starts
- command pass/fail
- short failure excerpts
- changed-file notices
- final summary location

That is enough to make a raw structured stream readable.

## Conceptual wrapper shape

This is the pattern, not a guaranteed exact command line for every Claude Code version:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${1:-PROMPT_build.md}"
RUN_DIR=".claude-run"
STAMP="$(date +%Y%m%d-%H%M%S)"
JSON_PATH="$RUN_DIR/run-$STAMP.jsonl"

mkdir -p "$RUN_DIR"

claude -p "$(cat "$PROMPT_FILE")" \
  --output-format stream-json \
  | tee "$JSON_PATH" \
  | python3 -u scripts/render_claude_stream.py
```

The exact flags may change by Claude Code version. Verify them locally before adopting the pattern.

## What the renderer should show

A good Claude renderer should reduce the raw event stream into:

- assistant progress messages
- command start lines
- command success/failure lines
- short failure excerpts
- changed-file notices
- final summary location

That is enough to follow the loop live without drowning in raw event payloads.

## What the prompts should require

To make the loop teach as it works, the prompt should explicitly require short narrated summaries.

### Before investigation batches

Require the assistant to explain:

- what it is checking
- why it is checking it now
- what evidence it expects to gather

### After investigation batches

Require the assistant to explain:

- what it learned
- what changed in its understanding
- what it will do next

### Before edits

Require the assistant to explain:

- which files it will edit
- what behavior it intends to change
- the main invariant or regression risk it must preserve

### During validation

Require the assistant to explain:

- what the validation proves
- what it does not prove

### During longer slices

Require occasional checkpoints with:

- current goal
- confirmed facts
- remaining uncertainty
- next action

## Example prompt add-on

This pattern can be appended to a Claude Code build prompt:

```text
Operate in coach mode for this run.

Before each investigation batch, explain:
- what you are checking
- why this is the right next step
- what evidence you expect

After each investigation batch, explain:
- what you learned
- what changed in your understanding
- what you will do next

Before editing, explain:
- which files you will edit
- what behavior you intend to change
- the main invariant or regression you must preserve

During validation, explain:
- what the validation proves
- what it does not prove

Keep these summaries concise and decision-focused.
Do not expose private chain-of-thought.
Do expose visible decision summaries, assumptions, evidence, and tradeoffs.
```

## Human-in-the-loop modes

These are the same control patterns that work well for most agent loops:

### 1. Readable autopilot

The loop runs automatically, but narrates its decisions more clearly.

### 2. Checkpoint approval

The loop pauses after major checkpoints so you can decide whether to continue.

### 3. Pre-edit approval

The loop explores first and pauses before any file changes.

### 4. One-slice loops

The loop performs one bounded slice, then stops for review.

If your goal is learning, Mode 4 is usually the safest default.

## Why this helps

Without this pattern, you often end up with:

- `git diff`
- `git log`
- a vague memory of what the agent did

With this pattern, you also get:

- a live decision trail
- evidence-aware validation summaries
- a clearer mental model of why the change happened

## Practical warning

Do not ask for hidden chain-of-thought.

The useful thing is not private reasoning. The useful thing is a clean visible record of:

- decisions
- assumptions
- evidence
- constraints
- risks

That is enough to learn from the loop without making the transcript noisy or inappropriate.

## Verification step

Before adopting this in another Claude Code repo, verify the current CLI locally. A good first check is whatever local help command your installed version exposes, such as:

```bash
claude --help
```

Then confirm the current structured-output and headless flags before wiring the wrapper.
