import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// The Landing page (app/page.tsx) is a presentational SERVER component — no
// hooks, no router. Its two hero CTAs are <Button href> anchors (one to /upload,
// one to the same-page #how-it-works fragment), so it renders directly with NO
// next/navigation or next/link mock (the Phase D / plan-12 §13 "may need no mock
// at all" note). What this proves: the screen's content + link contract + that
// the single allowed home for orange (the Powered-by-Claude badge) is present.
// What it does NOT prove: rendered visuals (the ribbon gradient, the pill fills,
// smooth scroll) — that's the Slice 17 audit + the Slice 18 browser pass, since
// jsdom never loads the Tailwind-built stylesheet.

import Home from "@/app/page";

afterEach(cleanup);

describe("Landing — hero", () => {
  it("renders the eyebrow, headline, and lede", () => {
    render(<Home />);
    expect(screen.getByText("ISQ Agent · v1.0")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /answer supplier security questionnaires with grounded ai/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/retrieves answers from your policies/i)).toBeInTheDocument();
  });

  it("links the primary CTA to /upload and the secondary CTA to the how-it-works section", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /upload questionnaire/i })).toHaveAttribute(
      "href",
      "/upload",
    );
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
  });

  it("wraps the hero in the landing-only river ribbon", () => {
    const { container } = render(<Home />);
    expect(container.querySelector(".river-ribbon")).not.toBeNull();
  });
});

describe("Landing — product snapshot", () => {
  it("shows a sample result titled with a middle dot, never an em dash", () => {
    render(<Home />);
    const title = screen.getByText(/Sunflowers Charity/);
    expect(title).toHaveTextContent("Sunflowers Charity · ISQ");
    expect(title.textContent).not.toContain("—");
  });
});

describe("Landing — how it works", () => {
  it("renders the section with the id the hero CTA targets, plus its heading", () => {
    const { container } = render(<Home />);
    expect(container.querySelector("#how-it-works")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: /three steps/i })).toBeInTheDocument();
  });

  it("renders the three steps", () => {
    render(<Home />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Ground & answer")).toBeInTheDocument();
    expect(screen.getByText("Deliver")).toBeInTheDocument();
  });

  it("renders the grounded-not-generative honesty strip", () => {
    render(<Home />);
    expect(screen.getByText("Grounded, not generative.")).toBeInTheDocument();
    expect(screen.getByText(/every answer cites the policy chunks/i)).toBeInTheDocument();
  });
});

describe("Landing — footer", () => {
  it("renders the Powered by Claude badge (the one allowed home for orange)", () => {
    render(<Home />);
    const badge = screen.getByText("Powered by Claude");
    expect(badge).toHaveClass("badge-claude");
    expect(screen.getByText(/Built with Claude · Tom Butler · MIT/)).toBeInTheDocument();
  });
});
