import type { JSX, ReactNode } from "react";

// The prototype's single .toast pill (components.jsx:128): an optional leading
// icon followed by the message. role="status" + aria-live make it a polite live
// announcement — an a11y addition over the prototype, which set no role. The
// prototype defines only one .toast style, so there is no variant.
interface ToastProps {
  message: string;
  icon?: ReactNode;
}

export function Toast({ message, icon }: ToastProps): JSX.Element {
  return (
    <div className="toast" role="status" aria-live="polite">
      {icon}
      <span>{message}</span>
    </div>
  );
}
