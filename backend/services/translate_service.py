from typing import Tuple, Optional, Dict, Any
from core.clients import sarvam_client

def translate_text(
    text: str,
    source: str,
    target: str
) -> Tuple[str, Optional[Dict[str, Any]]]:

    if not text or not text.strip():
        return "", None

    source = (source or "").strip()
    target = (target or "").strip()

    # ✅ Prevent Sarvam error: source == target
    if source == target:
        return (
            text.strip(),
            {
                "skipped": True,
                "reason": "source==target",
                "source": source,
                "target": target,
            },
        )

    resp = sarvam_client.text.translate(
        input=text.strip(),
        source_language_code=source,
        target_language_code=target,
    )

    if hasattr(resp, "model_dump"):
        data = resp.model_dump()
    elif hasattr(resp, "dict"):
        data = resp.dict()
    else:
        data = {"raw": str(resp)}

    translated = (data.get("translated_text") or "").strip()
    return translated, data
