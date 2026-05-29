"use client";

import { useEffect, useRef, useState, type CSSProperties, type JSX } from "react";
import { useParams } from "next/navigation";
import { AnswerCard } from "@/components/AnswerCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { Footer } from "@/components/Footer";
import { ResultsBanner } from "@/components/ResultsBanner";
import { Tabs } from "@/components/Tabs";
import { Toast } from "@/components/Toast";
import {
  CheckIcon,
  CopyIcon,
  FileDocxIcon,
  FileJsonIcon,
  FileXlsxIcon,
  RefreshIcon,
  WarningIcon,
} from "@/components/icons";
import { toRunViewModel } from "@/lib/adapter";
import { downloadRender, type RenderFormat } from "@/lib/download";
import { formatConfidence, formatCurrency, formatDuration } from "@/lib/format";
import { MOCK_ENVELOPE } from "@/lib/mock";
import type { RunViewModel } from "@/lib/types";

// Screen 4 — Results. Ported from the prototype's ResultsPage (pages.jsx Screen 4)
// and the LAST Phase D screen. It's the target of the Slice 15 completion
// router.push("/runs/<id>/results"), so building it closes that 404 gap.
//
// THE PAYOFF OF THE SLICE 3 ADAPTER: this is the first screen to consume real
// view-model data. It runs the canonical MOCK_ENVELOPE through toRunViewModel()
// rather than binding to a hand-shaped mock, so the renames / flatten / lift /
// derived top_citations all flow through. The §8 glue swaps MOCK_ENVELOPE for a
// live fetch keyed by the run id; the binding below stays identical.
//
// It's a "use client" page: it reads [id] via useParams() for the header and owns
// the active tab + expanded-answer Set + a download/copy toast. The Citations and
// Metrics tabs deliberately do NOT port the prototype's c.source / c.page /
// c.avg_score / run.stages / token in-out split — the adapter drops all of those
// (no invented page/source, a single token figure, no per-stage timing), so these
// tabs bind only to what the view model actually carries.

// The container gutter (the prototype's .container at maxWidth 1120). Padding
// longhands so per-block paddingTop/Bottom don't mix shorthand + longhand (the
// Landing/Upload/Processing precedent).
const CONTAINER: CSSProperties = {
  maxWidth: 1120,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "var(--gutter)",
  paddingRight: "var(--gutter)",
};

const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

// The view model is a pure transform of a constant envelope, so build it once at
// module scope rather than re-deriving it on every render.
const MODEL = toRunViewModel(MOCK_ENVELOPE);

// A small labelled figure — the prototype's <MiniStat> (pages.jsx:554). Value in
// mono so the columns stay aligned; `warn` tone uses the semantic warning token
// (never a hardcoded orange) for the flagged count.
function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warn";
}): JSX.Element {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          ...MONO,
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: tone === "warn" ? "var(--warning)" : "var(--fg)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// Citations tab — the derived top_citations (one row per unique source, used_in =
// how many answers cite it). The prototype's Source / Page / Avg score columns are
// gone: the adapter invents no page or source filename and derives no avg score,
// so the honest columns are the citation id, its snippet, and the usage count.
function CitationsTab({ model }: { model: RunViewModel }): JSX.Element {
  const cols = "clamp(72px, 18vw, 140px) 1fr clamp(64px, 18vw, 130px)";
  const { top_citations } = model;
  return (
    <Card padding="none" style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--fg-muted)",
          letterSpacing: 0.04,
          textTransform: "uppercase",
        }}
      >
        <span>Citation</span>
        <span>Snippet</span>
        <span style={{ textAlign: "right" }}>Used in</span>
      </div>
      {top_citations.map((c, i) => (
        <div
          key={c.id}
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: 16,
            padding: "14px 20px",
            borderBottom: i === top_citations.length - 1 ? 0 : "1px solid var(--border)",
            fontSize: 13,
            alignItems: "center",
          }}
        >
          <span style={MONO}>{c.id}</span>
          <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {c.snippet}
          </span>
          <span className="muted" style={{ ...MONO, textAlign: "right", fontSize: 12 }}>
            {c.used_in}× question{c.used_in === 1 ? "" : "s"}
          </span>
        </div>
      ))}
    </Card>
  );
}

