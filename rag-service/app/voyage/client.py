"""
Voyage AI embedding client wrapper.
Wraps voyageai SDK for query + document embedding with cost tracking.
"""

import os
from typing import Optional
import voyageai


class VoyageClient:
    """
    Thin wrapper around Voyage AI for embedding generation.

    Two modes:
    - embed_query(text) for single search queries
    - embed_documents(texts) for batched corpus indexing
    """

    # voyage-3-large pricing as of May 2026: $0.18 per million tokens
    COST_PER_MILLION_TOKENS = 0.18
    MAX_BATCH_SIZE = 1000  # Voyage caps at 1000 texts per call

    def __init__(self, model: str = "voyage-3-large", api_key: Optional[str] = None):
        self.model = model
        self.client = voyageai.Client(api_key=api_key or os.getenv("VOYAGE_API_KEY"))
        self.tokens_used = 0  # cumulative across all calls

    def embed_query(self, text: str) -> list[float]:
        """Embed a single search query. Returns 1024-dim vector for voyage-3-large."""
        result = self.client.embed(
            texts=[text],
            model=self.model,
            input_type="query",  # tells Voyage this is a search query, not a document
        )
        self.tokens_used += result.total_tokens
        return result.embeddings[0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed multiple document chunks. Returns list of 1024-dim vectors.
        Handles batching automatically — Voyage caps at 1000 texts per call.
        """
        all_embeddings = []
        for i in range(0, len(texts), self.MAX_BATCH_SIZE):
            batch = texts[i:i + self.MAX_BATCH_SIZE]
            result = self.client.embed(
                texts=batch,
                model=self.model,
                input_type="document",
            )
            self.tokens_used += result.total_tokens
            all_embeddings.extend(result.embeddings)
        return all_embeddings

    def get_cost_estimate(self) -> float:
        """Return cumulative cost in USD based on self.tokens_used."""
        return (self.tokens_used / 1_000_000) * self.COST_PER_MILLION_TOKENS 
     

                           
