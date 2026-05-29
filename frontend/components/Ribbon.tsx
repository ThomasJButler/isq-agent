import type { HTMLAttributes, JSX, ReactNode } from "react";

// The hybrid design's signature: a diagonal river-blue ribbon behind the landing
// hero (prototype pages.jsx Screen 1 + the .river-ribbon CSS in tokens.css). It is
// LANDING-ONLY by design, but that's the consuming screen's call, not the
// component's — this stays page-agnostic so the landing screen can drop it without
// touching anything else. Slice 17 tweak #2 flags it as the "AI-blob" risk to
// stress-test at 1440/1280/1024/768/375 and remove if it reads as a blob (fallback:
// a faint underline + the calmer `subtle` tint behind the upload CTA).
//
// The two skewed gradient fills are real <span> children, not pseudo-elements: the
// prototype notes some html-to-image renderers drop skewed ::before/::after, so
// real spans keep screenshots faithful. They sit behind the content (z-index 0,
// pointer-events: none) and carry no text, so they are aria-hidden — only `children`
// reaches the accessibility tree. The content is wrapped in `.river-ribbon-content`
// (position: relative; z-index: 1) so it always paints above the fills; the
// prototype set that z-index inline per usage, which a consumer could forget, so the
// lift lives in the component instead.
interface RibbonProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Lower-opacity gradients — the calmer fallback if the bold ribbon reads as a blob. */
  subtle?: boolean;
}

export function Ribbon({
  children,
  subtle = false,
  className = "",
  ...rest
}: RibbonProps): JSX.Element {
  const classes = ["river-ribbon", subtle ? "subtle" : "", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      <span className="river-ribbon-fill river-ribbon-fill-1" aria-hidden="true" />
      <span className="river-ribbon-fill river-ribbon-fill-2" aria-hidden="true" />
      <div className="river-ribbon-content">{children}</div>
    </div>
  );
}
