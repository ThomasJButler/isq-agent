import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Source-level guard for the locked design rule: Crail orange (#CC785C) lives in
// EXACTLY ONE place — the claude badge ("Powered by Claude"). jsdom never loads
// the PostCSS/Tailwind-built stylesheet, so computed colour can't be asserted in
// a render test; instead we read globals.css and check the per-variant rule
// bodies directly. Same `import.meta.url` read pattern as tokens.test.ts — and a
// plain `.ts` file, since @vitejs/plugin-react rewrites import.meta.url in .tsx.
//
// What this proves: orange is wired to the claude badge and nowhere else across
// the Slice 7 button/badge CSS. What it does NOT prove: runtime rendering — the
// visual is covered by `npm run build` + the Slice 17 orange audit.
//
// NB: the path goes through a variable, not a string literal, on purpose. Vite
// statically rewrites the `new URL("<literal>", import.meta.url)` pattern into an
// asset URL (non-file: scheme → readFileSync throws), so the indirection keeps
// import.meta.url a real file URL. Same approach as tokens.test.ts.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../app/globals.css");

// Body of the first rule whose selector matches exactly (e.g. `.btn-link {…}`,
// not `.btn-link:hover {…}`). The component CSS has no nested braces, so the
// non-greedy `[^}]*` reliably stops at that rule's closing brace.
function ruleBody(selector: string): string {
  const escaped = selector.replace(/\./g, "\\.");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

describe("Slice 7 — orange stays on the claude badge only", () => {
  const ORANGE = /claude-orange|#cc785c/i;

  it("paints the claude badge in Crail orange", () => {
    expect(ruleBody(".badge-claude")).toMatch(ORANGE);
  });

  it("keeps orange off every other button and badge variant", () => {
    const others = [
      ".badge-default",
      ".badge-success",
      ".badge-warning",
      ".badge-error",
      ".badge-accent",
      ".btn-primary",
      ".btn-secondary",
      ".btn-ghost",
      ".btn-link",
    ];
    for (const selector of others) {
      expect(ruleBody(selector), `${selector} must not reference orange`).not.toMatch(ORANGE);
    }
  });
});

describe("Slice 8 — orange stays off the card + confidence-bar CSS", () => {
  const ORANGE = /claude-orange|#cc785c/i;

  it("keeps orange off every card and confidence-bar rule", () => {
    const surfaces = [
      ".card",
      ".card-paper",
      ".card-lift",
      ".conf",
      ".conf-bar",
      ".conf-high > span",
      ".conf-mid > span",
      ".conf-low > span",
    ];
    for (const selector of surfaces) {
      expect(ruleBody(selector), `${selector} must not reference orange`).not.toMatch(ORANGE);
    }
  });
});

describe("Slice 9 — orange stays off the dropzone, toast, skeleton + spinner CSS", () => {
  const ORANGE = /claude-orange|#cc785c/i;

  it("keeps orange off every dropzone, toast, skeleton, and spinner rule", () => {
    const surfaces = [
      ".dropzone",
      ".dropzone.dragging",
      ".dropzone.error",
      ".toast-wrap",
      ".toast",
      ".sk",
      ".spinner",
    ];
    for (const selector of surfaces) {
      expect(ruleBody(selector), `${selector} must not reference orange`).not.toMatch(ORANGE);
    }
  });
});

describe("Slice 10 — orange stays off the tabs, timeline + progress CSS", () => {
  const ORANGE = /claude-orange|#cc785c/i;

  it("keeps orange off every tab, timeline, progress, and answer-body rule", () => {
    const surfaces = [
      ".tabs",
      ".tab",
      ".tab.active::after",
      ".timeline",
      ".tl-dot",
      ".tl-step.done .tl-dot",
      ".tl-step.active .tl-dot",
      ".tl-title",
      ".tl-sub",
      ".progress",
      ".progress > span",
      ".pretty",
    ];
    for (const selector of surfaces) {
      expect(ruleBody(selector), `${selector} must not reference orange`).not.toMatch(ORANGE);
    }
  });
});

describe("Slice 11 — the diagonal ribbon is river-blue only, never orange", () => {
  const ORANGE = /claude-orange|#cc785c/i;

  it("keeps orange off every ribbon rule (the fills are blue gradients)", () => {
    const surfaces = [
      ".river-ribbon",
      ".river-ribbon-content",
      ".river-ribbon-fill",
      ".river-ribbon-fill-1",
      ".river-ribbon-fill-2",
      ".river-ribbon.subtle .river-ribbon-fill-1",
      ".river-ribbon.subtle .river-ribbon-fill-2",
    ];
    for (const selector of surfaces) {
      expect(ruleBody(selector), `${selector} must not reference orange`).not.toMatch(ORANGE);
    }
  });
});
