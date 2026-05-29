// Display formatters (Slice 4). Pure, synchronous, and faithful to the
// prototype's inline helpers so the Results mini-stats, the per-answer metrics
// rows, and the ConfidenceBar render identically to the locked design.
// Source: design/.../prototype-hybrid/components.jsx (fmtCost / fmtMs) and the
// bar's own `pct = Math.round(score * 100)`.

/** A USD cost to three decimal places, e.g. `0.078` -> `"$0.078"`. */
export function formatCurrency(usd: number): string {
  return `$${usd.toFixed(3)}`;
}

/**
 * A latency in milliseconds as a human-readable duration:
 *   < 1s -> "<n>ms"     (e.g. 820    -> "820ms")
 *   < 1m -> "<n.n>s"    (e.g. 42180  -> "42.2s")
 *   else -> "<m>m <s>s" (e.g. 125000 -> "2m 5s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/** A 0..1 confidence score as a rounded percentage label, e.g. `0.86` -> `"86%"`. */
export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}
