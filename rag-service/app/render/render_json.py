"""
Canonical JSON renderer (Plan 9).

The lossless, machine-readable deliverable. Where the DOCX and XLSX renderers shape the
envelope for human eyes, this one keeps it intact for downstream systems: a predictable
top-level key order (questionnaire_meta -> answers -> summary_metrics) so saved envelopes
diff cleanly, unicode kept literal (ensure_ascii=False) rather than \\uXXXX-escaped, and
optional fields preserved as null instead of dropped — an explicit null and an absent key
mean different things to a consumer. Any unrecognised top-level keys are kept (appended
after the known ones) so a future envelope field survives the round-trip.
"""

import json

# The known top-level keys, in the order the contract pins (Plan 9 §3).
_KNOWN_ORDER = ("questionnaire_meta", "answers", "summary_metrics")


def render_json(canonical: dict, output_path: str) -> str:
    """Render the canonical envelope to pretty-printed JSON. Returns the output path."""
    ordered = {key: canonical[key] for key in _KNOWN_ORDER if key in canonical}
    # Forward-compat: keep any keys we don't know about, after the known ones.
    for key, value in canonical.items():
        ordered.setdefault(key, value)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(ordered, f, indent=2, ensure_ascii=False)
        f.write("\n")  # trailing newline (POSIX text file convention)

    return output_path
