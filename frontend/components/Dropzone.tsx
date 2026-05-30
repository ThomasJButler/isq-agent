"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type JSX,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ACCEPTED_EXTENSIONS, validateUpload } from "@/lib/validate";

// Controlled upload zone, a faithful port of the prototype's <Dropzone>
// (components.jsx:173): the parent owns `file` and `error`, and the zone reports
// up via onFile / onError / onRemove. The accept check is delegated to Slice 5's
// validateUpload — the single source of truth for the .pdf/.docx/.xlsx + 10 MB rules
// and the exact error copy — instead of re-inlining the prototype's regex/size
// guard. The selected-file panel reuses Slice 8's <Card> and the Remove control
// is the Slice 7 ghost <Button>. The visual states (dashed zone, dragging/error
// borders) live in the .dropzone CSS, covered by `npm run build`, not jsdom.
// The minimal slice of a file the selected-file panel displays: name, size, and
// an optional MIME type. A real browser File satisfies it (so picks/drops pass
// through unchanged and the Slice 9 tests stay green), but it also lets a screen
// hand the zone a lightweight descriptor — e.g. /upload's example shortcuts,
// which can't allocate a real 8 MB File. Mirrors Slice 5's UploadFile precedent.
export interface SelectedFile {
  name: string;
  size: number;
  type?: string;
}

interface DropzoneProps {
  /** The currently selected file, or null for the empty prompt. Parent-owned. */
  file: SelectedFile | null;
  /** Called with a file that passed validateUpload (always a real browser File). */
  onFile: (file: File) => void;
  /** Called when the selected file is cleared. */
  onRemove: () => void;
  /** Called with the validator's message when a pick/drop is rejected. */
  onError: (message: string) => void;
  /** A parent-owned error; truthy paints the error border. */
  error?: string;
}

// Local line-art icons (prototype icons.jsx upload + file). Inlined like TopBar's
// repo icon — there's no shared icon set yet, so an abstraction here would be
// speculative; a later primitive slice can extract one if a real need appears.
function UploadIcon(): JSX.Element {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function FileIcon(): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

// File-size label, the prototype's fmtBytes (components.jsx:159). Kept local: the
// Dropzone is its only consumer today, so a screen slice can lift it into
// lib/format once a second caller appears (the YAGNI moment), not before.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// A friendly file-type label by extension, used when the browser gives no MIME
// type (e.g. a drag-drop or one of /upload's lightweight example descriptors).
function labelForExtension(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return "Excel";
  if (lower.endsWith(".docx")) return "Word";
  return "PDF";
}

export function Dropzone({ file, onFile, onRemove, onError, error }: DropzoneProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (f: File | null | undefined) => {
      if (!f) return;
      const result = validateUpload(f);
      if (!result.ok) {
        onError(result.message);
        return;
      }
      onFile(f);
    },
    [onFile, onError],
  );

  if (file) {
    return (
      <Card padding="md" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "var(--bg)",
            display: "grid",
            placeItems: "center",
            color: "var(--fg-muted)",
          }}
        >
          <FileIcon />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {formatBytes(file.size)} ·{" "}
            {file.type || labelForExtension(file.name)}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </Card>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={["dropzone", dragging && "dragging", error && "error"].filter(Boolean).join(" ")}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files?.[0]);
      }}
      aria-label="Upload a questionnaire"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(e: ChangeEvent<HTMLInputElement>) => accept(e.target.files?.[0])}
        hidden
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--bg)",
            display: "grid",
            placeItems: "center",
            color: "var(--fg-muted)",
          }}
        >
          <UploadIcon />
        </span>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>
            Drop a questionnaire here, or click to browse.
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            PDF, DOCX or XLSX. Up to 10 MB.
          </div>
        </div>
      </div>
    </div>
  );
}
