"""ASGI middleware that caps the request body size before anything buffers it (v1.1).

Why this isn't done in the endpoint: Starlette's multipart parser writes an uploaded
file part to a SpooledTemporaryFile with no size limit of its own (max_part_size only
guards in-memory form *fields*, not file parts), and FastAPI fully parses the body
before the handler runs. So a per-request size check inside POST /runs executes only
*after* the whole upload has already been buffered to disk — too late to stop a
multi-gigabyte upload from filling a small instance's disk.

Enforcing the cap here, on the raw ASGI receive stream, rejects an oversized body before
the parser touches it:
  - an honest Content-Length over the cap is refused immediately, before reading a byte;
  - a body that omits Content-Length (chunked transfer) is metered as it streams and cut
    off with 413 the moment the running total crosses the limit.

The limit is read live from settings on each request, so it tracks config (and test
monkeypatching) without a restart.
"""

import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings


class _BodyTooLarge(Exception):
    """Internal signal: the streamed body crossed the cap mid-read."""


def _content_length(scope: Scope) -> int | None:
    """The declared Content-Length, or None if absent/unparseable."""
    for name, value in scope.get("headers", []):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


async def _send_413(send: Send) -> None:
    """Emit a 413 whose JSON body matches FastAPI's HTTPException shape ({"detail": ...})."""
    detail = f"Request body too large; the limit is {settings.max_upload_mb} MB."
    body = json.dumps({"detail": detail}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


class MaxBodySizeMiddleware:
    """Reject any HTTP request whose body exceeds settings.max_upload_mb.

    Sits inside CORS (so the 413 still carries CORS headers) and outside the exception
    middleware (so the streamed-overflow signal is caught here, not turned into a 500)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_bytes = int(settings.max_upload_mb * 1024 * 1024)

        # Fast path: an honest oversized Content-Length is refused before reading a byte.
        declared = _content_length(scope)
        if declared is not None and declared > max_bytes:
            await _send_413(send)
            return

        received = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > max_bytes:
                    raise _BodyTooLarge
            return message

        async def guarded_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, guarded_send)
        except _BodyTooLarge:
            # The overflow is detected during body parsing, before the handler can start a
            # response — so it's safe to send the 413 here. If a response had already begun
            # (a streaming handler reading the body late), re-raise rather than corrupt it.
            if response_started:
                raise
            await _send_413(send)
