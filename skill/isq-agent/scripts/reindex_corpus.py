"""Trigger a corpus reindex on the running rag-service.

Force-reindexes the knowledge base (policies + historical ISQs). Exit 0 on success, 1 on
failure. Indexing is idempotent: deterministic vector IDs mean a re-run replaces, never
duplicates.
"""

import os
import sys

import httpx

BASE_URL = os.environ.get("ISQ_AGENT_URL", "http://localhost:8000")


def main(argv: list[str] | None = None) -> int:
    try:
        response = httpx.post(
            f"{BASE_URL}/index", json={"force_reindex": True}, timeout=300.0
        )
        response.raise_for_status()
    except Exception as exc:
        print(f"Reindex failed: {exc}")
        print("Is the rag-service running? `cd ~/Repos/isq-agent && docker compose up`")
        return 1
    print(response.json())
    return 0


if __name__ == "__main__":
    sys.exit(main())
