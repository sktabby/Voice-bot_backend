import time
from pathlib import Path
from typing import Tuple, Dict, Any
from core.clients import sarvam_client


def transcribe_audio(path: Path, language_code: str) -> Tuple[str, Dict[str, Any], int]:
    t0 = time.time()
    with open(path, "rb") as f:
        resp = sarvam_client.speech_to_text.transcribe(
            file=f,
            model="saarika:v2.5",
            language_code=language_code if language_code != "unknown" else "unknown",
        )
    latency_ms = int((time.time() - t0) * 1000)

    if hasattr(resp, "model_dump"):
        data = resp.model_dump()
    elif hasattr(resp, "dict"):
        data = resp.dict()
    else:
        data = {"raw": str(resp)}

    transcript = (data.get("transcript") or data.get("text") or data.get("output") or "").strip()
    return transcript, data, latency_ms


# ✅ NEW (Phase 2): partial STT helper
def transcribe_partial(path: Path, language_code: str) -> Tuple[str, Dict[str, Any], int]:
    # For Phase 2, simplest approach: reuse full STT on "audio so far"
    # Later we can optimize windowed audio / incremental STT.
    return transcribe_audio(path, language_code)


# This service function sends an audio file to the Sarvam speech-to-text API,
# measures transcription latency, normalizes the API response into a dictionary,
# extracts the final transcript text, and returns the transcript along with
# raw metadata and processing time.
