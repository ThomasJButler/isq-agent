import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/Card";

// The prototype has no standalone <Card> — it always writes `card card-pad`
// containers (components.jsx / pages.jsx). Card wraps that: base + paper / lift
// variants, padding md (card-pad) / lg (card-pad-lg) / none, and forwards
// className, style, and any other div attribute for the one-off tweaks the
// prototype applies inline (flagged border, warning background, grid-column).

describe("Card", () => {
  it("renders children inside a base card with default (md) padding", () => {
    render(<Card>Body</Card>);
    expect(screen.getByText("Body")).toHaveClass("card", "card-pad");
  });

  it.each([
    ["default", "card"],
    ["paper", "card-paper"],
    ["lift", "card-lift"],
  ] as const)("renders the %s variant", (variant, expectedClass) => {
    render(<Card variant={variant}>Body</Card>);
    expect(screen.getByText("Body")).toHaveClass("card", expectedClass);
  });

  it.each([
    ["md", "card-pad"],
    ["lg", "card-pad-lg"],
  ] as const)("applies the %s padding class", (padding, expectedClass) => {
    render(<Card padding={padding}>Body</Card>);
    expect(screen.getByText("Body")).toHaveClass(expectedClass);
  });

  it("omits padding classes when padding is none", () => {
    render(<Card padding="none">Body</Card>);
    const card = screen.getByText("Body");
    expect(card).toHaveClass("card");
    expect(card).not.toHaveClass("card-pad");
    expect(card).not.toHaveClass("card-pad-lg");
  });

  it("forwards className, style, and arbitrary div attributes", () => {
    render(
      <Card className="extra" style={{ marginTop: 12 }} role="region" aria-label="Stats">
        Body
      </Card>,
    );
    const card = screen.getByText("Body");
    expect(card).toHaveClass("card", "extra");
    expect(card).toHaveStyle({ marginTop: "12px" });
    expect(card).toHaveAttribute("role", "region");
    expect(card).toHaveAttribute("aria-label", "Stats");
  });
});
