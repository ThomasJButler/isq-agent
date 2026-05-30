import type { CSSProperties, ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { Footer } from "@/components/Footer";
import { Ribbon } from "@/components/Ribbon";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  DownloadIcon,
  SearchIcon,
  UploadIcon,
  WarningIcon,
} from "@/components/icons";

// Screen 1 — Landing. The first consumer of the Slice 11 Ribbon (landing ONLY —
// never mount it on an inner screen; that rule lives with the consuming screen,
// not the primitive) and the screen that replaces the create-next-app scaffold.
// Ported from the prototype's LandingPage (pages.jsx Screen 1).
//
// It's a presentational SERVER component: the two hero CTAs are Button `href`
// anchors — one to /upload, one to the same-page #how-it-works fragment that
// scrolls (smooth scroll lives in globals.css, reduced-motion-guarded) — so the
// page needs no "use client", no router, and no test mock. Deliberate divergences
// from the prototype, all to honour the locked design + Tom's voice:
//   - the prototype's `variant="accent"` (Crail orange) CTA → `variant="primary"`
//     (the black-pill CTA); `accent` isn't even in the Button variant union.
//   - the sample result title's em dash → a middle dot (em dashes are banned).
// The TopBar is inherited from app/layout.tsx (Slice 12); the Footer carries the
// one allowed home for orange (the Powered-by-Claude badge).
//
// Follow-up (not this slice): the /upload CTA is a plain anchor (full navigation)
// because /upload lands in Slice 14. It can become a next/link for client-side
// nav once that route exists — matching the TopBar's nav links.

// Shared page gutter. Longhands (not the `padding` shorthand) so the per-section
// paddingTop/paddingBottom below don't mix shorthand + longhand in one style.
const CONTAINER: CSSProperties = {
  maxWidth: 1200,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "var(--gutter)",
  paddingRight: "var(--gutter)",
};

const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

interface SnapshotRow {
  q: number;
  txt: string;
  confidence: number;
  flag?: boolean;
}

// The restrained "product snapshot" in the hero — a static preview, not live data.
const SNAPSHOT_ROWS: SnapshotRow[] = [
  { q: 1, txt: "Do you maintain a formal Information Security Policy?", confidence: 0.93 },
  { q: 4, txt: "Do you encrypt customer data at rest and in transit?", confidence: 0.95 },
  {
    q: 6,
    txt: "How is privileged access to operational technology (OT) controlled?",
    confidence: 0.55,
    flag: true,
  },
];

interface Step {
  n: string;
  title: string;
  desc: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Upload",
    desc: "Drop a questionnaire as PDF or XLSX, or forward it from your inbox.",
    icon: <UploadIcon size={18} />,
  },
  {
    n: "02",
    title: "Ground & answer",
    desc: "Claude extracts the questions, retrieves the relevant policy chunks, and writes a vendor-tone answer per item.",
    icon: <SearchIcon size={18} />,
  },
  {
    n: "03",
    title: "Deliver",
    desc: "Download a filled DOCX, a structured JSON, or the original XLSX with answers written back in.",
    icon: <DownloadIcon size={18} />,
  },
];