// Metrics tab — run totals + per-question telemetry, bound to the view model. The
// prototype's "Latency by stage" card and the hardcoded cost-breakdown percentages
// are gone (the backend emits no per-stage timing and the adapter fabricates no
// split); this shows only the real summary figures and the per-answer metrics.
function MetricsTab({ model }: { model: RunViewModel }): JSX.Element {
  const { summary, answers } = model;
  const cols = "48px minmax(120px, 1fr) 80px 90px 80px";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card padding="lg">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Cost and tokens
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          <MiniStat
            label="Total cost"
            value={formatCurrency(summary.total_cost_usd)}
            sub="per ISQ"
          />
          <MiniStat
            label="Total tokens"
            value={summary.total_tokens.toLocaleString()}
            sub="in + out"
          />
          <MiniStat
            label="Total latency"
            value={formatDuration(summary.total_latency_ms)}
            sub="end to end"
          />
          <MiniStat
            label="Avg confidence"
            value={formatConfidence(summary.average_confidence)}
            sub="weighted"
          />
        </div>
      </Card>

      <Card padding="lg">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Per-question telemetry
        </div>
        {/* 5-column table: scroll it inside itself on mobile (the global
            overflow-x:clip guard would otherwise crop the rightmost column). */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 480 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 12,
                padding: "0 4px 8px",
                fontSize: 11,
                color: "var(--fg-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>#</span>
              <span>Question</span>
              <span style={{ textAlign: "right" }}>Conf.</span>
              <span style={{ textAlign: "right" }}>Latency</span>
              <span style={{ textAlign: "right" }}>Cost</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {answers.map((a) => (
                <div
                  key={a.index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: cols,
                    gap: 12,
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 12,
                    alignItems: "center",
                  }}
                >
                  <span className="muted" style={MONO}>
                    Q{String(a.index).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      paddingRight: 12,
                    }}
                  >
                    {a.question}
                  </span>
                  <span style={{ textAlign: "right" }}>
                    {a.confidence ? (
                      <ConfidenceBar score={a.confidence.score} compact />
                    ) : (
                      <span className="muted" style={{ fontSize: 11 }}>
                        n/a
                      </span>
                    )}
                  </span>
                  <span className="muted" style={{ ...MONO, textAlign: "right", fontSize: 11 }}>
                    {formatDuration(a.metrics.latency_ms)}
                  </span>
                  <span className="muted" style={{ ...MONO, textAlign: "right", fontSize: 11 }}>
                    {formatCurrency(a.metrics.cost_usd)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ResultsPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [tab, setTab] = useState("answers");
  // Q01 (a clean answer) + the first flagged question open by default — the
  // prototype's initial state. Parent-owned so a flagged-chip jump can set it.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([1, 6]));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending auto-dismiss on unmount so a late setState can't fire after
  // the page is gone (the test unmounts before the 2.2s timer elapses).
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function toggle(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function jumpToFlagged(index: number) {
    setTab("flagged");
    setExpanded(new Set([index]));
  }

  function copyLink() {
    // The run URL is shareable, so this one is real. The download buttons below
    // POST the canonical envelope to /render (see lib/download).
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    showToast("Run link copied");
  }

  async function handleDownload(format: RenderFormat) {
    showToast(`Preparing ${format.toUpperCase()}…`);
    try {
      await downloadRender(format, MOCK_ENVELOPE);
    } catch {
      showToast("Download failed. Is the backend reachable?");
    }
  }

  const { meta, summary } = MODEL;
  const filtered = tab === "flagged" ? MODEL.answers.filter((a) => a.needs_review) : MODEL.answers;
  const showAnswerList = tab === "answers" || tab === "flagged";

  return (
    <div data-screen-label="04 Results">
      <div style={{ ...CONTAINER, paddingTop: 40, paddingBottom: 24 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Run · {id}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, overflowWrap: "break-word" }}>
              {meta.filename}
            </h1>
            <div
              className="muted"
              style={{
                fontSize: 13,
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span>{meta.origin}</span>
              <span>·</span>
              <span>{meta.total_questions} questions answered</span>
              <span>·</span>
              <span>{summary.flagged_count} flagged for review</span>
              <span>·</span>
              <span>{formatDuration(summary.total_latency_ms)}</span>
              <span>·</span>
              <span>{formatCurrency(summary.total_cost_usd)}</span>
            </div>
          </div>
          <Button href="/upload" variant="ghost" size="sm" leadingIcon={<RefreshIcon size={13} />}>
            New run
          </Button>
        </div>

        {/* Run-level banner — surfaces the adapter's summary.banner
            (all_failed / all_flagged). Renders nothing on the normal path, so
            it's gated here to avoid a stray empty margin. */}
        {summary.banner && (
          <div style={{ marginTop: 16 }}>
            <ResultsBanner banner={summary.banner} />
          </div>
        )}

        {/* Summary + downloads. flex-wrap (not a rigid grid) so the flagged card
            stacks below the deliverables on narrow screens with no media query
            (the Processing precedent); the full responsive pass is Slice 18. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 }}>
          <Card padding="lg" style={{ flex: "2 1 420px", minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Deliverables
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button
                variant="primary"
                leadingIcon={<FileDocxIcon size={14} />}
                onClick={() => handleDownload("docx")}
              >
                Download DOCX
              </Button>
              <Button
                variant="secondary"
                leadingIcon={<FileXlsxIcon size={14} />}
                onClick={() => handleDownload("xlsx")}
              >
                Download XLSX
              </Button>
              <Button
                variant="secondary"
                leadingIcon={<FileJsonIcon size={14} />}
                onClick={() => handleDownload("json")}
              >
                Download JSON
              </Button>
              <Button variant="ghost" leadingIcon={<CopyIcon size={13} />} onClick={copyLink}>
                Copy link
              </Button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12,
                marginTop: 24,
              }}
            >
              <MiniStat
                label="Answered"
                value={`${summary.total_questions - summary.flagged_count}/${summary.total_questions}`}
                sub="auto-cleared"
              />
              <MiniStat
                label="Flagged"
                value={String(summary.flagged_count)}
                sub="needs review"
                tone="warn"
              />
              <MiniStat
                label="Avg conf."
                value={formatConfidence(summary.average_confidence)}
                sub="weighted"
              />
              <MiniStat
                label="Total cost"
                value={formatCurrency(summary.total_cost_usd)}
                sub={`${summary.total_tokens.toLocaleString()} tokens`}
              />
            </div>
          </Card>

          {summary.flagged_count > 0 && (
            <Card
              padding="lg"
              style={{
                flex: "1 1 280px",
                minWidth: 0,
                background: "var(--warning-bg)",
                borderColor: "var(--warning-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ color: "var(--warning)", display: "inline-flex" }}>
                  <WarningIcon size={14} />
                </span>
                <span className="eyebrow" style={{ color: "var(--warning)" }}>
                  Needs review
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                {summary.flagged_count} question{summary.flagged_count === 1 ? "" : "s"} flagged
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                The agent flagged these rather than over-claiming. Open each one to see why.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {summary.flagged_indices.map((i) => (
                  <Button key={i} variant="secondary" size="sm" onClick={() => jumpToFlagged(i)}>
                    Q{String(i).padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 36 }}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "answers", label: "Answers", count: summary.total_questions },
              { id: "flagged", label: "Flagged", count: summary.flagged_count },
              { id: "citations", label: "Citations", count: MODEL.top_citations.length },
              { id: "metrics", label: "Metrics" },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            {showAnswerList && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtered.map((a) => (
                  <AnswerCard
                    key={a.index}
                    answer={a}
                    open={expanded.has(a.index)}
                    onToggle={() => toggle(a.index)}
                  />
                ))}
              </div>
            )}
            {tab === "citations" && <CitationsTab model={MODEL} />}
            {tab === "metrics" && <MetricsTab model={MODEL} />}
          </div>
        </div>
      </div>

      <Footer />

      <div className="toast-wrap">
        {toast && <Toast message={toast} icon={<CheckIcon size={14} />} />}
      </div>
    </div>
  );
}
