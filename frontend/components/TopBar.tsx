"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

const REPO_URL = "https://github.com/ThomasJButler/isq-agent";

const NAV_LINKS = [
  { href: "/upload", label: "Upload" },
  { href: "/settings", label: "Settings" },
] as const;

// The prototype's I.link glyph, inlined for this slice. A shared icon set lands
// in a later slice; until then the only icon the TopBar needs travels with it.
function LinkIcon(): JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Sticky top bar: wordmark home link on the left, primary nav + external repo
// link on the right. Active state comes from the live route (usePathname),
// replacing the prototype's hand-rolled navigate()/route props with App Router
// idioms. Client component because usePathname reads router context.
export function TopBar(): JSX.Element {
  const pathname = usePathname();
  return (
    <header className="topbar" data-screen-label="TopBar">
      <Link href="/" className="wordmark-link" aria-label="ISQ Agent home">
        <Wordmark />
      </Link>
      <nav aria-label="Primary">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="repo-link">
          <LinkIcon />
          Repo
        </a>
        {/* Far-right light/dark toggle (Slice 17 tweak #6) — the visible control
            for the dark theme the tokens already support. */}
        <ThemeToggle />
      </nav>
    </header>
  );
}
