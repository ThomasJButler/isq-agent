import type { JSX, ReactNode } from "react";

export type TimelineStepState = "done" | "active" | "pending";

export interface TimelineStepData {
  title: string;
  sub?: ReactNode;
  state: TimelineStepState;
}

// Small check glyph for a completed step (prototype <I.check size={12} stroke={2.4}>).
// Inlined like the other primitives' icons — there's no shared icon set yet, so an
// abstraction here would be speculative.
function CheckIcon(): JSX.Element {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

interface TimelineStepProps {
  state: TimelineStepState;
  title: string;
  sub?: ReactNode;
  /** Trims the trailing padding so the rail ends cleanly on the last step. */
  last?: boolean;
}

// One step of the pipeline rail (prototype components.jsx:232). The dot shows a
// check when done, a filled dot when active (the .tl-step.active CSS pulses it),
// and nothing when pending. Purely presentational — no client directive needed.
export function TimelineStep({ state, title, sub, last }: TimelineStepProps): JSX.Element {
  return (
    <div className={`tl-step ${state}`} style={last ? { paddingBottom: 0 } : undefined}>
      <span className="tl-dot" aria-hidden="true">
        {state === "done" ? (
          <CheckIcon />
        ) : state === "active" ? (
          <span style={{ width: 6, height: 6, background: "currentColor", borderRadius: "50%" }} />
        ) : null}
      </span>
      <div style={{ flex: 1 }}>
        <div className="tl-title">{title}</div>
        {sub != null && <div className="tl-sub">{sub}</div>}
      </div>
    </div>
  );
}

interface TimelineProps {
  steps: TimelineStepData[];
}

// The vertical pipeline timeline the Processing screen (Slice 15) drives. Maps each
// step to a TimelineStep inside the .timeline rail and marks the final one `last`.
// The active step's dot pulses via the .tl-step.active .tl-dot keyframe (tl-pulse),
// which the global prefers-reduced-motion rule freezes.
export function Timeline({ steps }: TimelineProps): JSX.Element {
  return (
    <div className="timeline">
      {steps.map((step, i) => (
        <TimelineStep
          key={step.title}
          state={step.state}
          title={step.title}
          sub={step.sub}
          last={i === steps.length - 1}
        />
      ))}
    </div>
  );
}
