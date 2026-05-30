"""Tests for MaxBodySizeMiddleware (v1.1 upload-size cost guard, #36 review fix).

Driven at the ASGI level so both enforcement paths are exercised directly:
  - an honest oversized Content-Length is refused before the app reads anything;
  - a body that omits Content-Length is metered as it streams and cut off with 413.

The coroutines are run with asyncio.run() inside plain sync tests, so no async pytest
plugin is required.
"""

import asyncio
import json

from app.core.body_limit import MaxBodySizeMiddleware
from app.core.config import settings


def _run(middleware, scope, receive):
    """Drive the middleware once, returning the list of ASGI messages it sent."""
    sent: list[dict] = []

    async def send(message):
        sent.append(message)

    asyncio.run(middleware(scope, receive, send))
    return sent


def _status(sent):
    start = next(m for m in sent if m["type"] == "http.response.start")
    return start["status"]


def _body(sent):
    return b"".join(
        m.get("body", b"") for m in sent if m["type"] == "http.response.body"
    )


def test_content_length_over_cap_is_refused_before_app_runs(monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 0.001)  # ~1 KB cap
    app_ran = False

    async def app(scope, receive, send):
        nonlocal app_ran
        app_ran = True

    mw = MaxBodySizeMiddleware(app)
    scope = {"type": "http", "headers": [(b"content-length", b"999999")]}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    sent = _run(mw, scope, receive)
    assert _status(sent) == 413
    assert not app_ran  # rejected before a single byte was read


def test_streaming_body_over_cap_is_cut_off_without_content_length(monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 0.001)  # ~1 KB cap

    async def app(scope, receive, send):
        # Drain the body the way a parser would; the overflow raises out of receive().
        more = True
        while more:
            message = await receive()
            more = message.get("more_body", False)
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    mw = MaxBodySizeMiddleware(app)
    scope = {"type": "http", "headers": []}  # no content-length -> streaming path

    chunks = iter([b"A" * 512, b"A" * 512, b"A" * 512])  # 1536 bytes > ~1 KB

    async def receive():
        try:
            return {"type": "http.request", "body": next(chunks), "more_body": True}
        except StopIteration:
            return {"type": "http.request", "body": b"", "more_body": False}

    sent = _run(mw, scope, receive)
    assert _status(sent) == 413
    assert b"too large" in _body(sent).lower()
    assert json.loads(_body(sent))["detail"]  # FastAPI-shaped error body


def test_body_under_cap_passes_through(monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 10)

    async def app(scope, receive, send):
        await app_drain(receive)
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    async def app_drain(receive):
        more = True
        while more:
            message = await receive()
            more = message.get("more_body", False)

    mw = MaxBodySizeMiddleware(app)
    scope = {"type": "http", "headers": [(b"content-length", b"5")]}

    async def receive():
        return {"type": "http.request", "body": b"hello", "more_body": False}

    sent = _run(mw, scope, receive)
    assert _status(sent) == 200
    assert _body(sent) == b"ok"


def test_non_http_scope_is_passed_through(monkeypatch):
    forwarded = False

    async def app(scope, receive, send):
        nonlocal forwarded
        forwarded = True

    mw = MaxBodySizeMiddleware(app)

    async def receive():
        return {"type": "websocket.receive"}

    async def send(message):
        pass

    asyncio.run(mw({"type": "websocket"}, receive, send))
    assert forwarded  # lifespan/websocket scopes bypass the body check
