"""Check the ISQ Agent rag-service is reachable and healthy.

Exit codes: 0 = healthy, 2 = reachable but a dependency is down, 1 = unreachable.

The live /health endpoint currently returns just {"status": "ok"}; a later iteration adds a
"dependencies" map. This copes with both shapes: with no dependencies map, status == "ok"
means healthy; with one, every dependency must be true.
"""

import os
import sys

import httpx

BASE_URL = os.environ.get("ISQ_AGENT_URL", "http://localhost:8000")


def check(base_url: str = BASE_URL, timeout: float = 5.0) -> tuple[int, str]:
    """Return (exit_code, message) describing the service health."""
    try:
        response = httpx.get(f"{base_url}/health", timeout=timeout)
        response.raise_for_status()
        health = response.json()
    except Exception as exc:
        return 1, (
            f"rag-service unreachable: {exc}\n"
            "Run `cd ~/Repos/isq-agent && docker compose up` and try again."
        )

    dependencies = health.get("dependencies")
    if dependencies is None:
        if health.get("status") == "ok":
            return 0, "rag-service: OK"
        return 2, f"rag-service unhealthy: {health}"
    if all(dependencies.values()):
        return 0, "rag-service: OK"
    return 2, f"rag-service unhealthy, dependencies down: {dependencies}"


def main(argv: list[str] | None = None) -> int:
    code, message = check()
    print(message)
    return code


if __name__ == "__main__":
    sys.exit(main())
