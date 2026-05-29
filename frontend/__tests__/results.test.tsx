import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Slice 16 — the /runs/[id]/results screen, the LAST Phase D page and the first
// consumer of real view-model data: it binds to toRunViewModel(MOCK_ENVELOPE)
// (the Slice 3 adapter's payoff). It's a "use client" page that reads [id] via
// useParams() for the header and owns the active tab + expanded-answer Set + a
// download/copy toast, so the test mocks next/navigation (useParams -> { id }) the
// same way Slices 12/14/15 did. "New run" is a Button href anchor, so no useRouter
// mock is needed (the Slice 14 finding: Next 16 anchors render in jsdom unmocked).
//
// What these tests prove: the screen reads + shows the run id, the run summary +
// three download stubs (each firing a toast), the four tabs (Answers / Flagged /
// Citations / Metrics) filtering and binding onto the view model, the flagged
// summary card jumping to a flagged answer, and the collapsible answer rows. What
// they do NOT prove: rendered visuals (the blue tab underline, the amber flagged
// border, the confidence-bar fills) — jsdom never loads the Tailwind-built
// stylesheet; that is the Slice 17 audit + the Slice 18 browser pass.
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sunflowers-charity-isq" }),
}));

import ResultsPage from "@/app/runs/[id]/results/page";

afterEach(cleanup);

describe("ResultsPage — header + deliverables", () => {
  it("shows the run id eyebrow and the filename heading", () => {
    render(<ResultsPage />);
    expect(screen.getByText("Run · sunflowers-charity-isq")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Sunflowers_Charity_Supplier_ISQ_Questionnaire\.pdf/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the three download buttons", () => {
    render(<ResultsPage />);
    expect(screen.getByRole("button", { name: /Download DOCX/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download XLSX/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download JSON/i })).toBeInTheDocument();
  });

  it("shows the answered + cost mini-stats from the view model", () => {
    render(<ResultsPage />);
    expect(screen.getByText("18/20")).toBeInTheDocument(); // 20 total - 2 flagged
    // $0.078 = formatCurrency(total_cost_usd); shown in both the header summary
    // line and the deliverables "Total cost" mini-stat.
    expect(screen.getAllByText("$0.078").length).toBeGreaterThan(0);
  });
});

describe("ResultsPage — download stubs surface a toast", () => {
  it("shows a polite toast when a download is clicked", () => {
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Download DOCX/i }));
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent(/Preparing DOCX/i);
  });
});

describe("ResultsPage — flagged summary", () => {
  it("summarises the flagged questions and links to each one", () => {
    render(<ResultsPage />);
    expect(screen.getByText("2 questions flagged")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Q06" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Q11" })).toBeInTheDocument();
  });

  it("jumps to the flagged tab and expands the answer when a chip is clicked", () => {
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Q06" }));
    // Flagged tab is now selected...
    expect(screen.getByRole("tab", { name: /Flagged/ })).toHaveAttribute("aria-selected", "true");
    // ...and Q06's expanded body shows its review reason (unique to the open card).
    expect(screen.getByText(/scope-limitation statement/i)).toBeInTheDocument();
  });
});

describe("ResultsPage — tabs", () => {
  it("defaults to the Answers tab listing every question", () => {
    render(<ResultsPage />);
    expect(screen.getByRole("tab", { name: /Answers/ })).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByText("Do you maintain a formal Information Security Policy?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Is multi-factor authentication (MFA) enforced for staff access to business systems?",
      ),
    ).toBeInTheDocument();
  });

  it("filters to only the flagged answers on the Flagged tab", () => {
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Flagged/ }));
    // Both flagged questions are present...
    expect(
      screen.getByText("How is privileged access to operational technology (OT) controlled?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "What are your Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for critical SCADA-connected services?",
      ),
    ).toBeInTheDocument();
    // ...a clean answer is filtered out.
    expect(
      screen.queryByText(
        "Is multi-factor authentication (MFA) enforced for staff access to business systems?",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows the derived top citations on the Citations tab", () => {
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Citations/ }));
    // ISP §8.6 is cited by two answers (Q12 + Q19) -> derived used_in 2.
    expect(screen.getByText("ISP §8.6")).toBeInTheDocument();
    expect(screen.getAllByText(/2× questions/).length).toBeGreaterThan(0);
    // The answer cards are not rendered on the citations tab.
    expect(
      screen.queryByText("Do you maintain a formal Information Security Policy?"),
    ).not.toBeInTheDocument();
  });

  it("shows per-question telemetry on the Metrics tab", () => {
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Metrics/ }));
    expect(screen.getByText("Per-question telemetry")).toBeInTheDocument();
  });
});

describe("ResultsPage — collapsible answers", () => {
  it("collapses an answer that starts expanded", () => {
    render(<ResultsPage />);
    // Q01 starts open, so its answer body is visible.
    expect(screen.getByText(/approved by senior leadership/i)).toBeInTheDocument();
    const toggle = screen.getByRole("button", {
      name: /Do you maintain a formal Information Security Policy/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/approved by senior leadership/i)).not.toBeInTheDocument();
  });
});
