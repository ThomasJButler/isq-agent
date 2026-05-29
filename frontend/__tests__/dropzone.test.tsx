import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dropzone } from "@/components/Dropzone";
import { MAX_UPLOAD_BYTES, SIZE_ERROR_MESSAGE, TYPE_ERROR_MESSAGE } from "@/lib/validate";

// Dropzone is a controlled primitive (prototype components.jsx:173): the parent
// owns `file` and `error`; the zone calls onFile / onError / onRemove. Per the
// Slice 9 brief the accept check is delegated to Slice 5's validateUpload, so
// these tests assert that contract: a valid pick/drop -> onFile, an invalid
// type/oversize -> onError with the validator's exact message and NO onFile, the
// error border comes from the prop, the keyboard opens the picker, and the
// selected state shows name + size + Remove. Visual styling (the dashed zone,
// the dragging/error borders) is covered by `npm run build`, not jsdom.

// A real File with a controlled size — avoids allocating megabytes for the
// oversize case. validateUpload only ever reads name + size.
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

const noop = () => {};

describe("Dropzone", () => {
  it("renders the empty prompt as an accessible button", () => {
    render(<Dropzone file={null} onFile={noop} onRemove={noop} onError={noop} />);
    const zone = screen.getByRole("button", { name: "Upload a questionnaire" });
    expect(zone).toHaveClass("dropzone");
    expect(screen.getByText(/Drop a questionnaire here/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF or XLSX/i)).toBeInTheDocument();
  });

  it("calls onFile for a valid pick and surfaces no error", () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <Dropzone file={null} onFile={onFile} onRemove={noop} onError={onError} />,
    );
    const valid = makeFile("report.pdf", 1024, "application/pdf");
    fireEvent.change(fileInput(container), { target: { files: [valid] } });
    expect(onFile).toHaveBeenCalledWith(valid);
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onFile when a valid file is dropped", () => {
    const onFile = vi.fn();
    render(<Dropzone file={null} onFile={onFile} onRemove={noop} onError={noop} />);
    const valid = makeFile("answers.xlsx", 2048);
    const zone = screen.getByRole("button", { name: "Upload a questionnaire" });
    fireEvent.drop(zone, { dataTransfer: { files: [valid] } });
    expect(onFile).toHaveBeenCalledWith(valid);
  });

  it("rejects a wrong type with the validator's message and no onFile", () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <Dropzone file={null} onFile={onFile} onRemove={noop} onError={onError} />,
    );
    fireEvent.change(fileInput(container), {
      target: { files: [makeFile("notes.txt", 1024, "text/plain")] },
    });
    expect(onError).toHaveBeenCalledWith(TYPE_ERROR_MESSAGE);
    expect(onFile).not.toHaveBeenCalled();
  });

  it("rejects an oversize file with the validator's message and no onFile", () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <Dropzone file={null} onFile={onFile} onRemove={noop} onError={onError} />,
    );
    fireEvent.change(fileInput(container), {
      target: { files: [makeFile("big.pdf", MAX_UPLOAD_BYTES + 1)] },
    });
    expect(onError).toHaveBeenCalledWith(SIZE_ERROR_MESSAGE);
    expect(onFile).not.toHaveBeenCalled();
  });

  it("applies the error class when an error prop is set", () => {
    render(<Dropzone file={null} onFile={noop} onRemove={noop} error="oops" onError={noop} />);
    expect(screen.getByRole("button", { name: "Upload a questionnaire" })).toHaveClass("error");
  });

  it("opens the native picker on Enter and Space", () => {
    const { container } = render(
      <Dropzone file={null} onFile={noop} onRemove={noop} onError={noop} />,
    );
    const clickSpy = vi.spyOn(fileInput(container), "click").mockImplementation(noop);
    const zone = screen.getByRole("button", { name: "Upload a questionnaire" });
    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it("shows the selected file with its size and a working Remove action", () => {
    const onRemove = vi.fn();
    render(
      <Dropzone
        file={makeFile("report.pdf", 2048, "application/pdf")}
        onFile={noop}
        onRemove={onRemove}
        onError={noop}
      />,
    );
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
