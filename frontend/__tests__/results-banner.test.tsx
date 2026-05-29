import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// Slice 18 (states) — the run-level banner. The Slice 3 adapter surfaces
// summary.banner ("all_failed" | "all_flagged" | null); this presentational
// component renders the matching page-level notice on the Results screen. The
// normal path (banner null) renders nothing, so the page can mount it freely.
//
// What these tests prove: the component renders nothing on the happy path + for
// any unknown value, surfaces an assertive alert when every question failed, and
// a polite status notice (with the design's copy) when every answer was flagged.
// What they do NOT prove: the rendered tone colour / left-border accent — jsdom
// never loads the Tailwind-built stylesheet; that's the Slice 18 browser pass.

import { ResultsBanner } from "@/components/ResultsBanner";

afterEach(cleanup);

describe("ResultsBanner", () => {
  it("renders nothing on the normal path (banner is null)", () => {
    const { container } = render(<ResultsBanner banner={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an unknown banner value", () => {
    const { container } = render(<ResultsBanner banner="something_else" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("surfaces an assertive alert when every question failed", () => {
    render(<ResultsBanner banner="all_failed" />);
    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(/every question failed to generate/i);
  });

  it("surfaces a status notice when every answer was flagged", () => {
    render(<ResultsBanner banner="all_flagged" />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/all answers flagged for review/i);
    expect(banner).toHaveTextContent(/knowledge base/i);
  });
});
