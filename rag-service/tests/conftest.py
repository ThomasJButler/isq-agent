"""Shared pytest fixtures for the rag-service suite."""

import pytest

from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def _rate_limiter_off():
    """Rate limiting is disabled for tests by default.

    slowapi's limiter keeps an in-memory window keyed on client IP, and the
    TestClient always presents the same IP — so an enabled limiter would let one
    test's requests count against another's and cause order-dependent 429s. The
    dedicated rate-limit test re-enables the limiter (and resets the window) for its
    own scope; everything else runs with the decorators inert.
    """
    previous = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = previous
