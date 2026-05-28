"""
Retriever (Plan 4, Branch C) — the read path of the RAG core.

Given a raw ISQ question, returns the top-k most relevant knowledge-base chunks:

    QueryRewriter.rewrite()    expand acronyms + policy vocabulary
        -> VoyageClient.embed_query()    1024-dim query vector
        -> PineconeClient.query()        nearest chunks (UNFILTERED here)
        -> source weighting              historical_isqs ×0.95, policies ×1.0
        -> min_score floor               drop matches below 0.5
        -> sort + cap                    descending score, at most top_k

Two ordering decisions, both from plan-04 Section 7:

1. Weighting BEFORE the min_score floor. PineconeClient.query() can filter by
   min_score itself, but we ask it NOT to (min_score=0.0) and own the floor here.
   Reason: ×0.95 can push a borderline historical_isq under 0.5, and the honest
   thing is to drop it — applying the floor first would let it survive.

2. Source weighting in code, not in the embeddings. Transparent and tunable:
   the policy preference is visible here rather than hidden in vector space.
"""

from typing import Any

from app.core.pinecone_client import PineconeClient
from app.rag.query_rewriter import QueryRewriter
from app.voyage.client import VoyageClient

# Locked retrieval defaults (plan-04 Section 7).
TOP_K = 5
MIN_SCORE = 0.5

# Source weighting: a slight preference for official policy docs over historical
# ISQ answers (per brief: "prefer official Northstar Labs policy documents").
SOURCE_WEIGHTS = {
    "policy": 1.0,
    "historical_isq": 0.95,
}


class Retriever:
    """Turns an ISQ question into the top-k weighted knowledge-base chunks."""

    def __init__(
        self,
        query_rewriter: QueryRewriter | None = None,
        voyage_client: VoyageClient | None = None,
        pinecone_client: PineconeClient | None = None,
    ):
        """
        Args:
            query_rewriter: Rewrites the question. Defaults to a new QueryRewriter.
            voyage_client: Embeds the query. Defaults to a new VoyageClient.
            pinecone_client: Vector search. Defaults to a new PineconeClient.

        Collaborators are injected for testability; the defaults construct the
        real clients (which read API keys from settings/env at init time).
        """
        self.query_rewriter = query_rewriter or QueryRewriter()
        self.voyage_client = voyage_client or VoyageClient()
        self.pinecone_client = pinecone_client or PineconeClient()

    def retrieve(
        self,
        query: str,
        top_k: int = TOP_K,
        min_score: float = MIN_SCORE,
    ) -> list[dict[str, Any]]:
        """
        Retrieve the most relevant chunks for an ISQ question.

        Args:
            query: The raw questionnaire question.
            top_k: Maximum chunks to return (locked default 5).
            min_score: Post-weighting score floor (locked default 0.5).

        Returns:
            Up to top_k match dicts ({"id", "score", "metadata"}) sorted by
            weighted score descending. Empty list if nothing clears the floor.
        """
        rewritten = self.query_rewriter.rewrite(query)
        # The rewriter returns "" for empty/whitespace input (its documented
        # contract). Embedding "" wastes a Voyage call and yields a meaningless
        # vector — short-circuit to no results instead.
        if not rewritten:
            return []
        vector = self.voyage_client.embed_query(rewritten)

        # Pull top_k from Pinecone WITHOUT its min_score filter (min_score=0.0):
        # the floor is applied here, after weighting (see module docstring).
        matches = self.pinecone_client.query(vector, top_k=top_k, min_score=0.0)

        weighted = [self._apply_weight(m) for m in matches]
        kept = [m for m in weighted if m["score"] >= min_score]
        kept.sort(key=lambda m: m["score"], reverse=True)
        return kept[:top_k]

    @staticmethod
    def _apply_weight(match: dict[str, Any]) -> dict[str, Any]:
        """
        Scale a match's score by its source-type weight.

        Returns a shallow copy so the caller's input list is not mutated; the
        original Pinecone similarity is otherwise preserved in metadata.
        """
        source_type = match.get("metadata", {}).get("source_type", "policy")
        weight = SOURCE_WEIGHTS.get(source_type, 1.0)
        return {**match, "score": match["score"] * weight}
