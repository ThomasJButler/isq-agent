import type { JSX } from "react";
import { WarningIcon, XIcon } from "@/components/icons";

// Page-level error banner — a faithful port of the prototype's <ErrorBanner>
// (components.jsx:104). role="alert" so the message is announced when it appears;
// the danger-red left border + WarningIcon mark it as an error without colour
// being the only signal. Inline-styled like the prototype (no new CSS class), so
// it adds nothing to the orange-isolation surface.
//
// Two faithful-to-THIS-system divergences from the prototype:
//   - the radius is var(--radius-lg) (the card radius), NOT the prototype's
//     var(--r-md): the hybrid remapped --r-md to --radius-pill (9999px), which
//     would render the banner as a pill. --radius-lg keeps it a card-like alert.
//   - the icon-only dismiss carries an aria-label="Dismiss" (the WarningIcon/XIcon
//     are aria-hidden, so without it the button would have no accessible name) —
//     the same raw-button-with-aria-label pattern as the Settings reveal toggle.
interface ErrorBannerProps {
  /** The message to show. */
  message: string;
  /** Optional dismiss handler; when present, renders a dismiss control. */
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps): JSX.Element {
  return (
    <div
      role="alert"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeftWidth: 4,
        borderLeftColor: "var(--error)",
        padding: "12px 16px",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 13,
      }}
    >
      <WarningIcon size={16} style={{ color: "var(--error)", flex: "0 0 auto" }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{ marginLeft: "auto" }}
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}
