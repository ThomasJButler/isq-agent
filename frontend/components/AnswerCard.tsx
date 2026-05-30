"use client";

import type { JSX } from "react";
import { Badge } from "@/components/Badge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { formatCurrency, formatDuration } from "@/lib/format";
import type { AnswerViewModel, ConfidenceViewModel } from "@/lib/types";

// Inline line-art icons (prototype icons.jsx chevronRight / warning / bookmark).
// Inlined per the established primitive convention — no shared icon set yet.
function ChevronRightIcon(): JSX.Element {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function WarningIcon(): JSX.Element {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

function BookmarkIcon(): JSX.Element {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

// Per-dimension confidence breakdown (prototype DimBreakdown, pages.jsx:637). The
// four weighted dimensions come flattened on the view model's ConfidenceViewModel,
// so it takes that shape directly. Each dim's tone (success / warning / danger)
// mirrors the ConfidenceBar's bands; semantic vars only, never Crail orange.
const DIMENSIONS = [
  { key: "cites_policy", weight: 0.4 },
  { key: "on_topic", weight: 0.25 },
  { key: "vendor_tone", weight: 0.2 },
  { key: "complete", weight: 0.15 },
] as const;

function DimBreakdown({ confidence }: { confidence: ConfidenceViewModel }): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {DIMENSIONS.map((dim) => {
        const value = confidence[dim.key];
        const tone =
          value >= 0.8 ? "var(--success)" : value >= 0.5 ? "var(--warning)" : "var(--error)";
        return (
          <div
            key={dim.key}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr 40px",
              gap: 8,
              alignItems: "center",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="muted">
              {dim.key} <span style={{ color: "var(--fg-subtle)" }}>×{dim.weight.toFixed(2)}</span>
            </span>
            <span className="conf-bar" style={{ width: "100%" }}>
              <span style={{ width: `${value * 100}%`, background: tone }} />
            </span>
            <span style={{ textAlign: "right", color: tone }}>{value.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

interface AnswerCardProps {
  answer: AnswerViewModel;
  /** Whether the card is expanded. Parent-owned (the Results screen tracks a Set). */
  open: boolean;
  onToggle: () => void;
}

// Collapsible answer row for the Results screen, ported from the prototype's
// <AnswerCard> (pages.jsx:563) but bound to the adapter's AnswerViewModel: a flagged
// answer reads `needs_review` / `review_reason` from the TOP level (not nested in
// confidence), confidence is nullable (a failed answer shows no score bar), and a
// citation is { id, snippet } — the snippet is the tooltip, with no invented
// page/source. The outer is a raw styled `.card` (not the Card primitive) because it
// layers a flagged warning background and a `data-flagged` hook that a generic Card
// wouldn't carry — the same hand-styled div the prototype writes.
export function AnswerCard({ answer, open, onToggle }: AnswerCardProps): JSX.Element {
  const flagged = answer.needs_review;
  const confidence = answer.confidence;

  return (
    <div
      className="card"
      data-flagged={flagged ? "true" : undefined}
      style={{
        padding: 0,
        background: flagged ? "var(--warning-bg)" : "var(--surface)",
        transition: "background 200ms var(--ease)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "16px 20px",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span className="muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
          Q{String(answer.index).padStart(2, "0")}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: "var(--fg)" }}>
          {answer.question}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          {flagged && (
            <Badge variant="warning" leadingIcon={<WarningIcon />}>
              Review
            </Badge>
          )}
          {confidence && <ConfidenceBar score={confidence.score} dimensions={confidence} compact />}
          <span
            style={{
              color: "var(--fg-subtle)",
              display: "inline-flex",
              transition: "transform 200ms var(--ease)",
              transform: open ? "rotate(90deg)" : "none",
            }}
          >
            <ChevronRightIcon />
          </span>
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 20px 20px 20px", animation: "fadein 200ms var(--ease)" }}>
          <div
            className="t-serif pretty"
            style={{ paddingTop: 6, paddingLeft: 44, color: "var(--fg)" }}
          >
            {answer.answer}
          </div>

          {flagged && answer.review_reason && (
            <div
              style={{
                paddingLeft: 44,
                marginTop: 12,
                fontSize: 12,
                color: "var(--warning)",
                fontStyle: "italic",
                lineHeight: 1.55,
              }}
            >
              {answer.review_reason}
            </div>
          )}

          <div
            style={{
              paddingLeft: 44,
              marginTop: 18,
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {answer.citations.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                  CITATIONS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {answer.citations.map((citation) => (
                    <span
                      key={citation.id}
                      title={citation.snippet}
                      className="badge badge-default"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <BookmarkIcon /> {citation.id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {confidence && (
              <div style={{ minWidth: 0 }}>
                <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                  CONFIDENCE BREAKDOWN
                </div>
                <DimBreakdown confidence={confidence} />
              </div>
            )}

            <div style={{ minWidth: 130 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                METRICS
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-muted)",
                  lineHeight: 1.7,
                }}
              >
                <div>
                  {formatCurrency(answer.metrics.cost_usd)} ·{" "}
                  {formatDuration(answer.metrics.latency_ms)}
                </div>
                <div>
                  {answer.metrics.tokens_in.toLocaleString()} in /{" "}
                  {answer.metrics.tokens_out.toLocaleString()} out
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
