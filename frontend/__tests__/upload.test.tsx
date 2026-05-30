import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The /upload page is a "use client" page: it owns useState for the selected file /
// example / error / submitting and calls lib/api (uploadRun / createRun) then
// useRouter().push on submit. jsdom has no app router mounted and no backend, so we mock
// next/navigation (useRouter -> { push }) and @/lib/api. We assert the page's OWN contract
// — a real dropped File routes via uploadRun, an example routes via createRun, both to the
// real run's results URL — not real routing or a live backend (that is the browser pass).
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const { uploadRun, createRun } = vi.hoisted(() => ({
  uploadRun: vi.fn(),
  createRun: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ uploadRun, createRun }));

import UploadPage from "@/app/upload/page";
import { TYPE_ERROR_MESSAGE } from "@/lib/validate";

// A real File with a controlled size — avoids allocating megabytes. The Dropzone delegates
// to validateUpload, which only reads name + size.
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

afterEach(() => {
  push.mockClear();
  uploadRun.mockClear();
  createRun.mockClear();
  cleanup();
});

describe("UploadPage — structure", () => {
  it("renders the heading, the dropzone, the examples, and the helper strip", () => {
    render(<UploadPage />);
    expect(screen.getByRole("heading", { name: "Upload questionnaire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload a questionnaire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Northwind Pay/ })).toBeInTheDocument();
    expect(screen.getByText("What happens next")).toBeInTheDocument();
    expect(screen.getByText("isq-agent@northstar.example")).toBeInTheDocument();
  });

  it("links back to the landing page", () => {
    render(<UploadPage />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
  });
});

describe("UploadPage — the Start CTA gates on a selection", () => {
  it("disables Start processing until a file or example is chosen", () => {
    render(<UploadPage />);
    expect(screen.getByRole("button", { name: "Start processing" })).toBeDisabled();
  });
});

describe("UploadPage — example shortcuts", () => {
  it("selects the example, shows its filename, hides the examples, and enables the CTA", () => {
    render(<UploadPage />);
    fireEvent.click(screen.getByRole("button", { name: /Northwind Pay/ }));

    expect(
      screen.getByText("Northwind_Pay_Supplier_Security_Questionnaire.pdf"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Caldera Health/ })).not.toBeInTheDocument();
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

describe("UploadPage — submit runs the questionnaire and routes to its results", () => {
  it("an example runs via createRun and routes to the real run's results", async () => {
    createRun.mockResolvedValue({ run_id: "sunflowers-1a2b3c", envelope: {} });
    render(<UploadPage />);
    fireEvent.click(screen.getByRole("button", { name: /Northwind Pay/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start processing" }));

    // The processing showcase shows while the backend answers.
    expect(screen.getByText("Answering your questionnaire")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/runs/sunflowers-1a2b3c/results"));
    expect(createRun).toHaveBeenCalledTimes(1);
    expect(uploadRun).not.toHaveBeenCalled();
  });

  it("a dropped file runs via uploadRun and routes to the real run's results", async () => {
    uploadRun.mockResolvedValue({ run_id: "upload-9z8y", envelope: {} });
    const { container } = render(<UploadPage />);
    fireEvent.change(fileInput(container), {
      target: { files: [makeFile("my-isq.pdf", 5000, "application/pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start processing" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/runs/upload-9z8y/results"));
    expect(uploadRun).toHaveBeenCalledTimes(1);
    expect(createRun).not.toHaveBeenCalled();
  });

  it("surfaces an error and recovers if the run fails", async () => {
    createRun.mockRejectedValue(new Error("backend down"));
    render(<UploadPage />);
    fireEvent.click(screen.getByRole("button", { name: /Northwind Pay/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start processing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(push).not.toHaveBeenCalled();
    // Back to an actionable state.
    expect(screen.getByRole("button", { name: "Start processing" })).toBeInTheDocument();
  });
});
