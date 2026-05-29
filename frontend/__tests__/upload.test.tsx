import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The /upload page is a "use client" page: it owns useState for the selected
// file / error / submit phase and calls useRouter().push on submit. jsdom has no
// app router mounted, so we mock next/navigation (useRouter -> { push }) the same
// way the Slice 12 settings test did — asserting the page's OWN contract, not
// real routing (that is covered by `npm run build` + the Slice 18 browser pass).
// push is hoisted so the vi.mock factory can close over it.
//
// What these tests prove: the screen's behaviour contract — the CTA gates on a
// selected file; an example shortcut populates the dropzone and hides the
// examples; an invalid pick surfaces the Slice 5 validator's EXACT message via an
// alert banner that dismisses; submit runs its phases and routes to the run's
// processing screen. What they do NOT prove: rendered visuals (the dashed zone,
// the pill fills) — jsdom never loads the Tailwind-built stylesheet.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import UploadPage from "@/app/upload/page";
import { TYPE_ERROR_MESSAGE } from "@/lib/validate";

// A real File with a controlled size — avoids allocating megabytes. The Dropzone
// delegates to validateUpload, which only ever reads name + size. Same helper as
// the Slice 9 dropzone test.
function makeFile(name: string, size: number, type = ""): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("file input not found");
  return input as HTMLInputElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe("UploadPage — structure", () => {
  it("renders the heading, the dropzone, the examples, and the helper strip", () => {
    render(<UploadPage />);
    expect(screen.getByRole("heading", { name: "Upload questionnaire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload a questionnaire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sunflowers Charity/ })).toBeInTheDocument();
    expect(screen.getByText("What happens next")).toBeInTheDocument();
    expect(screen.getByText("isq-agent@northstar.example")).toBeInTheDocument();
  });

  it("links back to the landing page", () => {
    render(<UploadPage />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
  });
});

describe("UploadPage — the Start CTA gates on a selected file", () => {
  it("disables Start processing until a file is chosen", () => {
    render(<UploadPage />);
    expect(screen.getByRole("button", { name: "Start processing" })).toBeDisabled();
  });
});

describe("UploadPage — example shortcuts", () => {
  it("populates the dropzone with the example file and hides the examples", () => {
    render(<UploadPage />);
    fireEvent.click(screen.getByRole("button", { name: /Sunflowers Charity/ }));

    // The selected-file panel shows the real filename.
    expect(
      screen.getByText("Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf"),
    ).toBeInTheDocument();
    // Examples disappear once a file is selected.
    expect(screen.queryByRole("button", { name: /Blackridge/ })).not.toBeInTheDocument();
    // The CTA is now enabled.
    expect(screen.getByRole("button", { name: "Start processing" })).not.toBeDisabled();
  });
});

describe("UploadPage — validation wiring", () => {
  it("surfaces the validator's type message via an alert banner, then clears on dismiss", () => {
    const { container } = render(<UploadPage />);
    fireEvent.change(fileInput(container), {
      target: { files: [makeFile("notes.txt", 1024, "text/plain")] },
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(TYPE_ERROR_MESSAGE);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("UploadPage — submit routes to the processing screen", () => {
  it("runs the submit phases then pushes to the run's processing route", () => {
    render(<UploadPage />);
    fireEvent.click(screen.getByRole("button", { name: /Sunflowers Charity/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start processing" }));

    // Phase 1: checking.
    expect(screen.getByRole("button", { name: /Checking file/ })).toBeInTheDocument();

    // Phase 2: sending.
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole("button", { name: /Sending to workflow/ })).toBeInTheDocument();

    // Routed to /runs/<id>.
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toMatch(/^\/runs\//);
  });
});
