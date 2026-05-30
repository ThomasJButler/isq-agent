// Shared model metadata for the Settings picker and the upload "Backed by" tile, so
// the model shown on the upload page can't drift from the one the picker persists.

/** localStorage key the Settings picker writes and the upload flow reads. */
export const MODEL_STORAGE_KEY = "isq-model";

/** The backend's default generation model (settings.anthropic_model). */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

/**
 * Format a real model id for display. The trailing version "-N-M" becomes "N.M" to match
 * the "Backed by" tile's house style (e.g. claude-opus-4-8 -> claude-opus-4.8). An id that
 * doesn't end in that shape is returned unchanged.
 */
export function prettyModelId(modelId: string): string {
  return modelId.replace(/-(\d+)-(\d+)$/, "-$1.$2");
}
