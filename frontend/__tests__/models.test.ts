import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL, MODEL_STORAGE_KEY, prettyModelId } from "@/lib/models";

// The model picker (Settings) and the upload "Backed by" tile share this metadata so
// the displayed model can't drift from the one actually sent. prettyModelId formats a
// real model id for display (the version suffix "-N-M" -> "N.M") to match the tile's
// house style (claude-sonnet-4.5, voyage-3-large).

describe("prettyModelId", () => {
  it("renders the version suffix with a dot", () => {
    expect(prettyModelId("claude-sonnet-4-5")).toBe("claude-sonnet-4.5");
    expect(prettyModelId("claude-sonnet-4-6")).toBe("claude-sonnet-4.6");
    expect(prettyModelId("claude-opus-4-8")).toBe("claude-opus-4.8");
    expect(prettyModelId("claude-opus-4-7")).toBe("claude-opus-4.7");
    expect(prettyModelId("claude-haiku-4-5")).toBe("claude-haiku-4.5");
  });

  it("leaves an unrecognised id unchanged", () => {
    expect(prettyModelId("some-other-model")).toBe("some-other-model");
    expect(prettyModelId("")).toBe("");
  });
});

describe("model constants", () => {
  it("exposes the storage key and the backend default model", () => {
    expect(MODEL_STORAGE_KEY).toBe("isq-model");
    expect(DEFAULT_MODEL).toBe("claude-sonnet-4-5");
  });
});
