# Attributions

This project reuses code, patterns, and design decisions from Tom Butler's other projects. All reuse is explicit and credited here.

## Direct code lift

### Morpheus - RAG core

- `app/utils/chunking.py` - adapted from Morpheus `backend/app/utils/chunking.py`
- `app/utils/document_processor.py` - adapted from Morpheus, with added XLSX support
- `app/core/pinecone_client.py` - adapted from Morpheus, with new credentials (fresh Pinecone project)
- `app/rag/query_rewriter.py` - adapted from Morpheus, with an ISQ-specific prompt

All the Matrix-themed personality has been stripped out. That's enforced by `tests/test_isq_prompts_no_matrix_leakage.py`, which runs in CI.

Original Morpheus repo: https://github.com/ThomasJButler/Morpheus · Live demo: https://morpheusrag.vercel.app

## Pattern reuse (concept, not code)

- **NewsPerspective** - single-call multi-field analysis (one call returns answer, citations, confidence, needs_review_reason). Used in `app/rag/generator.py`. https://github.com/ThomasJButler/NewsPerspective
- **ReviewBot Protocol** - multi-dimension scoring, aggregated via weighted mean. Used in `app/confidence/aggregator.py` (4 dims: cites_policy, on_topic, vendor_tone, complete). https://github.com/ThomasJButler/ReviewBot-Protocol
- **SQL-Ball** - strict numbered rules in the system prompt that force grounded output. Used in `app/core/isq_prompts.py`. https://github.com/ThomasJButler/SQL-Ball
- **Premier League Oracle Chat** - judgement about when not to embed (tabular grounding vs vector RAG). Informs the decision to embed unstructured policy prose. https://github.com/ThomasJButler/The-Premier-League-Oracle
- **JobSearch2026** - the knowledge-grounded generation meta-pattern (knowledge base + voice constraint + multi-format generation + iterative quality). The ISQ Agent applies the same shape to security questionnaires. (Private - referenced for context.)

## External libraries

- n8n - workflow orchestration (Apache 2.0)
- FastAPI - Python web framework (MIT)
- Anthropic Python SDK (MIT)
- Voyage AI Python SDK (MIT)
- Pinecone Python SDK (Apache 2.0)
- python-docx (MIT)
- openpyxl (MIT)
- pytest (MIT)
- ruff (MIT)

Note: reportlab is intentionally absent from this list. It was dropped from `requirements.txt` this session and PDF rendering is deferred to v1.1. Don't add it back.
