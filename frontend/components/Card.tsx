import type { HTMLAttributes, JSX, ReactNode } from "react";

export type CardVariant = "default" | "paper" | "lift";
export type CardPadding = "none" | "md" | "lg";

// The prototype never defines a <Card> — it hand-writes `card card-pad`
// containers everywhere (components.jsx / pages.jsx). This wraps that pattern:
// the always-present `card` base plus a `paper`/`lift` modifier and a padding
// scale (md -> card-pad, lg -> card-pad-lg). It extends div attributes and
// spreads `...rest` because cards are generic containers — the prototype layers
// one-off `style`/`role`/border tweaks onto them (flagged answer, warning
// background, grid-column), which enumerated props would not cover cleanly.
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...rest
}: CardProps): JSX.Element {
  const variantClass = variant === "paper" ? "card-paper" : variant === "lift" ? "card-lift" : "";
  const paddingClass = padding === "lg" ? "card-pad-lg" : padding === "md" ? "card-pad" : "";
  const classes = ["card", variantClass, paddingClass, className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
