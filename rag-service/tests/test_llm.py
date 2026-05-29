"""Tests for the shared Anthropic call helper (temperature-deprecation resilience).

Newer Claude models (e.g. Opus 4.7) reject the `temperature` parameter as deprecated.
create_message() passes kwargs straight through, but if the model rejects `temperature`
it retries once without it, so the same code works across old and new models.
"""

import httpx
import pytest
from anthropic import BadRequestError

from app.core.llm import create_message


def _bad_request(message: str) -> BadRequestError:
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(
        400, request=request, json={"error": {"message": message}}
    )
    return BadRequestError(message, response=response, body=None)


class _Client:
    """Minimal stand-in: records calls and raises a scripted error first if given one."""

    def __init__(self, error=None):
        self._error = error
        self.calls = []
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._error is not None and len(self.calls) == 1:
            raise self._error
        return "RESPONSE"


def test_passes_through_on_success():
    client = _Client()
    result = create_message(
        client, model="claude-sonnet-4-5", temperature=0, max_tokens=10
    )
    assert result == "RESPONSE"
    assert len(client.calls) == 1
    assert client.calls[0]["temperature"] == 0  # untouched on the happy path


def test_retries_without_temperature_when_deprecated():
    client = _Client(error=_bad_request("temperature is deprecated for this model"))
    result = create_message(
        client, model="claude-opus-4-7", temperature=0, max_tokens=10
    )
    assert result == "RESPONSE"
    assert len(client.calls) == 2  # first failed, retried
    assert "temperature" in client.calls[0]  # first attempt had it
    assert "temperature" not in client.calls[1]  # retry dropped it


def test_reraises_unrelated_bad_request():
    client = _Client(error=_bad_request("max_tokens is too large"))
    with pytest.raises(BadRequestError):
        create_message(client, model="claude-opus-4-7", temperature=0, max_tokens=10)
    assert len(client.calls) == 1  # no retry for an unrelated error


def test_does_not_retry_when_no_temperature_set():
    # A temperature-deprecation error with no temperature kwarg to drop should re-raise,
    # not loop.
    client = _Client(error=_bad_request("temperature is deprecated for this model"))
    with pytest.raises(BadRequestError):
        create_message(client, model="claude-opus-4-7", max_tokens=10)
    assert len(client.calls) == 1
