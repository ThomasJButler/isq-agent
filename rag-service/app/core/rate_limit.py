"""Shared per-IP rate limiter (slowapi) for the v1.1 cost-protection layer.

The limiter lives here, not in main.py, so the api route modules can import it to
attach per-route limits without a circular import. Limits are applied per route via
``@limiter.limit(lambda: settings.rate_limit_*)`` — a callable so the value stays
env-tunable on Render and can be toggled in tests. main.py registers this instance on
``app.state.limiter`` and wires the 429 handler.

Default in-memory storage is fine for a single-instance deploy; point it at Redis if
the service is ever scaled horizontally (counts would otherwise be per-instance).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
