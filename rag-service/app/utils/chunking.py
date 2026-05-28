"""
Chunking utilities for RAG knowledge base (Plan 4).
Section-aware chunking using RecursiveCharacterTextSplitter.
"""

from typing import Any

from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    metadata: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    Chunk text into fixed-size passages with overlap, respecting section boundaries.

    Args:
        text: Source text to chunk
        chunk_size: Maximum characters per chunk (default 500)
        chunk_overlap: Characters to overlap between chunks (default 50)
        metadata: Optional metadata dict to attach to each chunk

    Returns:
        List of chunk dicts with keys: text, chunk_index, total_chunks, **metadata

    Examples:
        >>> chunks = chunk_text("Short text", metadata={"source": "doc.pdf"})
        >>> len(chunks)
        1
        >>> chunks[0]["text"]
        'Short text'
        >>> chunks[0]["source"]
        'doc.pdf'
    """
    # Handle empty/whitespace-only text
    if not text or not text.strip():
        return []

    # Configure splitter to prefer section boundaries
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            "",
        ],  # Prefer paragraph > line > sentence > word
        length_function=len,
    )

    # Split text
    text_chunks = splitter.split_text(text)

    # Build chunk dicts with metadata
    chunks = []
    total_chunks = len(text_chunks)

    for i, chunk_text in enumerate(text_chunks):
        chunk_dict = {
            "text": chunk_text,
            "chunk_index": i,
            "total_chunks": total_chunks,
        }

        # Merge in parent document metadata if provided
        if metadata:
            chunk_dict.update(metadata)

        chunks.append(chunk_dict)

    return chunks


class DocumentChunker:
    """
    Batch chunker for processing multiple documents.
    Useful for indexing workflows where many documents need chunking.
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize chunker with chunk size and overlap settings.

        Args:
            chunk_size: Maximum characters per chunk
            chunk_overlap: Characters to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_documents(self, documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Chunk a batch of documents.

        Args:
            documents: List of dicts with 'text' key and optional metadata

        Returns:
            Flat list of all chunks from all documents

        Examples:
            >>> chunker = DocumentChunker(chunk_size=500)
            >>> docs = [
            ...     {"text": "Doc 1 content", "source": "doc1.pdf"},
            ...     {"text": "Doc 2 content", "source": "doc2.pdf"},
            ... ]
            >>> chunks = chunker.chunk_documents(docs)
            >>> len(chunks) >= 2
            True
        """
        all_chunks = []

        for doc in documents:
            text = doc.get("text", "")

            # Extract metadata (everything except 'text')
            metadata = {k: v for k, v in doc.items() if k != "text"}

            # Chunk this document
            doc_chunks = chunk_text(
                text,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                metadata=metadata,
            )

            all_chunks.extend(doc_chunks)

        return all_chunks
