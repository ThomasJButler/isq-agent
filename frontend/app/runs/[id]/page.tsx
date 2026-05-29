"use client";

import { useEffect, useRef, useState, type CSSProperties, type JSX } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Spinner } from "@/components/Spinner";
import { Timeline, type TimelineStepData, type TimelineStepState } from "@/components/Timeline";
import { ArrowRightIcon, ClockIcon, HashIcon, SparkIcon, ZapIcon } from "@/components/icons";
import { formatCurrency, formatDuration } from "@/lib/format";

// Screen 3 — Processing. Ported from the prototype's ProcessingPage (pages.jsx
// Screen 3): a vertical pipeline Timeline (Slice 10) running beside live counter
// tiles, with an activity log below. It's the target of the Slice 14 upload
// submit's router.push("/runs/<id>") — building it removes that click->404 gap.
//
// It's a "use client" page: it reads the route param via useParams() and owns the
// timer that drives the pipeline, so the render test mocks next/navigation
// (useParams -> { id }, useRouter -> { push }) and uses fake timers.
//
// POLLING STUB: a single setInterval acts as the poll. Each tick advances an
// elapsed clock; the stage, the answered counter, and the progress are DERIVED
// from elapsed (pure functions below), so the whole pipeline is reproducible and
// fake-timer-testable — no performance.now / Math.random / Date, which would make
// it non-deterministic and break SSR. The §8 glue replaces the interval body with
// a real fetch against the rag-service run status and swaps the canned numbers for
// the live envelope; the screen's shape stays the same.

const TOTAL = 20; // questions in the stub run
const STEP_MS = 100; // poll cadence

// Stage thresholds (ms of elapsed time). 0 uploaded, 1 extracted, 2 answering,
// 3 rendering, 4 done; the run redirects to results shortly after "done".
const T_EXTRACTED = 600;
const T_ANSWERING = 1200;
const ANS_START = 1400; // answered counter starts climbing here
const ANS_DUR = 5000; // ...and reaches TOTAL over this window
const T_RENDER = 6600;
const T_DONE = 8000;
const T_REDIRECT = 9000;

const AVG_CONFIDENCE = 0.86; // illustrative aggregate for the stub (no live data)
const COST_PER_Q = 0.0042; // ~Sonnet 4.5 per-question cost, matching the prototype

function stageOf(ms: number): number {
  if (ms >= T_DONE) return 4;
  if (ms >= T_RENDER) return 3;
  if (ms >= T_ANSWERING) return 2;
  if (ms >= T_EXTRACTED) return 1;
  return 0;
}

function answeredOf(ms: number): number {
  const v = Math.floor(((ms - ANS_START) / ANS_DUR) * TOTAL);
  return Math.max(0, Math.min(TOTAL, v));
}

// Turn the URL slug back into a readable title (the run id is the Slice 14
// filename slug until the §8 glue carries the backend's real filename). "isq" is
// the one domain acronym worth upper-casing; everything else is title-cased.
function humanizeRunId(id: string): string {
  const title = id
    .split("-")
    .filter(Boolean)
    .map((word) =>
      word.toLowerCase() === "isq" ? "ISQ" : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
  return title || "Processing run";
}

// The container gutter (the prototype's .container at maxWidth 980). Padding
// longhands so per-block paddingTop/paddingBottom don't mix shorthand + longhand
// (the Landing/Upload precedent).
const CONTAINER: CSSProperties = {
  maxWidth: 980,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "var(--gutter)",
  paddingRight: "var(--gutter)",
};

const MONO_LABEL: CSSProperties = { fontSize: 11, fontFamily: "var(--font-mono)" };

interface StatProps {
  icon: JSX.Element;
  label: string;
  value: string;
  sub: string;
}

// A counter tile — the prototype's <Stat> (components.jsx:245), built on the
// Slice 8 Card. Value in mono so the column stays aligned as digits change.
function Stat({ icon, label, value, sub }: StatProps): JSX.Element {
  return (
    <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 88 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--fg-muted)", display: "inline-flex" }}>{icon}</span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </div>
      <div className="muted" style={{ fontSize: 11 }}>
        {sub}
      </div>
    </Card>
  );
}

