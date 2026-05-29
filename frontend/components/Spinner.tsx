import type { JSX } from "react";

// A small river-blue ring for inline loading states — no prototype original.
// role="status" + aria-label announce it to assistive tech; the CSS spin is
// frozen by the global prefers-reduced-motion rule in globals.css. `size` sets
// the diameter (pixels); the 2px ring colour comes from the .spinner class.
interface SpinnerProps {
  /** Accessible label announced by screen readers (default "Loading"). */
  label?: string;
  /** Diameter in pixels (default 16). */
  size?: number;
  className?: string;
}

export function Spinner({
  label = "Loading",
  size = 16,
  className = "",
}: SpinnerProps): JSX.Element {
  return (
    <span
      role="status"
      aria-label={label}
      className={["spinner", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    />
  );
}
