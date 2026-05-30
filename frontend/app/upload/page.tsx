"use client";

import { useEffect, useState, type CSSProperties, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Dropzone, type SelectedFile } from "@/components/Dropzone";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ProcessingShowcase } from "@/components/ProcessingShowcase";
import { ArrowRightIcon, EmailIcon, FileIcon } from "@/components/icons";
import { createRun, uploadRun } from "@/lib/api";
import { EXAMPLES, type ExampleQuestionnaire } from "@/lib/examples";
import { DEFAULT_MODEL, MODEL_STORAGE_KEY, prettyModelId } from "@/lib/models";

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
  const [elapsed, setElapsed] = useState(0);
  const [model, setModel] = useState(DEFAULT_MODEL);

  // Reflect the model picked in Settings (persisted to localStorage) in the "Backed by"
  // tile, so it can't keep claiming Sonnet while a run uses Opus/Haiku. Read on mount,
  // not as a lazy initial state, so SSR/hydration use the default and the client updates.
  useEffect(() => {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setModel(saved);
  }, []);

  // While the run is in flight, advance a local clock to drive the processing showcase. A
  // tick accumulator (not Date/performance.now) keeps it deterministic and SSR-safe. The
  // reset lives in start() (the handler) rather than here, so no setState runs synchronously
  // inside the effect body.
  useEffect(() => {
    if (!submitting) return;
    let acc = 0;
    const t = setInterval(() => {
      acc += 100;
      setElapsed(acc);
    }, 100);
    return () => clearInterval(t);
  }, [submitting]);

  // The dropzone shows whichever is selected — a real File (which already satisfies
  // SelectedFile) or a descriptor for the chosen example.
  const selected: SelectedFile | null = file
    ? file
    : example
      ? { name: example.filename, size: example.size }
      : null;

  const start = async () => {
    if (!file && !example) return;
    setElapsed(0);
    setSubmitting(true);
    setError(undefined);
    try {
      // The model the user picked in Settings (persisted to localStorage). Read live at
      // submit so a just-changed pick is honoured; absent/invalid falls back to the
      // backend default; query rewriting always stays on Haiku.
      const selectedModel =
        typeof window !== "undefined"
          ? (localStorage.getItem(MODEL_STORAGE_KEY) ?? undefined)
          : undefined;
      const result = file
        ? await uploadRun(file, selectedModel)
        : await createRun({
            filename: example!.filename,
            origin: example!.origin,
            source: example!.source,
            model: selectedModel,
          });
      router.push(`/runs/${result.run_id}/results`);
    } catch {
      setError(
        "Something went wrong processing that questionnaire. The backend may be busy. Try again.",
      );
      setSubmitting(false);
    }
  };

  // While the backend reads + answers the questionnaire (~under a minute), show the pipeline
  // showcase rather than a long-disabled button. It's an indicative animation (the backend
  // answers in one call and doesn't stream progress); we navigate to results the moment the
  // real run resolves, so it holds at "answering" (maxStage 2) until then.
  if (submitting) {
    return (
      <div data-screen-label="02 Upload">
        <div style={{ ...CONTAINER, maxWidth: 880, paddingTop: 48, paddingBottom: 80 }}>
          <ProcessingShowcase
            elapsed={elapsed}
            total={20}
            runLabel={file ? file.name : example?.filename}
            maxStage={2}
          />
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
                <div>{prettyModelId(model)}</div>
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
