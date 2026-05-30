"use client";

import { useState, type CSSProperties, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Dropzone, type SelectedFile } from "@/components/Dropzone";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Spinner } from "@/components/Spinner";
import { ArrowRightIcon, EmailIcon, FileIcon } from "@/components/icons";
import { createRun, uploadRun } from "@/lib/api";
import { EXAMPLES, type ExampleQuestionnaire } from "@/lib/examples";

// Screen 2 — Upload. The challenge's "manual file upload on a dashboard": drop a blank
// ISQ (PDF / DOCX / XLSX) and it runs end to end through the live backend. A real dropped
// File goes to POST /runs (uploadRun — server-side extraction); an example runs its canned
// questionnaire via createRun (extract -> answer). Either way the backend returns a real
// run_id and we navigate to /runs/{id}/results. "use client": it holds useState + calls
// useRouter().push, so the test mocks next/navigation + lib/api.

const CONTAINER: CSSProperties = {
  maxWidth: 720,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "var(--gutter)",
  paddingRight: "var(--gutter)",
};

export default function UploadPage(): JSX.Element {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [example, setExample] = useState<ExampleQuestionnaire | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // The dropzone shows whichever is selected — a real File (which already satisfies
  // SelectedFile) or a descriptor for the chosen example.
  const selected: SelectedFile | null = file
    ? file
    : example
      ? { name: example.filename, size: example.size }
      : null;

  const start = async () => {
    if (!file && !example) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = file
        ? await uploadRun(file)
        : await createRun({
            filename: example!.filename,
            origin: example!.origin,
            source: example!.source,
          });
      router.push(`/runs/${result.run_id}/results`);
    } catch {
      setError(
        "Something went wrong processing that questionnaire. The backend may be busy. Try again.",
      );
      setSubmitting(false);
    }
  };

  // While the backend reads + answers the questionnaire (~under a minute), show a calm
  // processing state rather than a long-disabled button.
  if (submitting) {
    return (
      <div data-screen-label="02 Upload">
        <div style={{ ...CONTAINER, paddingTop: 120, paddingBottom: 120, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Spinner size={18} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Answering your questionnaire…</span>
          </div>
          <p className="muted" style={{ fontSize: 14, maxWidth: 460, margin: "0 auto" }}>
            Reading the document, extracting each question, and grounding an answer in Northstar
            Labs&apos; policies. Most ISQs finish in under a minute.
          </p>
        </div>
      </div>
    );
  }

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
            Drop a blank ISQ (PDF, DOCX or XLSX). The agent reads it, answers each question from
            Northstar Labs&apos; policies, and flags anything that needs a human.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner message={error} onDismiss={() => setError(undefined)} />
          </div>
        )}

        <Dropzone
          file={selected}
          onFile={(f) => {
            setFile(f);
            setExample(null);
            setError(undefined);
          }}
          onRemove={() => {
            setFile(null);
            setExample(null);
          }}
          onError={(m) => setError(m)}
          error={error}
        />

        {/* Examples / shortcuts — hidden once something is chosen. Each runs live. */}
        {!selected && (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Or try one of the examples
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <Button
                  key={ex.filename}
                  variant="secondary"
                  size="sm"
                  leadingIcon={<FileIcon size={12} />}
                  onClick={() => {
                    setError(undefined);
                    setFile(null);
                    setExample(ex);
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
          <Button variant="primary" size="lg" disabled={!file && !example} onClick={start}>
            Start processing
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
                The agent extracts the questions, retrieves matching policy chunks, generates a
                vendor-tone answer per item, and assembles three formats. Most ISQs finish in under
                a minute. You can leave the page open. We&apos;ll redirect to the result.
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
