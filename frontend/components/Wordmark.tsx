import type { JSX } from "react";

// The AI sparkle next to "Agent". The prototype drew it with a CSS `clip-path`
// polygon; Slice 17 tweak #1 calls for an inline SVG <polygon> with
// shape-rendering="geometricPrecision", so it ships that way from the start to
// avoid later rework. The points mirror the prototype's clip-path star scaled
// to a 0–10 viewBox. Decorative, so it's hidden from assistive tech.
function Sparkle(): JSX.Element {
  return (
    <svg
      className="sparkle"
      viewBox="0 0 10 10"
      width="9"
      height="9"
      fill="currentColor"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="5,0 6,4 10,5 6,6 5,10 4,6 0,5 4,4" />
    </svg>
  );
}

// "ISQ Agent" wordmark: "ISQ" in ink, "Agent" in the river-blue accent with the
// sparkle. Purely presentational — TopBar (and later the footer) decide whether
// it's a link. The empty gap span reproduces the prototype's precise 6px space
// between the two words; the surrounding link supplies the accessible name.
export function Wordmark(): JSX.Element {
  return (
    <span className="wordmark">
      <span>ISQ</span>
      <span className="wordmark-gap" aria-hidden="true" />
      <span className="accent">
        Agent
        <Sparkle />
      </span>
    </span>
  );
}
