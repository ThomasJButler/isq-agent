import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/Badge";

// Badge is a plain primitive (prototype components.jsx:62): a `badge
// badge-<variant>` pill with an optional status dot and leading icon.

describe("Badge", () => {
  it("renders the default variant when none is given", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toHaveClass("badge", "badge-default");
  });

  it.each([
    ["default", "badge-default"],
    ["success", "badge-success"],
    ["warning", "badge-warning"],
    ["error", "badge-error"],
    ["accent", "badge-accent"],
    ["claude", "badge-claude"],
  ] as const)("renders the %s variant class", (variant, expectedClass) => {
    render(<Badge variant={variant}>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass("badge", expectedClass);
  });

  it("renders a status dot when dot is set", () => {
    const { container } = render(<Badge dot>Live</Badge>);
    expect(container.querySelector(".badge-dot")).not.toBeNull();
  });

  it("renders a leading icon before the label", () => {
    render(<Badge leadingIcon={<span data-testid="icon" />}>Tagged</Badge>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
