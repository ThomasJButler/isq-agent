"""
ISQ-specific query rewriter (Plan 4, Branch C).

Transforms a supplier security questionnaire question into a richer retrieval
query that includes vocabulary likely to appear in the underlying security
policy documents. This widens the embedding-space net so the right policy
chunk surfaces in the top-k — without the rewriter ever answering the question
or inventing claims.

The system prompt (plan-04 Section 6) is v0; Plan 9's eval loop refines it
against the 20 Sunflowers questions. Source weighting and the Pinecone query
happen downstream in app/rag/retriever.py.
"""

from anthropic import Anthropic

from app.core.config import settings

# Verbatim from plan-04 Section 6. The model receives this as the system prompt;
# the question itself is appended as the user turn (see rewrite()).
SYSTEM_PROMPT = """You expand supplier security questionnaire questions into richer retrieval queries.

Your job is to take a question and rewrite it to include vocabulary likely to appear in the underlying security policy documents that contain the answer. Do not answer the question. Do not invent claims. Just expand the search terms.

Rules:
1. Preserve the original intent — the rewritten query must still ask about the same topic
2. Expand acronyms (MFA → multi-factor authentication, ISP → information security policy, RPO/RTO → recovery point objective / recovery time objective)
3. Add synonyms and related concepts (authentication → access control, authentication, identity verification)
4. Include policy-document vocabulary (governance, framework, mandatory, approved, documented)
5. Output ONLY the rewritten query, no explanation

Examples:
Q: "Do you use MFA?"
→ "multi-factor authentication MFA enforcement mandatory cloud platforms VPN administrative accounts authenticator applications"

Q: "Where is customer data stored?"
→ "customer data storage location geographic region cloud provider data residency UK EEA GDPR cross-border transfer"

Q: "Are backups tested?"
→ "backup restoration testing recovery validation disaster recovery business continuity periodic testing tabletop exercises"

Now rewrite this question:"""


class QueryRewriter:
    """Rewrites ISQ questions into retrieval-optimised queries via Anthropic."""

    # Rewritten queries are short keyword expansions, not prose — a tight cap
    # keeps latency and cost low while leaving room for synonym lists.
    MAX_TOKENS = 256

    def __init__(self, api_key: str | None = None, model: str | None = None):
        """
        Args:
            api_key: Anthropic API key. Falls back to settings.anthropic_api_key.
            model: Model name. Falls back to settings.anthropic_model.
        """
        self.model = model or settings.anthropic_model
        self.client = Anthropic(api_key=api_key or settings.anthropic_api_key)

    def rewrite(self, query: str) -> str:
        """
        Expand a questionnaire question into a richer retrieval query.

        Empty or whitespace-only input short-circuits to "" with no LLM call —
        there is nothing to rewrite and a round-trip would only burn tokens.
        """
        if not query or not query.strip():
            return ""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": query}],
        )
        return response.content[0].text.strip()
