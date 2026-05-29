import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/Skeleton";

// Skeleton is the prototype's `Sk` shimmer helper (components.jsx:154), renamed
// for a clearer library name; the CSS class stays `.sk` to match the ported
// tokens. It sizes itself from w / h / r props (numbers become pixels) and is
// aria-hidden — a decorative loading placeholder with no semantic content.

describe("Skeleton", () => {
  it("renders a .sk block with default dimensions", () => {
    const { container } = render(<Skeleton />);
    const sk = container.querySelector(".sk");
    expect(sk).not.toBeNull();
    expect(sk).toHaveStyle({ width: "100%", height: "12px", borderRadius: "4px" });
  });

  it("applies numeric width, height, and radius as pixels", () => {
    const { container } = render(<Skeleton w={120} h={20} r={8} />);
    expect(container.querySelector(".sk")).toHaveStyle({
      width: "120px",
      height: "20px",
      borderRadius: "8px",
    });
  });

  it("hides itself from assistive tech", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector(".sk")).toHaveAttribute("aria-hidden", "true");
  });
});
