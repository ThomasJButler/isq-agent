"""v1.2 backend: model selection, the Haiku query-rewriter default, and client singletons.

The dashboard model picker sends `model`; the API validates it against an allowlist and
threads it to answer generation (query rewriting stays on Haiku). Clients are shared
singletons so Pinecone plugin discovery happens once per process, not once per question.
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core import pinecone_client as pc
from app.core import config as config_mod
from app.core.config import resolve_generation_model, settings
from app.main import app
from app.rag.query_rewriter import QueryRewriter
from app.voyage import client as voyage_mod

client = TestClient(app)


def _ok_result():
    return {
        "answer": "Yes, we do.",
        "citations": [],
        "self_score": {
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        },
        "needs_review_reason": None,
        "metrics": {
            "tokens_in": 10,
            "tokens_out": 5,
            "cost_usd": 0.001,
            "latency_ms": 100.0,
        },
    }


class TestResolveGenerationModel:
    def test_allows_each_known_model(self):
        for m in config_mod.ALLOWED_GENERATION_MODELS:
            assert resolve_generation_model(m) == m

    def test_unknown_model_falls_back_to_default(self):
        assert resolve_generation_model("gpt-4o") == settings.anthropic_model

    def test_none_falls_back_to_default(self):
        assert resolve_generation_model(None) == settings.anthropic_model


class TestModelThreadedToGenerator:
    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_requested_model_is_passed_to_generator(
        self, mock_retriever, mock_generator
    ):
        mock_retriever.return_value.retrieve.return_value = [
            {"id": "c0", "score": 0.9, "metadata": {"text": "x"}}
        ]
        mock_generator.return_value.generate.return_value = _ok_result()
        resp = client.post(
            "/process-questionnaire",
            json={
                "origin": "X",
                "filename": "x.pdf",
                "questions": [{"question_id": "q1", "text": "Q?", "index": 1}],
                "model": "claude-opus-4-8",
            },
        )
        assert resp.status_code == 200
        mock_generator.assert_called_with(model="claude-opus-4-8")

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_invalid_model_falls_back_to_default(self, mock_retriever, mock_generator):
        mock_retriever.return_value.retrieve.return_value = [
            {"id": "c0", "score": 0.9, "metadata": {"text": "x"}}
        ]
        mock_generator.return_value.generate.return_value = _ok_result()
        resp = client.post(
            "/process-questionnaire",
            json={
                "origin": "X",
                "filename": "x.pdf",
                "questions": [{"question_id": "q1", "text": "Q?", "index": 1}],
                "model": "definitely-not-a-model",
            },
        )
        assert resp.status_code == 200
        mock_generator.assert_called_with(model=settings.anthropic_model)


class TestQueryRewriterUsesHaiku:
    def test_rewriter_defaults_to_the_configured_rewrite_model(self):
        assert QueryRewriter().model == settings.anthropic_query_rewrite_model
        # ...and that default is a Haiku tier, kept off the heavy generation model.
        assert "haiku" in settings.anthropic_query_rewrite_model


class TestClientSingletons:
    def test_pinecone_client_is_a_shared_singleton(self):
        pc._pinecone_client = None
        with patch.object(pc, "PineconeClient") as MockPC:
            first = pc.get_pinecone_client()
            second = pc.get_pinecone_client()
            assert first is second
            MockPC.assert_called_once()  # constructed once, reused thereafter
        pc._pinecone_client = None

    def test_voyage_client_is_a_shared_singleton(self):
        voyage_mod._voyage_client = None
        with patch.object(voyage_mod, "VoyageClient") as MockVC:
            first = voyage_mod.get_voyage_client()
            second = voyage_mod.get_voyage_client()
            assert first is second
            MockVC.assert_called_once()
        voyage_mod._voyage_client = None