// The "Answering" step's sub-line while it runs: which question + which RAG
// sub-stage. Derived from `answered` so it's deterministic (no random).
function RunningStages({ answered }: { answered: number }): JSX.Element {
  const subStages = ["embed", "vector_search", "generate", "confidence"];
  const idx = answered % subStages.length;
  return (
    <span>
      Q{String(answered + 1).padStart(2, "0")} · stage{" "}
      <span style={{ color: "var(--fg)" }}>{subStages[idx]}</span>
    </span>
  );
}

// A believable streamed activity log, revealed line-by-line as the run advances.
// Canned illustrative output (the stub has no live backend) — the §8 glue swaps
// in the real streamed lines. The trailing "working…" cursor uses river-blue, NOT
// the prototype's var(--accent) (which resolves to Crail orange — a design leak).
function ActivityLog({
  stage,
  answered,
  runId,
}: {
  stage: number;
  answered: number;
  runId: string;
}): JSX.Element {
  const lines = [
    "POST /extract-questions → 200 · 20 questions parsed (412ms)",
    "POST /answer Q01 → 200 · cites_policy=1.0 · conf=0.93 (1820ms)",
    "POST /answer Q02 → 200 · cites_policy=1.0 · conf=0.91 (1640ms)",
    "POST /answer Q06 → 200 · cites_policy=0.6 · review=true (2140ms)",
    "POST /answer Q11 → 200 · cites_policy=0.55 · review=true (2230ms)",
    "POST /answer Q20 → 200 · cites_policy=1.0 · conf=0.90 (1660ms)",
    "render(docx) ✓ · render(xlsx) ✓ · render(json) ✓",
    `run ${runId} complete · 2 flagged · $0.078 · 42s`,
  ];
  const limit =
    stage <= 1 ? 1 : stage === 2 ? Math.min(5, 1 + Math.floor(answered / 4)) : stage === 3 ? 7 : 8;
  return (
    <>
      {lines.slice(0, limit).map((line, i) => (
        <div key={line}>
          <span
            style={{ color: "var(--fg-subtle)" }}
          >{`19:30:${String(i * 5).padStart(2, "0")}`}</span>{" "}
          {line}
        </div>
      ))}
      {stage < 4 && (
        <div style={{ color: "var(--river-blue)" }}>
          <span style={{ color: "var(--fg-subtle)" }}>
            {`19:30:${String(20 + answered).padStart(2, "0")}`}
          </span>{" "}
          ▎ working…
        </div>
      )}
    </>
  );
}

