"""
Pinecone vector-store client wrapper (Plan 4, Branch B).

A thin wrapper around the Pinecone v5 SDK. Responsibilities are deliberately
narrow:
- connect to a named index (failing loudly if it doesn't exist)
- upsert vectors in batches (Pinecone caps practical batch sizes; we use 100)
- query by vector and filter out low-confidence matches (min_score)

Source weighting (policies vs historical_isqs) is NOT done here — that is a
retrieval-ranking concern handled by app/rag/retriever.py (Branch C). Keeping
this wrapper dumb makes it trivially mockable and reusable.
"""

from typing import Any

from pinecone import Pinecone

from app.core.config import settings


class PineconeIndexError(Exception):
    """Raised when the requested Pinecone index cannot be used (e.g. missing)."""

    pass


class PineconeClient:
    """Wrapper around a single Pinecone index for upsert + query."""

    # Pinecone recommends batching upserts; 100 vectors/call is a safe limit
    # that stays well under the per-request payload ceiling.
    UPSERT_BATCH_SIZE = 100

    # Locked retrieval default (plan-04 Section 7).
    DEFAULT_MIN_SCORE = 0.5

    def __init__(self, api_key: str | None = None, index_name: str | None = None):
        """
        Connect to a Pinecone index.

        Args:
            api_key: Pinecone API key. Falls back to settings.pinecone_api_key.
            index_name: Target index. Falls back to settings.pinecone_index.

        Raises:
            PineconeIndexError: If the index does not exist in the project.
        """
        self.index_name = index_name or settings.pinecone_index
        self.pc = Pinecone(api_key=api_key or settings.pinecone_api_key)

        existing = self.pc.list_indexes().names()
        if self.index_name not in existing:
            raise PineconeIndexError(
                f"Pinecone index '{self.index_name}' not found. "
                f"Available indexes: {existing}. Create it before indexing."
            )

        self.index = self.pc.Index(self.index_name)

    def upsert_chunks(self, chunks: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Upsert prepared vectors to the index in batches of UPSERT_BATCH_SIZE.

        Args:
            chunks: List of vector dicts, each in Pinecone format:
                {"id": str, "values": list[float], "metadata": dict}.
                Embeddings + the metadata schema (plan-04 Section 4) are built
                upstream by the /index endpoint.

        Returns:
            {"upserted_count": int} — total vectors sent across all batches.
        """
        total = 0
        for start in range(0, len(chunks), self.UPSERT_BATCH_SIZE):
            batch = chunks[start:start + self.UPSERT_BATCH_SIZE]
            self.index.upsert(vectors=batch)
            total += len(batch)

        return {"upserted_count": total}

    def describe_stats(self) -> dict[str, Any]:
        """
        Report index statistics, normalised to a plain dict.

        Used by /index for idempotency: a populated index (vector_count > 0)
        skips re-indexing unless force_reindex is set.

        Returns:
            {"total_vector_count": int} — current vectors in the index.
        """
        raw = self.index.describe_index_stats()
        if isinstance(raw, dict):
            count = raw.get("total_vector_count", 0)
        else:
            count = getattr(raw, "total_vector_count", 0) or 0
        return {"total_vector_count": count}

    def delete_all(self) -> None:
        """
        Delete every vector in the index.

        Backs force_reindex: wipe the index before re-running the pipeline so
        stale chunks (e.g. from a changed corpus) cannot linger.
        """
        self.index.delete(delete_all=True)

    def query(
        self,
        vector: list[float],
        top_k: int = 5,
        min_score: float = DEFAULT_MIN_SCORE,
    ) -> list[dict[str, Any]]:
        """
        Query the index by vector and return matches above min_score.

        Args:
            vector: Query embedding.
            top_k: Maximum matches to request from Pinecone (locked default 5).
            min_score: Drop matches scoring below this (locked default 0.5).

        Returns:
            List of plain match dicts: {"id", "score", "metadata"}, ordered as
            Pinecone returned them, with sub-threshold matches removed.
        """
        response = self.index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=True,
        )

        matches = [
            self._normalise_match(m)
            for m in self._extract_matches(response)
        ]
        return [m for m in matches if m["score"] >= min_score]

    @staticmethod
    def _extract_matches(response: Any) -> list[Any]:
        """Read the matches list from a v5 QueryResponse or a dict-like mock."""
        if isinstance(response, dict):
            return response.get("matches", [])
        return getattr(response, "matches", []) or []

    @staticmethod
    def _normalise_match(match: Any) -> dict[str, Any]:
        """Coerce a Pinecone match (object or dict) into a plain dict."""
        if isinstance(match, dict):
            return {
                "id": match["id"],
                "score": match["score"],
                "metadata": match.get("metadata") or {},
            }
        return {
            "id": match.id,
            "score": match.score,
            "metadata": getattr(match, "metadata", None) or {},
        }
