import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ribbon } from "@/components/Ribbon";

// Ribbon is the hybrid design's signature: a diagonal river-blue backdrop behind
// the landing hero (prototype pages.jsx Screen 1 + the .river-ribbon CSS in
// tokens.css). It wraps hero content and paints two skewed gradient fills behind
// it. The skew / gradient / blur are CSS that `npm run build` covers and jsdom
// can't see — these tests pin the component's OWN contract: the container class,
// the two decorative aria-hidden fills, the subtle variant, that the wrapped
// content stays reachable, and that arbitrary div attributes forward through.
//
// It is landing-ONLY by design, but the consuming screen enforces that, not the
// component — the primitive stays page-agnostic so it can be dropped from the
// landing screen without touching anything else (Slice 17 tweak #2 flags it as
// the "AI-blob" risk to stress-test and remove if it reads as a blob).

describe("Ribbon", () => {
  it("renders its children", () => {
    render(
      <Ribbon>
        <h1>Answer supplier security questionnaires</h1>
      </Ribbon>,
    );
    expect(
      screen.getByRole("heading", { name: /answer supplier security questionnaires/i }),
    ).toBeInTheDocument();
  });

  it("carries the river-ribbon container class", () => {
    const { container } = render(<Ribbon>hero</Ribbon>);
    expect(container.querySelector(".river-ribbon")).not.toBeNull();
  });

  it("renders exactly two decorative fills, both aria-hidden", () => {
    const { container } = render(<Ribbon>hero</Ribbon>);
    const fills = container.querySelectorAll(".river-ribbon-fill");
    expect(fills).toHaveLength(2);
    for (const fill of fills) {
      expect(fill).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("gives the two fills their distinct variant classes", () => {
    const { container } = render(<Ribbon>hero</Ribbon>);
    expect(container.querySelector(".river-ribbon-fill-1")).not.toBeNull();
    expect(container.querySelector(".river-ribbon-fill-2")).not.toBeNull();
  });

  it("keeps the decoration out of the accessibility tree — only children are reachable", () => {
    const { container } = render(<Ribbon>visible hero copy</Ribbon>);
    expect(screen.getByText("visible hero copy")).toBeInTheDocument();
    // The fills carry no text and are aria-hidden, so the wrapped content is the
    // only thing the ribbon contributes to the accessibility tree.
    for (const fill of container.querySelectorAll(".river-ribbon-fill")) {
      expect(fill).toBeEmptyDOMElement();
    }
  });

  it("adds the subtle modifier only when asked", () => {
    const { container, rerender } = render(<Ribbon>hero</Ribbon>);
    expect(container.querySelector(".river-ribbon")).not.toHaveClass("subtle");
    rerender(<Ribbon subtle>hero</Ribbon>);
    expect(container.querySelector(".river-ribbon")).toHaveClass("subtle");
  });

  it("forwards className and arbitrary div attributes", () => {
    const { container } = render(
      <Ribbon className="hero-bg" data-screen="landing">
        hero
      </Ribbon>,
    );
    const root = container.querySelector(".river-ribbon");
    expect(root).toHaveClass("river-ribbon", "hero-bg");
    expect(root).toHaveAttribute("data-screen", "landing");
  });
});
