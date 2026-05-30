"""Tests for the in-memory run store (v1.1 #18).

The store persists each /process-questionnaire canonical envelope under a run_id so
the dashboard can fetch it back via GET /runs/{id}. Written FIRST (TDD). The store is
deliberately in-memory and bounded — runs are ephemeral on the single-instance deploy
(lost on restart), which is fine for the demo and keeps memory capped.
"""

from app.runs.store import RunStore, make_run_id


def _envelope(origin="Test Co"):
    return {
        "questionnaire_meta": {
            "run_id": "x",
            "origin": origin,
            "filename": "t.pdf",
            "received_at": None,
            "completed_at": "2026-01-01T00:00:00Z",
            "total_questions": 0,
        },
        "answers": [],
        "summary_metrics": {"banner": None},
    }


class TestRunStore:
    def test_save_and_get_round_trips(self):
        store = RunStore()
        env = _envelope()
        store.save("run-1", env)
        assert store.get("run-1") == env

    def test_get_missing_returns_none(self):
        store = RunStore()
        assert store.get("nope") is None

    def test_evicts_oldest_when_over_capacity(self):
        store = RunStore(max_runs=2)
        store.save("a", _envelope("A"))
        store.save("b", _envelope("B"))
        store.save("c", _envelope("C"))  # over capacity → oldest ("a") is evicted
        assert store.get("a") is None
        assert store.get("b") is not None
        assert store.get("c") is not None


class TestMakeRunId:
    def test_slug_from_filename_with_unique_suffix(self):
        rid = make_run_id("Sunflowers Charity ISQ.pdf")
        assert rid.startswith("sunflowers-charity-isq-")
        # The suffix makes repeated runs of the same file distinct.
        assert make_run_id("Sunflowers Charity ISQ.pdf") != rid

    def test_falls_back_when_filename_has_no_usable_slug(self):
        assert make_run_id("***.pdf").startswith("run-")
