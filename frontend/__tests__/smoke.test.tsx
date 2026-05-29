import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

// Trivial smoke test that exercises the whole toolchain end to end:
// Vitest runs, jsdom provides a DOM, @vitejs/plugin-react transforms JSX,
// React Testing Library renders, and the jest-dom matcher is registered.
describe("test harness", () => {
  it("evaluates a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("renders a component with React Testing Library + jest-dom", () => {
    render(<h1>ISQ Agent</h1>);
    expect(screen.getByRole("heading", { name: "ISQ Agent" })).toBeInTheDocument();
  });
});
