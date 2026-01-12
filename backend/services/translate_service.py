
from typing import Tuple, Optional, Dict, Any
from core.clients import sarvam_client

# Sarvam mayura:v1 limit is 1000 chars -> keep a buffer
MAX_TRANSLATE_CHARS = 950


def _chunk_text(text: str, max_len: int = MAX_TRANSLATE_CHARS):
    """
    Split text into chunks <= max_len, trying to keep paragraph boundaries.
    """
    text = text.strip()
    if len(text) <= max_len:
        return [text]

    chunks = []
    buf = ""

    # Prefer splitting by lines first
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # If a single line is too long, hard-split it
        if len(line) > max_len:
            if buf:
                chunks.append(buf)
                buf = ""
            for i in range(0, len(line), max_len):
                chunks.append(line[i:i + max_len])
            continue

        # Add line to buffer if it fits
        candidate = (buf + "\n" + line).strip() if buf else line
        if len(candidate) <= max_len:
            buf = candidate
        else:
            if buf:
                chunks.append(buf)
            buf = line

    if buf:
        chunks.append(buf)

    return chunks


def translate_text(
    text: str,
    source: str,
    target: str
) -> Tuple[str, Optional[Dict[str, Any]]]:

    if not text or not text.strip():
        return "", None

    text = text.strip()
    source = (source or "").strip()
    target = (target or "").strip()

    # ✅ Prevent Sarvam error: source == target
    if source == target:
        return (
            text,
            {
                "skipped": True,
                "reason": "source==target",
                "source": source,
                "target": target,
            },
        )

    # ✅ NEW: chunk to avoid Sarvam 1000-char limit
    chunks = _chunk_text(text, MAX_TRANSLATE_CHARS)

    translated_chunks = []
    responses = []

    for chunk in chunks:
        resp = sarvam_client.text.translate(
            input=chunk,
            source_language_code=source,
            target_language_code=target,
        )

        if hasattr(resp, "model_dump"):
            data = resp.model_dump()
        elif hasattr(resp, "dict"):
            data = resp.dict()
        else:
            data = {"raw": str(resp)}

        responses.append(data)
        translated_chunks.append((data.get("translated_text") or "").strip())

    translated = "\n".join([c for c in translated_chunks if c]).strip()
    return translated, {"chunk_count": len(chunks), "responses": responses}

# This module handles text translation using the Sarvam API.
# It safely splits long input into size-limited chunks to respect API constraints,
# skips unnecessary translations when source and target languages match,
# normalizes API responses, aggregates translated chunks, and returns
# the final translated text along with structured metadata.
