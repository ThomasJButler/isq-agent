import type { CSSProperties, JSX, ReactNode } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "accent" | "claude";

interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  leadingIcon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Pill badge ported from the prototype's <Badge> (components.jsx:62). The
// `claude` variant is the ONLY home for Crail orange (#CC785C) in the whole UI —
// the "Powered by Claude" mark; every other variant uses paper / semantic /
// river-blue tints. `dot` prepends a small status dot in the current colour.
export function Badge({
  children,
  variant = "default",
  dot,
  leadingIcon,
  className = "",
  style,
}: BadgeProps): JSX.Element {
  const classes = ["badge", `badge-${variant}`, className].filter(Boolean).join(" ");
  return (
    <span className={classes} style={style}>
      {dot ? <span className="badge-dot" /> : null}
      {leadingIcon}
      {children}
    </span>
  );
}
