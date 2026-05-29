import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The /settings page calls useRouter() for the Cancel button. jsdom has no app
// router mounted, so we mock next/navigation the same way the Phase C TopBar test
// mocked usePathname — asserting the page's OWN contract, not real routing (that
// is covered by `npm run build` + the Slice 18 browser pass). push is hoisted so
// the vi.mock factory can close over it.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import SettingsPage from "@/app/settings/page";

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe("SettingsPage — structure", () => {
  it("renders the heading and the three setting sections", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    // No API-key inputs: on the hosted deploy the keys live in the backend env.
    expect(screen.queryByText("API configuration")).not.toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Confidence threshold")).toBeInTheDocument();
    expect(screen.getByText("Knowledge base")).toBeInTheDocument();
  });
});

describe("SettingsPage — model radio group", () => {
  it("defaults to Sonnet and switches to Haiku on click", () => {
    render(<SettingsPage />);
    const sonnet = screen.getByRole("radio", { name: /Claude Sonnet 4\.5/i });
    const haiku = screen.getByRole("radio", { name: /Claude Haiku 4\.5/i });

    expect(sonnet).toBeChecked();
    expect(haiku).not.toBeChecked();

    fireEvent.click(haiku);
    expect(haiku).toBeChecked();
    expect(sonnet).not.toBeChecked();
  });

  it("offers Sonnet 4.6 and Opus 4.7 as model choices", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("radio", { name: /Claude Sonnet 4\.6/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Claude Opus 4\.7/i })).toBeInTheDocument();
  });
});

describe("SettingsPage — confidence slider", () => {
  it("ranges 0.3–0.9 and defaults to 0.60 (Balanced)", () => {
    render(<SettingsPage />);
    const slider = screen.getByRole("slider", { name: /confidence threshold/i });
    expect(slider).toHaveAttribute("min", "0.3");
    expect(slider).toHaveAttribute("max", "0.9");
    expect(slider).toHaveAttribute("step", "0.01");
    // jsdom exposes the range value as a string; assert the DOM truth directly.
    expect((slider as HTMLInputElement).value).toBe("0.6");
    expect(screen.getByText("0.60")).toBeInTheDocument();
    expect(screen.getByText("Balanced")).toBeInTheDocument();
  });

  it("updates the readout and qualitative label as it moves", () => {
    render(<SettingsPage />);
    const slider = screen.getByRole("slider", { name: /confidence threshold/i });

    fireEvent.change(slider, { target: { value: "0.9" } });
    expect(screen.getByText("0.90")).toBeInTheDocument();
    expect(screen.getByText("Strict")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "0.3" } });
    expect(screen.getByText("0.30")).toBeInTheDocument();
    expect(screen.getByText("Lenient")).toBeInTheDocument();
  });
});

describe("SettingsPage — reindex button", () => {
  it("disables and relabels while reindexing, then offers a re-run", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reindex" }));

    const busy = screen.getByRole("button", { name: /Reindexing/ });
    expect(busy).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    const done = screen.getByRole("button", { name: /Reindex again/ });
    expect(done).not.toBeDisabled();
  });
});

describe("SettingsPage — save bar", () => {
  it("shows a confirmation toast on save, then auto-dismisses", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(screen.getByText("Settings saved")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(screen.queryByText("Settings saved")).not.toBeInTheDocument();
  });

  it("navigates home when Cancel is clicked", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(push).toHaveBeenCalledWith("/");
  });
});
