"use client";

import { useState, type CSSProperties, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Dropzone, type SelectedFile } from "@/components/Dropzone";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Spinner } from "@/components/Spinner";
import { ArrowRightIcon, EmailIcon, FileIcon } from "@/components/icons";

// Screen 2 — Upload. Ported from the prototype's UploadPage (pages.jsx Screen 2).
// The first real consumer of the Slice 9 Dropzone (controlled — this page owns
// `file`/`error`/`phase`) and the Slice 5 validateUpload rules (the Dropzone
// delegates the accept check; this page only renders the message it reports up).
//
// It's a "use client" page: it holds useState and calls useRouter().push on
// submit, so the render test mocks next/navigation (useRouter -> { push }).
// Two deliberate divergences from the prototype, both to honour the locked design:
//   - the Start CTA is variant="primary" (the black pill), NOT the prototype's
//     "accent": accent maps to Crail orange and isn't in the ButtonVariant union
//     (Slices 12/13 set this precedent).
//   - the helper copy drops the prototype's em dash ("open — we'll" -> two
//     sentences): em dashes are banned in Tom's voice.
//
// The back-to-home control is next/link (the App Router convention the
// no-html-link-for-pages lint rule enforces). The render test needs no next/link
// mock — Next 16's <Link> renders to an <a href> fine in jsdom; only activating
// it (click/prefetch) would touch the router context, and the test never clicks
// Home. Only next/navigation is mocked, for the submit push.

type Phase = "idle" | "validating" | "submitting";

// The example shortcuts. Byte sizes are explicit (the prototype parsed them out
// of "6.2 KB"/"8.2 MB" strings) so the Dropzone's size label reads back the same
// figure; `type` is omitted so the selected-file panel derives the friendly
// "PDF"/"Excel" label from the extension rather than a raw MIME string. These are
// lightweight descriptors, not real Files — exactly why Dropzone takes a
// SelectedFile (a real picked/dropped File still satisfies the same shape).
interface Example {
  label: string;
  file: SelectedFile;
}

const EXAMPLES: Example[] = [
  {
    label: "Sunflowers Charity (PDF)",
    file: { name: "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf", size: 6.2 * 1024 },
  },
  {
    label: "Blackridge Wind Energy (PDF)",
    file: { name: "Blackridge_Wind_Energy_ISQ.pdf", size: 8.2 * 1024 * 1024 },
  },
  {
    label: "Simple Salvage (XLSX)",
    file: { name: "Simple_Salvage_Vendor_Questionnaire.xlsx", size: 112 * 1024 },
  },
];

// A URL-safe run id derived from the filename. Stub until the §8 glue swaps it for
// the backend's real run_id (the /process-questionnaire response). Slice 15's
// /runs/[id] is driven by a polling stub, so any URL-safe slug serves for now.
// Deterministic (no Date.now/Math.random) so it's SSR-safe and test-stable.
function makeRunId(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Narrow page gutter (the prototype's .container-narrow). Padding longhands so the
// per-block paddingTop/paddingBottom don't mix shorthand + longhand (Landing precedent).
const CONTAINER: CSSProperties = {
  maxWidth: 720,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "var(--gutter)",
  paddingRight: "var(--gutter)",
};

export default function UploadPage(): JSX.Element {
  const router = useRouter();
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("idle");

  // The timed two-phase submit, ported from the prototype: a brief "checking"
  // beat, then "sending", then route to the run's processing screen. The button
  // is disabled while phase !== "idle", so there's no double-submit to guard.
  const start = () => {
    if (!file) return;
    setPhase("validating");
    setTimeout(() => {
      setPhase("submitting");
      setTimeout(() => {
        router.push(`/runs/${makeRunId(file.name)}`);
      }, 700);
    }, 600);
  };

  const submitLabel =
    phase === "validating"
      ? "Checking file…"
      : phase === "submitting"
        ? "Sending to workflow…"
        : "Start processing";

  return (
    <div data-screen-label="02 Upload">
      <div style={{ ...CONTAINER, paddingTop: 56, paddingBottom: 80 }}>
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/"
            className="muted"
            style={{
              fontSize: 12,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowRightIcon size={11} style={{ transform: "scaleX(-1)" }} /> Home
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 6px" }}>
            Upload questionnaire
          </h1>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            Drop a file, or forward it from your inbox. The agent picks up the format automatically.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner message={error} onDismiss={() => setError(undefined)} />
          </div>
        )}

        <Dropzone
          file={file}
          onFile={(f) => {
            setFile(f);
            setError(undefined);
          }}
          onRemove={() => setFile(null)}
          onError={(m) => setError(m)}
          error={error}
        />

        {/* Examples / shortcuts — hidden once a file is chosen. */}
        {!file && (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Or try one of the examples
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <Button
                  key={ex.file.name}
                  variant="secondary"
                  size="sm"
                  leadingIcon={<FileIcon size={12} />}
                  onClick={() => {
                    setError(undefined);
                    setFile(ex.file);
                  }}
                >
                  {ex.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* CTA row: the inbox helper + the Start pill. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 28,
          }}
        >
          <div
            className="muted"
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <EmailIcon size={13} /> <span>Or send to</span>{" "}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--fg)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              isq-agent@northstar.example
            </span>
          </div>
          <Button
            variant="primary"
            size="lg"
            disabled={!file || phase !== "idle"}
            onClick={start}
            // The label already announces the phase ("Checking file…"), so the
            // river-blue Spinner is wrapped aria-hidden — its role="status" would
            // otherwise double-announce alongside the changing button text.
            leadingIcon={
              phase === "idle" ? undefined : (
                <span aria-hidden="true" style={{ display: "inline-flex" }}>
                  <Spinner size={14} />
                </span>
              )
            }
          >
            {submitLabel}
          </Button>
        </div>

        {/* Helper strip: what happens next + the backing stack. */}
        <div style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 24,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                What happens next
              </div>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                The agent extracts the numbered questions, retrieves matching policy chunks,
                generates a vendor-tone answer per item, and assembles three formats. Most ISQs
                finish in under a minute. You can leave the page open. We&apos;ll redirect to the
                result.
              </div>
            </div>
            <div className="card" style={{ padding: 14, fontSize: 12, minWidth: 200 }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                Backed by
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7 }}>
                <div>claude-sonnet-4.5</div>
                <div>voyage-3-large · 1024d</div>
                <div>pinecone · isq-agent-knowledge</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
