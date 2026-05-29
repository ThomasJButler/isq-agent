import type { CSSProperties, JSX, MouseEventHandler, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Pill button ported from the prototype's <Button> (components.jsx:44). Variants:
// primary = black ink CTA (#0A0A0A via --river-ink), secondary = white pill,
// ghost, and link (river-blue text, never the Claude orange). Passing `href`
// swaps the <button> for an <a> so the same pill styling covers navigation —
// a screen slice wraps it in next/link where real routing is needed. Press-scale
// is 0.99 (Slice 17 tweak #3 settled 0.985 → 0.99), baked into .btn:active.
export function Button({
  children,
  variant = "secondary",
  size = "md",
  type = "button",
  disabled,
  href,
  onClick,
  leadingIcon,
  trailingIcon,
  className = "",
  style,
}: ButtonProps): JSX.Element {
  const sizeClass = size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "";
  const classes = ["btn", `btn-${variant}`, sizeClass, className].filter(Boolean).join(" ");
  const content = (
    <>
      {leadingIcon}
      {children ? <span>{children}</span> : null}
      {trailingIcon}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} style={style} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} style={style} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
