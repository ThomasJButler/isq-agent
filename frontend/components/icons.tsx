import type { JSX, ReactNode, SVGProps } from "react";

// Shared line-art icon set — a faithful port of the prototype's icons.jsx `Icon`
// wrapper (stroke-only, currentColor, 24x24 viewBox, rounded caps/joins). The
// prototype kept every glyph in one module; this is the first screen to need a
// handful, so the set lands here and later screens extend it (replacing the
// one-off LinkIcon the TopBar inlined in Slice 6). Glyphs are aria-hidden by
// default — they sit beside real text labels, so they add no accessibility name.
//
// key / spark / sliders / database / refresh / check are the prototype's exact
// path data. eye / eyeOff have no prototype original (the prototype showed keys
// pre-masked with no reveal control); they are drawn in the same stroke style to
// power the masked-key reveal toggle Slice 12 needs.
//
// arrowRight / arrowDown / upload / search / download / warning (Slice 13) are
// the prototype's exact path data too — the Landing screen's hero CTAs, the
// three "how it works" step glyphs, and the snapshot's flagged badge.
//
// file / email / x (Slice 14) are the prototype's exact path data — the /upload
// example shortcuts, the "Or send to" inbox helper, and the ErrorBanner dismiss.
//
// hash / zap / clock (Slice 15) are the prototype's exact path data — the
// Processing screen's "Answered", "Est. cost", and "Elapsed" counter tiles.
//
// fileDocx / fileXlsx / fileJson / copy (Slice 16) are the prototype's exact path
// data — the Results screen's three download buttons + the "Copy link" affordance.

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  /** Square size in pixels (default 16). */
  size?: number;
}

function Icon({ size = 16, children, ...rest }: IconProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function KeyIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="7" cy="15" r="4" />
      <path d="m10 12 11-11" />
      <path d="m18 5 3 3" />
      <path d="m15 8 3 3" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8z" />
    </Icon>
  );
}

export function SlidersIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <line x1="4" y1="6" x2="14" y2="6" />
      <line x1="18" y1="6" x2="20" y2="6" />
      <circle cx="16" cy="6" r="2" />
      <line x1="4" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <circle cx="8" cy="12" r="2" />
      <line x1="4" y1="18" x2="14" y2="18" />
      <line x1="18" y1="18" x2="20" y2="18" />
      <circle cx="16" cy="18" r="2" />
    </Icon>
  );
}

export function DatabaseIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
    </Icon>
  );
}

export function RefreshIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M5 12l4 4 10-10" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.4 5.1A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.1 3.9" />
      <path d="M6.3 6.3A17.7 17.7 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.2-.6" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </Icon>
  );
}

export function ArrowDownIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 13l7 7 7-7" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 21h14" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  );
}

export function FileIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Icon>
  );
}

export function EmailIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Icon>
  );
}

export function XIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function HashIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </Icon>
  );
}

export function ZapIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function FileDocxIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </Icon>
  );
}

export function FileXlsxIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13l5 5M14 13l-5 5" />
    </Icon>
  );
}

export function FileJsonIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M11 12c-1 0-1.5.5-1.5 1.5v1c0 1-.5 1.5-1.5 1.5 1 0 1.5.5 1.5 1.5v1c0 1 .5 1.5 1.5 1.5" />
      <path d="M13 12c1 0 1.5.5 1.5 1.5v1c0 1 .5 1.5 1.5 1.5-1 0-1.5.5-1.5 1.5v1c0 1-.5 1.5-1.5 1.5" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}

// sun / moon (Slice 17 tweak #6) — the light/dark toggle's two faces. The sun is
// the prototype's stroke style (disc + eight rays); the moon is a single crescent
// path. The toggle shows the moon in light mode (switch-to-dark) and the sun in
// dark mode (switch-to-light).
export function SunIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps): JSX.Element {
  return (
    <Icon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  );
}