export default function Home() {
  return (
    <div data-screen-label="01 Landing">
      {/* Hero — wrapped in the landing-only diagonal river ribbon. */}
      <Ribbon>
        <section style={{ ...CONTAINER, paddingTop: 96, paddingBottom: 64 }}>
          <div style={{ maxWidth: 760 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>
              ISQ Agent · v1.0
            </div>
            <h1
              className="pretty"
              style={{
                margin: "0 0 18px",
                maxWidth: 720,
                fontSize: "clamp(28px, 8vw, 44px)",
                lineHeight: 1.1,
                overflowWrap: "break-word",
              }}
            >
              Answer supplier security questionnaires with grounded AI.
            </h1>
            <p
              className="muted pretty"
              style={{ fontSize: 17, lineHeight: 1.55, margin: "0 0 32px", maxWidth: 640 }}
            >
              Upload a questionnaire. The agent retrieves answers from your policies and historical
              responses, flags anything that needs a human, and outputs three deliverable formats.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                flexWrap: "wrap",
              }}
            >
              <Button
                href="/upload"
                variant="primary"
                size="lg"
                trailingIcon={<ArrowRightIcon size={14} />}
              >
                Upload questionnaire
              </Button>
              <Button
                href="#how-it-works"
                variant="ghost"
                size="lg"
                trailingIcon={<ArrowDownIcon size={13} />}
              >
                How it works
              </Button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 16, marginBottom: 0 }}>
              Free to use right now, no API key needed. I&apos;m covering the costs for a limited
              time, so have a go while it&apos;s open.
            </p>
          </div>

          {/* Inline product snapshot — small, restrained, static. */}
          <Card padding="none" style={{ marginTop: 64, overflow: "hidden", maxWidth: 880 }}>
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--bg)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--border-strong)",
                  }}
                />
              ))}
              <span
                className="muted"
                style={{ ...MONO, fontSize: 11, marginLeft: 8, overflowWrap: "anywhere" }}
              >
                isq-agent.local · /runs/sun-20260525-001/results
              </span>
            </div>
            <div style={{ padding: "22px 28px" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    className="muted"
                    style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.4 }}
                  >
                    RESULT
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
                    Sunflowers Charity · ISQ
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <Badge variant="success" dot>
                    Done · 42s
                  </Badge>
                  <Badge variant="warning" leadingIcon={<WarningIcon size={11} />}>
                    2 flagged
                  </Badge>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: "var(--space-2)",
                  flexWrap: "wrap",
                }}
              >
                {SNAPSHOT_ROWS.map((r) => (
                  <Card
                    key={r.q}
                    padding="md"
                    style={{
                      flex: "1 1 240px",
                      borderLeftWidth: r.flag ? 3 : 1,
                      borderLeftColor: r.flag ? "var(--warning)" : undefined,
                      background: r.flag ? "var(--warning-bg)" : "var(--surface)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span className="muted" style={{ ...MONO, fontSize: 11 }}>
                        Q{String(r.q).padStart(2, "0")}
                      </span>
                      <ConfidenceBar score={r.confidence} compact />
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.45 }}>{r.txt}</div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </section>
      </Ribbon>

      {/* How it works — the #fragment the hero's secondary CTA scrolls to. */}
      <section id="how-it-works" style={{ ...CONTAINER, paddingTop: 32, paddingBottom: 96 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          How it works
        </div>
        <h2 style={{ margin: "0 0 28px", maxWidth: 560 }}>
          Three steps. Mostly the agent&rsquo;s, not yours.
        </h2>
        {/* auto-fit keeps the three steps 3-up on desktop but collapses them to
            2 then 1 column as the viewport narrows — no media query needed. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {STEPS.map((s) => (
            <Card key={s.n} padding="lg">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  marginBottom: 12,
                }}
              >
                <span className="muted" style={{ ...MONO, fontSize: 11, fontWeight: 500 }}>
                  {s.n}
                </span>
                <span style={{ color: "var(--fg-muted)" }}>{s.icon}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{s.title}</div>
              <div className="muted pretty" style={{ fontSize: 13, lineHeight: 1.55 }}>
                {s.desc}
              </div>
            </Card>
          ))}
        </div>

        {/* Grounded-not-generative honesty strip. */}
        <Card
          padding="none"
          style={{
            marginTop: 40,
            padding: "20px 28px",
            display: "flex",
            gap: 24,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              Grounded, not generative.
            </div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
              Every answer cites the policy chunks it was drawn from. Low-confidence or out-of-scope
              answers are flagged, not hidden.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-4) var(--space-6)",
              ...MONO,
              fontSize: 14,
            }}
          >
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Median cost / ISQ
              </div>
              <div style={{ fontWeight: 600 }}>$0.08</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Median time
              </div>
              <div style={{ fontWeight: 600 }}>42s</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Flag rate
              </div>
              <div style={{ fontWeight: 600 }}>~10%</div>
            </div>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
