import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/ThemeToggle";

// ThemeToggle is a self-contained client control: it owns the `.dark` class on
// <html> and persists the choice. It touches no next/navigation, so there is no
// router to mock — the contract IS the real DOM + localStorage side effects, so
// the tests assert those directly. The page-level no-flash script and the
// cross-screen dark visuals are covered by `npm run build` + the browser pass,
// not jsdom. We reset the global <html> class + localStorage around every test
// so a left-behind `.dark` can't leak between cases.

const STORAGE_KEY = "isq-theme";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

describe("ThemeToggle", () => {
  it("renders a labelled toggle button, unpressed, showing the moon in light mode", () => {
    const { container } = render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    // Light mode offers the moon (the switch-to-dark affordance). The moon glyph
    // is a single <path> with no <circle>; the sun carries a <circle>.
    expect(container.querySelector("svg circle")).toBeNull();
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("adds .dark to <html>, persists 'dark', flips to the sun, and presses on toggle", () => {
    const { container } = render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });

    fireEvent.click(btn);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    // Dark mode offers the sun (the switch-to-light affordance).
    expect(container.querySelector("svg circle")).not.toBeNull();
  });

  it("removes .dark and persists 'light' when toggled back off", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });

    fireEvent.click(btn); // light -> dark
    fireEvent.click(btn); // dark -> light

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects an already-dark <html> on mount (the pre-hydration script ran first)", () => {
    document.documentElement.classList.add("dark");

    const { container } = render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("svg circle")).not.toBeNull();
  });
});
