import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs, type TabItem } from "@/components/Tabs";

// Tabs is a near-verbatim port of the prototype's <Tabs> (components.jsx:136):
// role="tablist" with role="tab" buttons, the active tab carries .active (the
// CSS draws the blue underline via .tab.active::after) and aria-selected, an
// optional count renders in a default badge. Behaviour the screen relies on:
// clicking a tab reports its id up through onChange.
const ITEMS: TabItem[] = [
  { id: "answers", label: "Answers", count: 20 },
  { id: "flagged", label: "Flagged", count: 2 },
  { id: "citations", label: "Citations", count: 8 },
  { id: "metrics", label: "Metrics" },
];

describe("Tabs", () => {
  it("renders every tab label inside a tablist", () => {
    render(<Tabs items={ITEMS} value="answers" onChange={() => {}} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    for (const item of ITEMS) {
      expect(screen.getByRole("tab", { name: new RegExp(item.label) })).toBeInTheDocument();
    }
  });

  it("marks only the selected tab active + aria-selected", () => {
    render(<Tabs items={ITEMS} value="flagged" onChange={() => {}} />);
    const flagged = screen.getByRole("tab", { name: /Flagged/ });
    const answers = screen.getByRole("tab", { name: /Answers/ });
    expect(flagged).toHaveClass("tab", "active");
    expect(flagged).toHaveAttribute("aria-selected", "true");
    expect(answers).not.toHaveClass("active");
    expect(answers).toHaveAttribute("aria-selected", "false");
  });

  it("reports the clicked tab's id through onChange", () => {
    const onChange = vi.fn();
    render(<Tabs items={ITEMS} value="answers" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Citations/ }));
    expect(onChange).toHaveBeenCalledWith("citations");
  });

  it("renders a count badge when count is given and omits it otherwise", () => {
    const { container } = render(<Tabs items={ITEMS} value="answers" onChange={() => {}} />);
    expect(screen.getByText("20")).toBeInTheDocument();
    // "Metrics" has no count → its tab carries no badge.
    const metrics = screen.getByRole("tab", { name: /Metrics/ });
    expect(metrics.querySelector(".badge")).toBeNull();
    // Sanity: the other three tabs each carry a badge.
    expect(container.querySelectorAll(".tab .badge")).toHaveLength(3);
  });
});
