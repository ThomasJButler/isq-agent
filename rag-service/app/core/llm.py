"""Shared Anthropic call helper.

Wraps client.messages.create so a single quirk is handled in one place: newer Claude
models (e.g. Opus 4.7) reject the `temperature` parameter as deprecated. We keep passing
temperature for determinism on models that accept it, but if a model rejects it we retry
once without it. This keeps the service genuinely model-agnostic across versions.
"""

from anthropic import BadRequestError


def _is_temperature_deprecated(exc: BadRequestError) -> bool:
    """True when the 400 is specifically about temperature being deprecated/unsupported."""
    message = str(getattr(exc, "message", "") or exc).lower()
    return "temperature" in message and (
        "deprecat" in message or "unsupported" in message or "not support" in message
    )


def create_message(client, **kwargs):
    """Call client.messages.create(**kwargs); if the model rejects `temperature`, retry
    once without it. All other errors propagate unchanged."""
    try:
        return client.messages.create(**kwargs)
    except BadRequestError as exc:
        if "temperature" in kwargs and _is_temperature_deprecated(exc):
            kwargs.pop("temperature")
            return client.messages.create(**kwargs)
        raise
