import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The /runs/[id] processing page is a "use client" page: it reads the route param
// via useParams() and drives a polling stub off a single setInterval, then calls
// useRouter().push to route to the results screen when the pipeline finishes.
// jsdom has no app router mounted, so we mock next/navigation the same way the
// Slice 12 settings + Slice 14 upload tests did — asserting the page's OWN
// contract, not real routing (covered by `npm run build` + the Slice 18 browser
// pass). push is hoisted so the vi.mock factory can close over it. The stub is
// timer-driven, so the suite uses fake timers and advances them deterministically.
//
// What these tests prove: the screen reads + displays the run id, renders the five
// pipeline steps, the polling stub advances the stages (extraction -> answering)
// and counts answered questions up, and completion routes to /runs/<id>/results
// exactly once. What they do NOT prove: rendered visuals (the active-dot pulse,
// the progress fill, the river-blue badge) — jsdom never loads the Tailwind-built
// stylesheet; that is the Slice 17 audit + the Slice 18 browser pass.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sunflowers-charity-isq" }),
  useRouter: () => ({ push }),
}));

import ProcessingPage from "@/app/runs/[id]/page";

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe("ProcessingPage — structure", () => {
  it("renders the run id, a humanized title, and the five pipeline steps", () => {
    render(<ProcessingPage />);
    expect(screen.getByText("Run · sunflowers-charity-isq")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sunflowers Charity ISQ" })).toBeInTheDocument();
    expect(screen.getByText("Document uploaded")).toBeInTheDocument();
    expect(screen.getByText("Questions extracted")).toBeInTheDocument();
    expect(screen.getByText("Rendering outputs")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("starts in the Processing state and has not routed yet", () => {
    render(<ProcessingPage />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("ProcessingPage — the polling stub advances the pipeline", () => {
  it("marks questions extracted after the first stage", () => {
    render(<ProcessingPage />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText(/20 questions found/)).toBeInTheDocument();
  });

  it("counts answered questions up and ticks the elapsed clock", () => {
    render(<ProcessingPage />);
    act(() => {
      vi.advanceTimersByTime(3900);
    });
    expect(screen.getByText("10 / 20")).toBeInTheDocument();
    expect(screen.getByText("Answering 10 of 20")).toBeInTheDocument();
    expect(screen.getByText("3.9s")).toBeInTheDocument();
  });
});

describe("ProcessingPage — completion routes to results", () => {
  it("pushes to the run's results route exactly once when the pipeline finishes", () => {
    render(<ProcessingPage />);
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/runs/sunflowers-charity-isq/results");
  });

  it("drops the Processing badge and shows the redirect note when done", () => {
    render(<ProcessingPage />);
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.queryByText("Processing")).not.toBeInTheDocument();
    expect(screen.getByText(/Redirecting to results/)).toBeInTheDocument();
  });
});
