import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast } from "@/components/Toast";

// Toast is the prototype's single .toast pill (components.jsx:128): an optional
// leading icon followed by the message. role="status" + aria-live make it a
// polite live announcement (an a11y addition over the prototype, which set no
// role); the prototype defines only one .toast style, so there is no variant.

describe("Toast", () => {
  it("renders the message and the leading icon inside a status region", () => {
    render(<Toast message="Reindex complete" icon={<span data-testid="toast-icon" />} />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveClass("toast");
    expect(screen.getByText("Reindex complete")).toBeInTheDocument();
    expect(screen.getByTestId("toast-icon")).toBeInTheDocument();
  });

  it("renders without an icon", () => {
    render(<Toast message="Saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
