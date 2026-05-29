import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline, type TimelineStepData } from "@/components/Timeline";

// Timeline composes the prototype's <TimelineStep> (components.jsx:232) inside the
// .timeline rail. Each step carries a state — done / active / pending — which the
// ported CSS turns into the dot styling and the active-dot pulse (tl-pulse). The
// pulse itself is a keyframe (covered by `npm run build`, frozen by the global
// prefers-reduced-motion rule); jsdom can only see the state class that drives it.
const STEPS: TimelineStepData[] = [
  { title: "Document uploaded", sub: "sunflowers.pdf · received 19:30", state: "done" },
  { title: "Questions extracted", sub: "20 questions found", state: "done" },
  { title: "Answering", sub: "Answering 12 of 20", state: "active" },
  { title: "Rendering outputs", sub: "DOCX · XLSX · JSON", state: "pending" },
  { title: "Done", sub: "Awaiting", state: "pending" },
];

describe("Timeline", () => {
  it("renders a step for every entry, in order", () => {
    const { container } = render(<Timeline steps={STEPS} />);
    expect(container.querySelectorAll(".tl-step")).toHaveLength(5);
    for (const step of STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it("applies the matching state class to each step", () => {
    const { container } = render(<Timeline steps={STEPS} />);
    const steps = container.querySelectorAll(".tl-step");
    expect(steps[0]).toHaveClass("tl-step", "done");
    expect(steps[2]).toHaveClass("tl-step", "active");
    expect(steps[3]).toHaveClass("tl-step", "pending");
  });

  it("renders the sub text when given", () => {
    render(<Timeline steps={STEPS} />);
    expect(screen.getByText("Answering 12 of 20")).toBeInTheDocument();
  });

  it("marks the active step's dot — the pulse target — so the CSS can animate it", () => {
    const { container } = render(<Timeline steps={STEPS} />);
    const active = container.querySelector(".tl-step.active");
    expect(active).not.toBeNull();
    expect(active?.querySelector(".tl-dot")).not.toBeNull();
  });

  it("shows a check glyph in a done step but not in a pending step", () => {
    const { container } = render(<Timeline steps={STEPS} />);
    expect(container.querySelector(".tl-step.done svg")).not.toBeNull();
    expect(container.querySelector(".tl-step.pending svg")).toBeNull();
  });
});
