import { readFileSync } from "node:fs";
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

// Source-level guard for the locked design rule: Crail orange (#CC785C) lives in
// EXACTLY ONE place — the claude badge. jsdom never loads the built stylesheet,
// so computed colour can't be asserted here; instead we read globals.css and
// check the per-variant rule bodies directly (same approach as tokens.test.ts).
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// Body of the first rule whose selector matches exactly (e.g. `.btn-link {…}`,
// not `.btn-link:hover {…}`). CSS here has no nested braces, so `[^}]*` is safe.
function ruleBody(selector: string): string {
  const escaped = selector.replace(/\./g, "\\.");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

describe("Slice 7 — orange stays on the claude badge only", () => {
  const ORANGE = /claude-orange|#cc785c/i;

  it("paints the claude badge in Crail orange", () => {
    expect(ruleBody(".badge-claude")).toMatch(ORANGE);
  });

  it("keeps orange off every other button and badge variant", () => {
    const others = [
      ".badge-default",
      ".badge-success",
      ".badge-warning",
      ".badge-error",
      ".badge-accent",
      ".btn-primary",
      ".btn-secondary",
      ".btn-ghost",
      ".btn-link",
    ];
    for (const selector of others) {
      expect(ruleBody(selector), `${selector} must not reference orange`).not.toMatch(ORANGE);
    }
  });
});
