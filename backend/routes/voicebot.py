from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from core.sessions import get_session_history, trim_history
from services.storage_service import save_upload
from services.stt_service import transcribe_audio
from services.translate_service import translate_text
from services.llm_service import chat_with_memory

router = APIRouter()

# ---- Helper: safely pick detected language ----
def pick_detected_lang(language_code: str, stt_json: dict) -> str:
    if language_code and language_code != "unknown":
        return language_code

    detected = (
        stt_json.get("language_code")
        or stt_json.get("detected_language_code")
        or stt_json.get("detected_language")
        or stt_json.get("language")
        or (stt_json.get("metadata", {}) or {}).get("language_code")
        or "en-IN"
    )

    # normalize common short codes
    if detected == "en":
        return "en-IN"
    if detected == "hi":
        return "hi-IN"
    if detected in ("mr", "mar"):
        return "mr-IN"

    return detected


@router.post("/voicebot")
async def voicebot(
    file: UploadFile = File(...),
    language_code: str = Form("unknown"),
    session_id: str = Form(...),
):
    session_id = (session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    raw_path = await save_upload(file)

    transcript_original, stt_json, latency_ms = transcribe_audio(raw_path, language_code)

    # ✅ Detect language once (used everywhere)
    detected_lang = pick_detected_lang(language_code, stt_json)
    print("language_code from UI:", language_code)


    # ---- Translate speech → English (for LLM) ----
    translation_en, translate_json = "", None
    if transcript_original:
        source_lang = detected_lang if detected_lang != "unknown" else "auto"

# ✅ If already English, don't translate to English again
        if source_lang.startswith("en"):
            translation_en, translate_json = transcript_original, {"skipped": True, "reason": "already_english"}
        else:
            translation_en, translate_json = translate_text(transcript_original, source_lang, "en-IN")


    llm_prompt = translation_en if translation_en else transcript_original

    # ---- LLM with memory ----
    llm_reply = ""
    if llm_prompt:
        history = get_session_history(session_id)
        llm_reply = chat_with_memory(history, llm_prompt)

        history.append({"role": "user", "content": llm_prompt})
        history.append({"role": "assistant", "content": llm_reply})

        from core.sessions import SESSIONS
        SESSIONS[session_id] = trim_history(history)

    # ---- Final translation: English → detected language ----
    # ⚠️ We KEEP the old key name `llm_reply_hi`
    llm_reply_hi, llm_reply_hi_response = ("", None)

    if llm_reply.strip():
        # If user spoke English, return as-is
        if detected_lang.startswith("en"):
            llm_reply_hi = llm_reply
        else:
            llm_reply_hi, llm_reply_hi_response = translate_text(
                llm_reply,
                "en-IN",
                detected_lang
            )

    return {
        "ok": True,
        "latency_ms": latency_ms,
        "session_id": session_id,

        "language_code_used_for_stt": language_code,
        "detected_language_code": detected_lang,

        "transcript_original": transcript_original,
        "translation_en": translation_en,

        "llm_prompt_used": llm_prompt,
        "llm_reply": llm_reply,

        # 🔒 FRONTEND-COMPATIBLE KEYS
        # (now contains reply in detected user language)
        "llm_reply_hi": llm_reply_hi,
        "llm_reply_hi_response": llm_reply_hi_response,

        "stt_response": stt_json,
        "translate_response": translate_json,
    }
