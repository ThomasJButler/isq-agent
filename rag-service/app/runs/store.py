"""In-memory run store (v1.1 #18).

/process-questionnaire saves its canonical envelope here under a generated run_id so
the dashboard can fetch it back via GET /runs/{id}. The store is intentionally
in-memory and bounded: runs are ephemeral on the single-instance Render deploy (lost on
restart) and the oldest are evicted past the cap, so memory stays bounded. Swap for a
real store (Redis/Postgres) if runs ever need to outlive the process or scale out.
"""

import re
import uuid
from collections import OrderedDict
from threading import Lock
from typing import Any

# Bound the store so a long-lived process can't grow unboundedly under the free demo.
_MAX_RUNS = 200


class RunStore:
    """A bounded, thread-safe map of run_id -> canonical envelope (oldest evicted)."""

    def __init__(self, max_runs: int = _MAX_RUNS) -> None:
        self._runs: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._max = max_runs
        self._lock = Lock()

    def save(self, run_id: str, envelope: dict[str, Any]) -> None:
        with self._lock:
            self._runs[run_id] = envelope
            self._runs.move_to_end(run_id)
            while len(self._runs) > self._max:
                self._runs.popitem(last=False)  # evict the oldest run

    def get(self, run_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._runs.get(run_id)


# Process-wide singleton shared by the assembler (writes) and GET /runs/{id} (reads).
run_store = RunStore()


def make_run_id(filename: str) -> str:
    """A readable, unique run id: a filename slug plus a short random suffix.

    The slug keeps the id meaningful in URLs (e.g. sunflowers-charity-isq-1a2b3c4d); the
    suffix makes repeated runs of the same file distinct.
    """
    stem = filename.rsplit(".", 1)[0].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")[:40] or "run"
    return f"{slug}-{uuid.uuid4().hex[:8]}"
