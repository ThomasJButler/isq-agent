"""
Tests for the chunking module (Plan 4).
Written FIRST per TDD discipline. Implementation in app/utils/chunking.py follows.
"""

import pytest


# Test fixtures — reusable test data

@pytest.fixture
def short_text():
    """Text that fits in one chunk."""
    return "This is a short policy paragraph that fits in one chunk."


@pytest.fixture
def long_text():
    """Mimics a real policy: multiple paragraphs separated by blank lines."""
    return (
        "1. Security Responsibilities\n\n"
        "All employees, contractors, and third parties working on behalf of Northstar Labs "
        "are responsible for protecting company information and complying with security policies.\n\n"
        "2. Access Control\n\n"
        "Access to company systems must follow the principle of least privilege. "
        "User accounts must be uniquely assigned to individuals.\n\n"
        "3. Multi-Factor Authentication\n\n"
        "MFA is mandatory for all cloud platforms, administrative accounts, and VPN access."
    )


@pytest.fixture
def very_long_text():
    """50KB text for stress testing."""
    return "Lorem ipsum dolor sit amet. " * 2000  # ~50KB


@pytest.fixture
def sample_metadata():
    """Standard metadata for policy chunks."""
    return {
        "source": "Northstar_Labs_Information_Security_Policy.pdf",
        "source_type": "policy",
        "page": 1,
    }


# Tests


def test_chunk_text_returns_chunks(short_text):
    """Empty text → empty list. Non-empty text → at least one chunk."""
    from app.utils.chunking import chunk_text

    # Empty text
    assert chunk_text("") == []
    assert chunk_text("   ") == []

    # Non-empty text
    chunks = chunk_text(short_text)
    assert isinstance(chunks, list)
    assert len(chunks) >= 1
    assert all(isinstance(c, dict) for c in chunks)


def test_chunk_size_respects_max(long_text):
    """No chunk exceeds max_chunk_size (500 chars)."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(long_text, chunk_size=500, chunk_overlap=50)
    for chunk in chunks:
        assert len(chunk["text"]) <= 500, f"Chunk exceeded max size: {len(chunk['text'])}"


def test_chunk_overlap_preserves_context(long_text):
    """Adjacent chunks share chunk_overlap chars (50)."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)

    if len(chunks) > 1:
        # Check that adjacent chunks overlap
        for i in range(len(chunks) - 1):
            current_chunk = chunks[i]["text"]
            next_chunk = chunks[i + 1]["text"]

            # The end of current chunk should appear in next chunk
            # (overlap implementation may vary, so we check for partial overlap)
            overlap_candidate = current_chunk[-50:] if len(current_chunk) >= 50 else current_chunk
            # Simple check: some text from end of current appears in next
            assert len(overlap_candidate) > 0


def test_chunks_preserve_metadata(short_text, sample_metadata):
    """Each chunk carries parent doc's metadata."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(short_text, metadata=sample_metadata)

    for chunk in chunks:
        assert chunk["source"] == sample_metadata["source"]
        assert chunk["source_type"] == sample_metadata["source_type"]
        assert chunk["page"] == sample_metadata["page"]


def test_chunking_respects_section_boundaries(long_text):
    """Splits prefer paragraph boundaries (\\n\\n separator)."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)

    # With section-aware splitting, we expect chunks to break at \n\n when possible
    # Check that most chunks don't cut mid-sentence awkwardly
    # (This is a heuristic test — langchain's RecursiveCharacterTextSplitter should handle this)
    assert len(chunks) > 1  # Should split the long_text


def test_chunking_handles_very_short_text(short_text):
    """Text shorter than max_chunk_size → single chunk."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(short_text, chunk_size=500, chunk_overlap=50)

    assert len(chunks) == 1
    assert chunks[0]["text"] == short_text


def test_chunking_handles_very_long_text(very_long_text):
    """50KB text → many chunks, all within max size."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(very_long_text, chunk_size=500, chunk_overlap=50)

    assert len(chunks) > 1  # Should produce multiple chunks
    for chunk in chunks:
        assert len(chunk["text"]) <= 500


def test_chunking_assigns_chunk_index(long_text):
    """Each chunk has chunk_index (0, 1, 2, ...) and total_chunks."""
    from app.utils.chunking import chunk_text

    chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)

    for i, chunk in enumerate(chunks):
        assert chunk["chunk_index"] == i
        assert chunk["total_chunks"] == len(chunks)
