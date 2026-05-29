import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceBar } from "@/components/ConfidenceBar";

// ConfidenceBar ported from the prototype (components.jsx:71): pct = round(score*100),
// tone band high >=0.8 / mid >=0.6 / low. Compact shows the bare pct (no unit);
// expanded adds a "confidence" label, a 2-dp score, and a 4-dimension tooltip
// (cites_policy / on_topic / vendor_tone / complete) on the wrapper's `title`.
// A failed answer (confidence: null) renders NO bar — the consumer guards null,
// so the bar's `score` is always a real number here.

const DIMENSIONS = {
  cites_policy: 0.9,
  on_topic: 0.8,
  vendor_tone: 0.7,
  complete: 0.95,
};

describe("ConfidenceBar", () => {
  it("renders the rounded percentage with no unit in compact mode", () => {
    const { container } = render(<ConfidenceBar score={0.86} compact />);
    expect(screen.getByText("86")).toBeInTheDocument();
    // The fill width reflects the score, not just a static bar.
    expect(container.querySelector(".conf-bar > span")).toHaveStyle({ width: "86%" });
  });

  it("omits the 'confidence' label in compact mode", () => {
    render(<ConfidenceBar score={0.86} compact />);
    expect(screen.queryByText("confidence")).toBeNull();
  });

  it.each([
    [0.92, "conf-high"],
    [0.8, "conf-high"],
    [0.6, "conf-mid"],
    [0.59, "conf-low"],
    [0.2, "conf-low"],
  ] as const)("maps score %s to the %s tone band", (score, toneClass) => {
    const { container } = render(<ConfidenceBar score={score} compact />);
    expect(container.querySelector(".conf")).toHaveClass("conf", toneClass);
  });

  it("renders a 2-dp score and the 'confidence' label when expanded", () => {
    render(<ConfidenceBar score={0.86} dimensions={DIMENSIONS} />);
    expect(screen.getByText("confidence")).toBeInTheDocument();
    expect(screen.getByText("0.86")).toBeInTheDocument();
  });

  it("exposes the four confidence dimensions in the tooltip when expanded", () => {
    const { container } = render(<ConfidenceBar score={0.86} dimensions={DIMENSIONS} />);
    expect(container.querySelector(".conf")).toHaveAttribute(
      "title",
      "cites_policy 0.9 · on_topic 0.8 · vendor_tone 0.7 · complete 0.95",
    );
  });

  it("falls back to an empty tooltip when no dimensions are given", () => {
    const { container } = render(<ConfidenceBar score={0.86} />);
    expect(container.querySelector(".conf")).toHaveAttribute("title", "");
  });
});
