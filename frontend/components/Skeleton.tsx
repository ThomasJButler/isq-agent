import type { CSSProperties, JSX } from "react";

// The prototype's `Sk` shimmer helper (components.jsx:154), renamed for a clearer
// library name; the CSS class stays `.sk` to match the ported tokens. It sizes
// itself from w / h / r (numbers become pixels via React's style serialiser) and
// is aria-hidden — a decorative loading placeholder with no semantic content.
interface SkeletonProps {
  /** Width — a number is pixels, a string is used verbatim (default "100%"). */
  w?: number | string;
  /** Height — a number is pixels (default 12). */
  h?: number | string;
  /** Border radius — a number is pixels (default 4). */
  r?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  w = "100%",
  h = 12,
  r = 4,
  className = "",
  style,
}: SkeletonProps): JSX.Element {
  return (
    <span
      className={["sk", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      style={{ display: "block", width: w, height: h, borderRadius: r, ...style }}
    />
  );
}
