import type { JSX } from "react";

/** The four confidence dimensions surfaced in the expanded bar's tooltip. The
 *  adapter's `ConfidenceViewModel` (lib/types.ts) flattens these onto the answer,
 *  so it satisfies this shape directly — the bar stays decoupled from lib/types. */
export interface ConfidenceDimensions {
  cites_policy: number;
  on_topic: number;
  vendor_tone: number;
  complete: number;
}

interface ConfidenceBarProps {
  /** 0..1 confidence. A failed answer (confidence: null) renders no bar at all,
   *  so the consumer guards null and this is always a real number here. */
  score: number;
  dimensions?: ConfidenceDimensions;
  compact?: boolean;
}

// Confidence bar ported from the prototype's <ConfidenceBar> (components.jsx:71).
// pct = round(score*100); tone band high >=0.8 / mid >=0.6 / low drives the fill
// colour (success / warning / danger) via the .conf-<tone> class. Compact shows
// the bare pct (the metrics column computes its own labelled NN% via
// formatConfidence where wanted, so the bar deliberately does NOT import it).
// Expanded adds a "confidence" label, a 2-dp score, and the 4-dimension tooltip.
export function ConfidenceBar({
  score,
  dimensions,
  compact = false,
}: ConfidenceBarProps): JSX.Element {
  const pct = Math.round(score * 100);
  const tone = score >= 0.8 ? "high" : score >= 0.6 ? "mid" : "low";
  const classes = `conf conf-${tone}`;

  if (compact) {
    return (
      <span className={classes}>
        <span className="conf-bar">
          <span style={{ width: `${pct}%` }} />
        </span>
        <span>{pct}</span>
      </span>
    );
  }

  const tooltip = dimensions
    ? `cites_policy ${dimensions.cites_policy} · on_topic ${dimensions.on_topic} · vendor_tone ${dimensions.vendor_tone} · complete ${dimensions.complete}`
    : "";

  return (
    <span className={classes} title={tooltip}>
      <span className="muted" style={{ fontSize: 11 }}>
        confidence
      </span>
      <span className="conf-bar">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span>{score.toFixed(2)}</span>
    </span>
  );
}
