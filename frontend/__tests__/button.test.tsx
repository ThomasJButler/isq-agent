import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@/components/Button";

// Button is a plain primitive — no next/link or next/navigation — so the Slice 6
// router mocks aren't needed. The test asserts the prototype's contract
// (components.jsx:44): the right `btn btn-<variant>` classes, the size class,
// the href → <a> branch, the onClick, and disabled. Visual styling (the actual
// pill fill / press-scale) is covered by `npm run build`, not jsdom.

describe("Button", () => {
  it("renders a <button> with the secondary variant and type=button by default", () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).toHaveClass("btn", "btn-secondary");
    expect(button).toHaveAttribute("type", "button");
  });

  it.each([
    ["primary", "btn-primary"],
    ["secondary", "btn-secondary"],
    ["ghost", "btn-ghost"],
    ["link", "btn-link"],
  ] as const)("renders the %s variant class", (variant, expectedClass) => {
    render(<Button variant={variant}>Label</Button>);
    expect(screen.getByRole("button", { name: "Label" })).toHaveClass("btn", expectedClass);
  });

  it("adds a size class only for sm and lg, never for the default md", () => {
    const { rerender } = render(<Button size="lg">L</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-lg");

    rerender(<Button size="sm">S</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-sm");

    rerender(<Button>M</Button>);
    const medium = screen.getByRole("button");
    expect(medium).not.toHaveClass("btn-lg");
    expect(medium).not.toHaveClass("btn-sm");
  });

  it("fires onClick when pressed", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders an <a> when given an href, keeping the variant classes", () => {
    render(
      <Button href="/upload" variant="primary">
        Upload
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Upload" });
    expect(link).toHaveAttribute("href", "/upload");
    expect(link).toHaveClass("btn", "btn-primary");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("disables the underlying button when disabled", () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole("button", { name: "Nope" })).toBeDisabled();
  });

  it("renders leading and trailing icons around the label", () => {
    render(
      <Button leadingIcon={<span data-testid="lead" />} trailingIcon={<span data-testid="trail" />}>
        Mid
      </Button>,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByTestId("trail")).toBeInTheDocument();
    expect(screen.getByText("Mid")).toBeInTheDocument();
  });
});
