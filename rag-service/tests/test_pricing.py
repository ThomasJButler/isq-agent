"""Tests for model-aware token pricing.

The service is model-selectable (ANTHROPIC_MODEL), so cost must track whichever model is
running, not a single hardcoded rate. rates_for() returns the (input, output) USD-per-Mtok
rate for a known model, and falls back to the default model's rate for an unknown one.
"""

from app.core.pricing import DEFAULT_MODEL, rates_for


def test_known_model_returns_its_own_rate():
    in_rate, out_rate = rates_for("claude-sonnet-4-5")
    assert (in_rate, out_rate) == (3.0, 15.0)


def test_opus_is_priced_higher_than_sonnet():
    sonnet_in, sonnet_out = rates_for("claude-sonnet-4-5")
    opus_in, opus_out = rates_for("claude-opus-4-7")
    assert opus_in > sonnet_in
    assert opus_out > sonnet_out


def test_unknown_model_falls_back_to_default_rate():
    assert rates_for("some-future-model-x") == rates_for(DEFAULT_MODEL)


def test_default_model_is_known():
    # The default must always have an explicit rate, never the fallback by accident.
    from app.core.pricing import MODEL_PRICING

    assert DEFAULT_MODEL in MODEL_PRICING
