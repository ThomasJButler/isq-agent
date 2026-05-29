import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "@/components/Spinner";

// Spinner has no prototype original: a small river-blue ring for inline loading
// states. role="status" + aria-label announce it to assistive tech; the CSS spin
// is frozen by the global prefers-reduced-motion rule. size sets the diameter.

describe("Spinner", () => {
  it("renders a labelled status spinner", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status", { name: "Loading" });
    expect(spinner).toHaveClass("spinner");
  });

  it("accepts a custom label and size", () => {
    render(<Spinner label="Indexing" size={24} />);
    const spinner = screen.getByRole("status", { name: "Indexing" });
    expect(spinner).toHaveStyle({ width: "24px", height: "24px" });
  });
});
