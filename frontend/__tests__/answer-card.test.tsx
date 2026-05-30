import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AnswerCard } from "@/components/AnswerCard";
import type { AnswerViewModel } from "@/lib/types";

// AnswerCard binds to the adapter's AnswerViewModel (lib/types.ts), NOT the
// prototype mock: needs_review / review_reason are lifted to the top level,
// confidence is nullable (a failed answer renders no score bar), and citations
// are { id, snippet } with no page/source. The card is collapsible — the parent
// owns `open` and toggles via onToggle — and the flagged variant gets the amber
// warning background (data-flagged hook) plus the review reason when expanded.

const ANSWER: AnswerViewModel = {
  index: 1,
  question: "How is customer data encrypted at rest?",
  answer: "All customer data is encrypted at rest using AES-256.",
  citations: [
    { id: "pol-sec-012", snippet: "Data at rest is encrypted with AES-256." },
    { id: "isq-2023-04", snippet: "We use AES-256 for storage encryption." },
  ],
  confidence: { score: 0.93, cites_policy: 1, on_topic: 0.95, vendor_tone: 0.9, complete: 0.88 },
  needs_review: false,
  review_reason: null,
  failed: false,
  metrics: { tokens_in: 1820, tokens_out: 240, cost_usd: 0.0042, latency_ms: 1820 },
};

const FLAGGED: AnswerViewModel = {
  ...ANSWER,
  index: 6,
  question: "How is privileged access to operational technology (OT) controlled?",
  answer: "Northstar Labs is software-only and does not operate OT.",
  confidence: { score: 0.55, cites_policy: 0.6, on_topic: 0.4, vendor_tone: 0.7, complete: 0.5 },
  needs_review: true,
  review_reason: "Out of scope: Northstar Labs is software-only.",
};

const FAILED: AnswerViewModel = {
  ...ANSWER,
  index: 9,
  answer: "",
  citations: [],
  confidence: null,
  needs_review: true,
  review_reason: "Generation failed",
  failed: true,
};

describe("AnswerCard", () => {
  it("shows the zero-padded question number and the question when collapsed", () => {
    render(<AnswerCard answer={ANSWER} open={false} onToggle={() => {}} />);
    expect(screen.getByText("Q01")).toBeInTheDocument();
    expect(screen.getByText(ANSWER.question)).toBeInTheDocument();
  });

  it("keeps the body, citations and review reason out of the DOM until expanded", () => {
    render(<AnswerCard answer={FLAGGED} open={false} onToggle={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(FLAGGED.answer)).toBeNull();
    expect(screen.queryByText(FLAGGED.review_reason as string)).toBeNull();
  });

  it("reveals the answer body and aria-expanded=true when open", () => {
    render(<AnswerCard answer={ANSWER} open onToggle={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(ANSWER.answer)).toBeInTheDocument();
  });

  it("calls onToggle when the header is clicked", () => {
    const onToggle = vi.fn();
    render(<AnswerCard answer={ANSWER} open={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders the compact confidence bar and no Review badge for a clean answer", () => {
    const { container } = render(<AnswerCard answer={ANSWER} open onToggle={() => {}} />);
    expect(container.querySelector(".conf")).not.toBeNull();
    expect(screen.getByText("93")).toBeInTheDocument(); // compact pct
    expect(screen.queryByText("Review")).toBeNull();
    expect(container.querySelector("[data-flagged='true']")).toBeNull();
  });

  it("flags the amber variant: Review badge, data-flagged hook, and the reason when open", () => {
    const { container } = render(<AnswerCard answer={FLAGGED} open onToggle={() => {}} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(container.querySelector("[data-flagged='true']")).not.toBeNull();
    expect(screen.getByText(FLAGGED.review_reason as string)).toBeInTheDocument();
  });

  it("renders the citation ids with the snippet as a tooltip (no invented page/source)", () => {
    render(<AnswerCard answer={ANSWER} open onToggle={() => {}} />);
    const cite = screen.getByText("pol-sec-012");
    expect(cite).toBeInTheDocument();
    expect(cite).toHaveAttribute("title", "Data at rest is encrypted with AES-256.");
  });

  it("renders the answer body in the serif reading face (tweak #5)", () => {
    const { container } = render(<AnswerCard answer={ANSWER} open onToggle={() => {}} />);
    expect(container.querySelector(".t-serif")).not.toBeNull();
  });

  it("handles a failed answer (confidence null): no score bar, flagged, reason shown", () => {
    const { container } = render(<AnswerCard answer={FAILED} open onToggle={() => {}} />);
    expect(container.querySelector(".conf")).toBeNull(); // no score bar
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(container.querySelector("[data-flagged='true']")).not.toBeNull();
    expect(screen.getByText("Generation failed")).toBeInTheDocument();
  });
});