export default function ProcessingPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(0); // accumulates outside React state to dodge stale closures
  const redirectedRef = useRef(false); // routes to results at most once

  useEffect(() => {
    // The poll: advance the elapsed clock, mirror it into state to re-render, and
    // route to results once the run finishes. tickRef (not a stale `elapsed`
    // closure) is the source of truth, and redirectedRef guarantees a single push
    // even if the effect re-subscribes. The real router reference is stable, so in
    // the app this runs once; the cleanup clears the interval on unmount.
    const clock = setInterval(() => {
      tickRef.current += STEP_MS;
      const t = tickRef.current;
      setElapsed(t);
      if (t >= T_REDIRECT && !redirectedRef.current) {
        redirectedRef.current = true;
        clearInterval(clock);
        router.push(`/runs/${id}/results`);
      }
    }, STEP_MS);
    return () => clearInterval(clock);
  }, [id, router]);

  const stage = stageOf(elapsed);
  const answered = answeredOf(elapsed);
  const title = humanizeRunId(id);

  const stateOf = (idx: number): TimelineStepState =>
    stage > idx ? "done" : stage === idx ? "active" : "pending";

  const steps: TimelineStepData[] = [
    { title: "Document uploaded", sub: "Received and queued", state: "done" },
    {
      title: "Questions extracted",
      sub: stage >= 1 ? `${TOTAL} questions found` : "Claude tool-use · structured JSON",
      state: stateOf(1),
    },
    {
      title: stage >= 2 ? `Answering ${answered} of ${TOTAL}` : "Answering",
      sub:
        stage === 2 ? (
          <RunningStages answered={answered} />
        ) : stage > 2 ? (
          `${TOTAL} questions answered · avg confidence ${AVG_CONFIDENCE.toFixed(2)}`
        ) : (
          "Retrieve · ground · generate per question"
        ),
      state: stateOf(2),
    },
    { title: "Rendering outputs", sub: "DOCX · XLSX · JSON", state: stateOf(3) },
    {
      title: "Done",
      sub: stage >= 4 ? "Redirecting to results…" : "Awaiting",
      state: stateOf(4),
    },
  ];

  const progress =
    stage >= 4 ? 100 : Math.min(100, ((answered / TOTAL) * 0.8 + stage * 0.05) * 100);

  return (
    <div data-screen-label="03 Processing">
      <div style={{ ...CONTAINER, paddingTop: 40, paddingBottom: 64 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/upload"
            className="muted"
            style={{
              fontSize: 12,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowRightIcon size={11} style={{ transform: "scaleX(-1)" }} /> Upload
          </Link>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-end",
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Run · {id}
              </div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </h1>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }} aria-live="polite">
              {stage < 4 ? (
                <Badge
                  variant="accent"
                  leadingIcon={
                    // The badge text ("Processing") is the announcement; the
                    // Spinner's own role="status" would double-announce inside the
                    // aria-live region, so it's wrapped aria-hidden (upload precedent).
                    <span aria-hidden="true" style={{ display: "inline-flex" }}>
                      <Spinner size={9} />
                    </span>
                  }
                >
                  Processing
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Done
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Timeline + live counters. flex-wrap (not a rigid grid) so the counter
            column stacks below the timeline on narrow screens with no media query
            (the Landing auto-fit precedent); the full responsive pass is Slice 18. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
          <div style={{ flex: "3 1 420px", minWidth: 0 }}>
            <Card padding="lg">
              <div className="eyebrow" style={{ marginBottom: 18 }}>
                Pipeline
              </div>
              <Timeline steps={steps} />

              {/* Overall progress bar */}
              <div style={{ marginTop: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="muted" style={MONO_LABEL}>
                    Overall
                  </span>
                  <span className="muted" style={MONO_LABEL}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </Card>
          </div>

          <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Stat
              icon={<HashIcon size={13} />}
              label="Answered"
              value={`${answered} / ${TOTAL}`}
              sub={`${TOTAL - answered} remaining`}
            />
            <Stat
              icon={<SparkIcon size={13} />}
              label="Avg confidence"
              value={answered > 0 ? AVG_CONFIDENCE.toFixed(2) : "0.00"}
              sub="weighted across 4 dims"
            />
            <Stat
              icon={<ZapIcon size={13} />}
              label="Est. cost"
              value={formatCurrency(COST_PER_Q * answered)}
              sub="Sonnet 4.5 · ~$0.004/q"
            />
            <Stat
              icon={<ClockIcon size={13} />}
              label="Elapsed"
              value={formatDuration(elapsed)}
              sub={stage >= 4 ? "Complete" : "Live"}
            />
          </div>
        </div>

        {/* Activity log */}
        <Card padding="none" style={{ marginTop: 24, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500 }}>Activity</div>
            <div className="muted" style={{ ...MONO_LABEL, minWidth: 0, overflowWrap: "anywhere" }}>
              X-Request-Id: {id}
            </div>
          </div>
          <div
            style={{
              padding: "12px 18px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-muted)",
              maxHeight: 160,
              overflowY: "auto",
              overflowWrap: "anywhere",
              lineHeight: 1.8,
            }}
          >
            <ActivityLog stage={stage} answered={answered} runId={id} />
          </div>
        </Card>
      </div>
    </div>
  );
}
