"use client";

import { type CSSProperties, type JSX } from "react";
import { Card } from "@/components/Card";
import { Timeline, type TimelineStepData, type TimelineStepState } from "@/components/Timeline";
import { ClockIcon, HashIcon, SparkIcon, ZapIcon } from "@/components/icons";
import { formatCurrency, formatDuration } from "@/lib/format";

// The processing pipeline showcase: a vertical Timeline beside live counter tiles, with an
// activity log below. Shared by the /upload submitting state (embedded, while the real run
// is in flight) and available for the /runs/[id] route.
//
// PRESENTATIONAL + deterministic: the stage, the answered counter and the progress are all
// DERIVED from `elapsed` (pure functions, no Date/Math.random) so it is SSR-safe and
// test-stable. The consumer owns the clock and the navigation.
//
// HONESTY: POST /runs answers the whole questionnaire in one blocking call and does not
// stream per-question progress, so this is an indicative loading animation, not live data.
// The activity log uses generic stage lines — no fabricated confidence scores, costs, or
// per-question verdicts that could be mistaken for the real run's output. Pass
// `maxStage={2}` so the embedded version holds at "answering" rather than claiming the run
// is rendered/done before the real envelope arrives.

const T_EXTRACTED = 600;
const T_ANSWERING = 1200;
const ANS_START = 1400;
const ANS_DUR = 5000;
const T_RENDER = 6600;
const T_DONE = 8000;

// When run standalone, the consumer redirects to results around here.
export const SHOWCASE_REDIRECT_MS = 9000;

const COST_PER_Q = 0.0042; // ~Sonnet per-question, indicative only

export function showcaseStage(ms: number, maxStage = 4): number {
  let s = 0;
  if (ms >= T_DONE) s = 4;
  else if (ms >= T_RENDER) s = 3;
  else if (ms >= T_ANSWERING) s = 2;
  else if (ms >= T_EXTRACTED) s = 1;
  return Math.min(maxStage, s);
}

function answeredOf(ms: number, total: number): number {
  const v = Math.floor(((ms - ANS_START) / ANS_DUR) * total);
  return Math.max(0, Math.min(total, v));
}

const MONO_LABEL: CSSProperties = { fontSize: 11, fontFamily: "var(--font-mono)" };

interface StatProps {
  icon: JSX.Element;
  label: string;
  value: string;
  sub: string;
}

// A counter tile (the prototype's <Stat>). Value in mono so the column stays aligned as
// digits change.
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

// A generic, honest activity log — stage descriptions, not fabricated per-question results.
function ActivityLog({
  stage,
  answered,
  total,
  requestId,
}: {
  stage: number;
  answered: number;
  total: number;
  requestId?: string;
}): JSX.Element {
  const lines = [
    "POST /extract-questions · reading the document and pulling out the questions",
    `answering ${Math.min(answered + (stage >= 2 ? 1 : 0), total)} of ${total} · retrieve, ground, generate per question`,
    "retrieving matching policy chunks from the knowledge base",
    "scoring each answer's confidence and flagging weak ones for review",
    "POST /render · assembling DOCX, XLSX and JSON",
  ];
  const limit = stage <= 1 ? 1 : stage === 2 ? 3 : stage === 3 ? 5 : 5;
  return (
    <>
      {lines.slice(0, limit).map((line) => (
        <div key={line}>{line}</div>
      ))}
      {stage < 4 && (
        <div style={{ color: "var(--river-blue)" }}>
          ▎ working{requestId ? ` · X-Request-Id ${requestId}` : ""}…
        </div>
      )}
    </>
  );
}

export interface ProcessingShowcaseProps {
  /** Elapsed milliseconds since the run started (the consumer's clock). */
  elapsed: number;
  /** Total questions; the answered counter climbs toward this. */
  total?: number;
  /** Optional run/file label shown above the pipeline. */
  runLabel?: string;
  /** Correlation id surfaced in the activity log, if known. */
  requestId?: string;
  /**
   * Cap the pipeline stage. The embedded (real-run) consumer passes 2 so the animation
   * holds at "answering" rather than claiming "rendered/done" before the real envelope
   * arrives; the standalone demo route uses the default 4.
   */
  maxStage?: number;
}

export function ProcessingShowcase({
  elapsed,
  total = 20,
  runLabel,
  requestId,
  maxStage = 4,
}: ProcessingShowcaseProps): JSX.Element {
  const stage = showcaseStage(elapsed, maxStage);
  const answered = answeredOf(elapsed, total);
  const held = maxStage <= 2; // embedded: holds at answering until the parent navigates

  const stateOf = (idx: number): TimelineStepState =>
    stage > idx ? "done" : stage === idx ? "active" : "pending";

  const steps: TimelineStepData[] = [
    { title: "Document received", sub: "Queued for processing", state: "done" },
    {
      title: "Questions extracted",
      sub: stage >= 1 ? `${total} questions found` : "Claude tool-use · structured JSON",
      state: stateOf(1),
    },
    {
      title: stage >= 2 ? `Answering ${answered} of ${total}` : "Answering",
      sub:
        stage === 2
          ? "Retrieve · ground in policy · generate per question"
          : stage > 2
            ? `${total} questions answered`
            : "Retrieve · ground · generate per question",
      state: stateOf(2),
    },
    { title: "Rendering outputs", sub: "DOCX · XLSX · JSON", state: stateOf(3) },
    {
      title: "Done",
      sub: stage >= 4 ? "Redirecting to results…" : "Awaiting",
      state: stateOf(4),
    },
  ];

  // While held at "answering", keep the bar climbing toward (but short of) full so it reads
  // as in-progress rather than complete.
  const progress = held
    ? Math.min(92, ((answered / total) * 0.85 + 0.1) * 100)
    : stage >= 4
      ? 100
      : Math.min(100, ((answered / total) * 0.8 + stage * 0.05) * 100);

  return (
    <div>
      {runLabel && (
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Answering your questionnaire
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {runLabel}
          </h1>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "3 1 380px", minWidth: 0 }}>
          <Card padding="lg">
            <div className="eyebrow" style={{ marginBottom: 18 }}>
              Pipeline
            </div>
            <Timeline steps={steps} />

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

        <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Stat
            icon={<HashIcon size={13} />}
            label="Answered"
            value={`${answered} / ${total}`}
            sub={`${total - answered} to go`}
          />
          <Stat
            icon={<ZapIcon size={13} />}
            label="Est. cost"
            value={formatCurrency(COST_PER_Q * answered)}
            sub="indicative · ~$0.004/q"
          />
          <Stat
            icon={<ClockIcon size={13} />}
            label="Elapsed"
            value={formatDuration(elapsed)}
            sub="Most ISQs finish in ~a minute"
          />
          <Stat
            icon={<SparkIcon size={13} />}
            label="Grounding"
            value="policies"
            sub="answers cite the source chunk"
          />
        </div>
      </div>

      <Card padding="none" style={{ marginTop: 20, overflow: "hidden" }}>
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Activity
        </div>
        <div
          style={{
            padding: "12px 16px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--fg-muted)",
            maxHeight: 150,
            overflowY: "auto",
            overflowWrap: "anywhere",
            lineHeight: 1.8,
          }}
        >
          <ActivityLog stage={stage} answered={answered} total={total} requestId={requestId} />
        </div>
      </Card>
    </div>
  );
}
