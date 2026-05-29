"use client";

import { useSyncExternalStore } from "react";
import type { JSX } from "react";
import { MoonIcon, SunIcon } from "./icons";

// localStorage key shared with the pre-hydration script in app/layout.tsx. The
// script can't import this module (it's an inline string that runs before any
// bundle), so the literal is duplicated there — keep the two in lockstep.
const STORAGE_KEY = "isq-theme";
// Same-tab notification: clicking the toggle mutates <html> imperatively, which
// the `storage` event (other tabs only) won't catch, so we dispatch this to wake
// our own subscriber and re-read the live class.
const THEME_EVENT = "isq-theme-change";

// The `.dark` class on <html> is browser state that the server can't know, so we
// read it through useSyncExternalStore — the React-blessed way to surface an
// external value without a hydration mismatch. getServerSnapshot returns light,
// so the server HTML and the first client paint agree; React then swaps in the
// real class value after hydration with no warning and no setState-in-effect.
function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

// Visible light/dark toggle (Slice 17 tweak #6). The dark tokens already live in
// globals.css behind `:root.dark, .dark`; this control is what flips that class.
export function ThemeToggle(): JSX.Element {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle(): void {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Persistence is best-effort: localStorage can throw when disabled (private
      // mode / blocked storage). The class still flips, so the toggle works this
      // session — only the remembered choice is lost. Nothing to surface.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}
