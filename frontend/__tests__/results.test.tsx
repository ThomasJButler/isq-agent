import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Slice 16 + v1.1 live-fetch — the /runs/[id]/results screen now fetches its run from
// GET /runs/{id} (lib/api.fetchRun) instead of binding a build-time mock. The tests stub
// fetch to return the canonical MOCK_ENVELOPE so the live path renders the same data the
// Slice 3 adapter contract pins; assertions await the async fetch via renderReady().
// useParams is mocked the way Slices 12/14/15 did — the id drives the run URL + eyebrow.
// "New run" is a Button href anchor, so no useRouter mock is needed.
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sunflowers-charity-isq" }),
}));

import ResultsPage from "@/app/runs/[id]/results/page";
import { MOCK_ENVELOPE } from "@/lib/mock";

function stubFetch(impl?: () => Promise<unknown>) {
  const fetchMock = vi.fn(
    impl ?? (async () => ({ ok: true, status: 200, json: async () => MOCK_ENVELOPE })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Render and wait for the live fetch to resolve into the ready view (the run-id eyebrow
// only appears once the fetch succeeds).
async function renderReady() {
  render(<ResultsPage />);
  await screen.findByText("Run · sunflowers-charity-isq");
}

beforeEach(() => stubFetch());
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("ResultsPage — header + deliverables", () => {
  it("shows the run id eyebrow and the filename heading", async () => {
    await renderReady();
    expect(screen.getByText("Run · sunflowers-charity-isq")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Sunflowers_Charity_Supplier_ISQ_Questionnaire\.pdf/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the three download buttons", async () => {
    await renderReady();
    expect(screen.getByRole("button", { name: /Download DOCX/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download XLSX/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download JSON/i })).toBeInTheDocument();
  });

  it("shows the answered + cost mini-stats from the fetched view model", async () => {
    await renderReady();
    expect(screen.getByText("18/20")).toBeInTheDocument(); // 20 total - 2 flagged
    expect(screen.getAllByText("$0.078").length).toBeGreaterThan(0);
  });
});

describe("ResultsPage — live-fetch states", () => {
  it("shows a not-found state when the run 404s", async () => {
    stubFetch(async () => ({ ok: false, status: 404, json: async () => ({ detail: "no run" }) }));
    render(<ResultsPage />);
    expect(await screen.findByText("Run not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New questionnaire/i })).toBeInTheDocument();
  });

  it("shows an error state when the backend errors", async () => {
    stubFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    render(<ResultsPage />);
    expect(await screen.findByText("Couldn't load this run")).toBeInTheDocument();
  });
});

describe("ResultsPage — download stubs surface a toast", () => {
  it("shows a polite toast when a download is clicked", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /Download DOCX/i }));
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent(/Preparing DOCX/i);
  });
});

describe("ResultsPage — flagged summary", () => {
  it("summarises the flagged questions and links to each one", async () => {
    await renderReady();
    expect(screen.getByText("2 questions flagged")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Q06" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Q11" })).toBeInTheDocument();
  });

  it("jumps to the flagged tab and expands the answer when a chip is clicked", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Q06" }));
    expect(screen.getByRole("tab", { name: /Flagged/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/scope-limitation statement/i)).toBeInTheDocument();
  });
});

describe("ResultsPage — tabs", () => {
  it("defaults to the Answers tab listing every question", async () => {
    await renderReady();
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

  it("filters to only the flagged answers on the Flagged tab", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("tab", { name: /Flagged/ }));
    expect(
      screen.getByText("How is privileged access to operational technology (OT) controlled?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "What are your Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for critical SCADA-connected services?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Is multi-factor authentication (MFA) enforced for staff access to business systems?",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows the derived top citations on the Citations tab", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("tab", { name: /Citations/ }));
    expect(screen.getByText("ISP §8.6")).toBeInTheDocument();
    expect(screen.getAllByText(/2× questions/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Do you maintain a formal Information Security Policy?"),
    ).not.toBeInTheDocument();
  });

  it("shows per-question telemetry on the Metrics tab", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("tab", { name: /Metrics/ }));
    expect(screen.getByText("Per-question telemetry")).toBeInTheDocument();
  });
});

describe("ResultsPage — collapsible answers", () => {
  it("collapses an answer that starts expanded", async () => {
    await renderReady();
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
