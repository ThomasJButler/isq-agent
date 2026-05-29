import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark } from "@/components/Wordmark";
import { TopBar } from "@/components/TopBar";

// First Phase C component test, so it sets the RTL pattern for the slices that
// follow. App Router components depend on context jsdom doesn't provide, so the
// two Next runtime touch-points are mocked: `next/link` collapses to a plain
// anchor that forwards href/className/aria-*, and `usePathname` returns a fixed
// route. The test then asserts the component's OWN contract (markup, accent,
// active state, repo link); real router integration is covered by `npm run
// build` + the live app, not a jsdom unit test.
vi.mock("next/navigation", () => ({
  usePathname: () => "/upload",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string };
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : href.pathname} {...props}>
      {children}
    </a>
  ),
}));

describe("Wordmark", () => {
  it("renders ISQ in ink and Agent in the river-blue accent", () => {
    render(<Wordmark />);
    expect(screen.getByText("ISQ")).toBeInTheDocument();
    // "Agent" carries the .accent class — the single river-blue interactive
    // accent the design reserves for the wordmark (never the Claude orange).
    expect(screen.getByText("Agent")).toHaveClass("accent");
  });

  it("renders the sparkle as an inline SVG, not a clip-path glyph", () => {
    const { container } = render(<Wordmark />);
    // Slice 17 tweak #1: inline <polygon> with geometricPrecision, shipped from
    // the start so there's no later rework.
    const polygon = container.querySelector("svg polygon");
    expect(polygon).not.toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("shape-rendering", "geometricPrecision");
  });
});

describe("TopBar", () => {
  it("links the wordmark to the landing page with an accessible name", () => {
    render(<TopBar />);
    const home = screen.getByRole("link", { name: /isq agent/i });
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders the primary nav links pointing at their routes", () => {
    render(<TopBar />);
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute("href", "/upload");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("marks the current route active and leaves the others inactive", () => {
    render(<TopBar />); // usePathname mocked to "/upload"
    const upload = screen.getByRole("link", { name: "Upload" });
    const settings = screen.getByRole("link", { name: "Settings" });
    expect(upload).toHaveClass("active");
    expect(upload).toHaveAttribute("aria-current", "page");
    expect(settings).not.toHaveClass("active");
  });

  it("points the repo link at the GitHub repo, opens safely, and is keyboard-reachable", () => {
    render(<TopBar />);
    const repo = screen.getByRole("link", { name: /repo/i });
    expect(repo).toHaveAttribute("href", "https://github.com/ThomasJButler/isq-agent");
    expect(repo).toHaveAttribute("target", "_blank");
    expect(repo.getAttribute("rel")).toContain("noreferrer");
    // A real <a href> is in the tab order by default — keyboard-reachable with
    // no tabindex needed.
    expect(repo.tagName).toBe("A");
  });
});
