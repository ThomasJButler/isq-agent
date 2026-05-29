import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Slice 2 guard. The design-system tokens must be ported into globals.css as
// CSS variables, and the type-family tokens must resolve to the next/font CSS
// variables produced in layout.tsx (not the prototype's Google Fonts @import).
//
// What this proves: the token + font contract every later component slice binds
// to is present and correct in the source of truth.
// What it does NOT prove: runtime computed values — jsdom never loads the
// PostCSS/Tailwind-built stylesheet, so a getComputedStyle check here would
// assert nothing real. Visual resolution is covered by `npm run build`.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../app/globals.css");
const layout = read("../app/layout.tsx");

describe("Slice 2 — design tokens in globals.css", () => {
  it("declares the warm-paper + ink + accent palette on :root", () => {
    expect(css).toMatch(/--bg-0:\s*#FAF9F5/i); // page paper
    expect(css).toMatch(/--fg-1:\s*#191919/i); // primary text
    expect(css).toMatch(/--river-blue:\s*#2A7BE2/i); // interactive accent
    expect(css).toMatch(/--river-ink:\s*#0A0A0A/i); // black pill CTAs
    expect(css).toMatch(/--claude-orange:\s*#CC785C/i); // Powered-by-Claude only
  });

  it("wires the type families to the next/font CSS variables", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-geist-sans\)/);
    expect(css).toMatch(/--font-mono:\s*var\(--font-geist-mono\)/);
    expect(css).toMatch(/--font-serif:\s*var\(--font-source-serif\)/);
  });

  it("ships a class-based dark theme and drops the prototype's Google Fonts @import", () => {
    expect(css).toMatch(/\.dark\b/);
    expect(css).not.toMatch(/fonts\.googleapis\.com/);
  });
});

describe("Slice 2 — fonts loaded via next/font", () => {
  it("loads Geist, Geist Mono and Source Serif 4 and exposes the serif variable the CSS binds to", () => {
    expect(layout).toMatch(/Source_Serif_4/);
    expect(layout).toMatch(/--font-source-serif/);
    // the variables the globals.css type tokens reference must be produced here
    expect(layout).toMatch(/--font-geist-sans/);
    expect(layout).toMatch(/--font-geist-mono/);
  });
});
