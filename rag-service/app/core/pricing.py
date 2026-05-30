"""Model-aware token pricing (USD per million tokens).

The service is model-selectable via ANTHROPIC_MODEL, so cost must track whichever model is
actually running rather than a single hardcoded rate. This is the one place rates live: add a
row here when enabling a new model, and every cost calculation picks it up.

Rates are Anthropic list pricing as (input, output) USD per million tokens. The Sonnet 4.5
row is the one this project has run on from the start; confirm any row against the current
console pricing (https://www.anthropic.com/pricing) before relying on the figure for billing.
An unknown model falls back to the default model's rate, so cost is an approximation rather
than a hidden wrong number; add the model to the table to make it exact.
"""

DEFAULT_MODEL = "claude-sonnet-4-5"

# model id -> (input_rate, output_rate) USD per million tokens.
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "claude-sonnet-4-5": (3.0, 15.0),
    "claude-sonnet-4-6": (3.0, 15.0),  # same Sonnet tier; confirm in console
    "claude-opus-4-7": (15.0, 75.0),  # Opus tier list pricing; confirm in console
    "claude-opus-4-8": (15.0, 75.0),  # same Opus tier as 4.7; confirm in console
    "claude-haiku-4-5": (1.0, 5.0),  # Haiku tier; confirm in console
}


def rates_for(model: str) -> tuple[float, float]:
    """Return (input_rate, output_rate) per Mtok for a model, falling back to the default."""
    return MODEL_PRICING.get(model, MODEL_PRICING[DEFAULT_MODEL])
