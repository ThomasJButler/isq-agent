import { describe, expect, it } from "vitest";

import { formatConfidence, formatCurrency, formatDuration } from "@/lib/format";

// Slice 4 — display formatters. These are the source of truth for how the
// Results mini-stats, the metrics rows, and the ConfidenceBar render figures,
// so the tests pin each function to the prototype's exact output
// (design/.../prototype-hybrid/components.jsx: fmtCost / fmtMs + the bar's pct).
// Values are taken from the real mock envelope (data.js) where possible.

describe("formatCurrency", () => {
  // Prototype: `$${usd.toFixed(3)}` — USD, always three decimals.
  it("renders a USD value to three decimal places", () => {
    expect(formatCurrency(0.078)).toBe("$0.078");
  });

  it("rounds to three decimals", () => {
    expect(formatCurrency(0.0042)).toBe("$0.004");
    expect(formatCurrency(0.0046)).toBe("$0.005");
  });

  it("keeps trailing zeros so the column stays aligned", () => {
    expect(formatCurrency(0)).toBe("$0.000");
    expect(formatCurrency(1.5)).toBe("$1.500");
  });
});

describe("formatDuration", () => {
  // Prototype fmtMs: < 1s -> "<n>ms"; < 1m -> "<n.n>s"; else -> "<m>m <s>s".
  it("renders sub-second values in milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(820)).toBe("820ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("renders sub-minute values in seconds to one decimal", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1820)).toBe("1.8s");
    expect(formatDuration(42180)).toBe("42.2s"); // total_latency_ms from data.js
    expect(formatDuration(59000)).toBe("59.0s");
  });

  it("renders a minute or more as minutes and whole seconds", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(125000)).toBe("2m 5s");
  });
});

describe("formatConfidence", () => {
  // The score is 0..1; the human-facing label is a rounded percentage,
  // matching the bar's own `pct = Math.round(score * 100)` plus the unit.
  it("renders a 0..1 score as a rounded percentage", () => {
    expect(formatConfidence(0.86)).toBe("86%"); // average_confidence from data.js
    expect(formatConfidence(0.51)).toBe("51%");
  });

  it("clamps the readable bounds", () => {
    expect(formatConfidence(0)).toBe("0%");
    expect(formatConfidence(1)).toBe("100%");
  });

  it("rounds to the nearest whole percent", () => {
    expect(formatConfidence(0.934)).toBe("93%");
    expect(formatConfidence(0.935)).toBe("94%");
  });
});
