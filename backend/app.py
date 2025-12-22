import os
import time
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sarvamai import SarvamAI

# Groq chat engine (session-based)
from chatbot.groq_advisor import SYSTEM_PROMPT, groq_reply

# (Optional) your old rule-based advisor endpoint (kept as /chat0)
from chatbot.education_advisor import education_advisor


# -----------------------------
# ENV + CLIENTS
# -----------------------------
load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
if not SARVAM_API_KEY:
    raise RuntimeError("Missing SARVAM_API_KEY. Create backend/.env with SARVAM_API_KEY=...")

client = SarvamAI(api_subscription_key=SARVAM_API_KEY)

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------
# FASTAPI APP
# -----------------------------
app = FastAPI(title="Voicebot Backend (STT + Translate + Groq Chat)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# SESSION MEMORY (IN-MEMORY)
# -----------------------------
SESSIONS: Dict[str, List[dict]] = {}
MAX_TURNS = 8  # last 8 turns => 16 messages (user+assistant)

def get_session_history(session_id: str) -> List[dict]:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = []
    return SESSIONS[session_id]

def trim_history(history: List[dict]) -> List[dict]:
    keep = MAX_TURNS * 2
    return history[-keep:] if len(history) > keep else history


# -----------------------------
# SCHEMAS
# -----------------------------
class ChatRequest(BaseModel):
    session_id: str
    prompt: str


# -----------------------------
# ROUTES
# -----------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reset")
def reset(payload: dict):
    session_id = (payload.get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    SESSIONS.pop(session_id, None)
    return {"ok": True, "session_id": session_id}


@app.post("/chat")
def chat(req: ChatRequest):
    session_id = (req.session_id or "").strip()
    prompt = (req.prompt or "").strip()

    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    if not prompt:
        return {"reply": "Please type a question.", "session_id": session_id}

    history = get_session_history(session_id)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + [
        {"role": "user", "content": prompt}
    ]

    reply = groq_reply(messages)

    # store the turn
    history.append({"role": "user", "content": prompt})
    history.append({"role": "assistant", "content": reply})
    SESSIONS[session_id] = trim_history(history)

    return {"reply": reply, "session_id": session_id}


# Optional: your basic rule-based advisor (no memory)
@app.post("/chat0")
def chat0(req: BaseModel):
    # keeping minimal, but you can remove this endpoint if you don't need it
    raise HTTPException(status_code=410, detail="chat0 removed (use /chat).")


@app.post("/voicebot")
async def voicebot(
    file: UploadFile = File(...),
    language_code: str = Form("unknown"),
    session_id: str = Form(...),
):
    """
    Full pipeline:
    audio -> STT -> translate to English -> send to Groq with session memory -> return outputs
    """
    session_id = (session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    # ---- Save upload ----
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = Path(file.filename).suffix.lower() or ".webm"
    raw_path = UPLOAD_DIR / f"upload_{int(time.time()*1000)}{ext}"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file.")

    raw_path.write_bytes(content)

    # ---- STT ----
    t0 = time.time()
    try:
        with open(raw_path, "rb") as f:
            stt_response = client.speech_to_text.transcribe(
                file=f,
                model="saarika:v2.5",
                language_code=language_code if language_code != "unknown" else "unknown",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")

    latency_ms = int((time.time() - t0) * 1000)

    # Convert STT response to dict
    if hasattr(stt_response, "model_dump"):
        stt_json = stt_response.model_dump()
    elif hasattr(stt_response, "dict"):
        stt_json = stt_response.dict()
    else:
        stt_json = {"raw": str(stt_response)}

    transcript_original = (
        stt_json.get("transcript")
        or stt_json.get("text")
        or stt_json.get("output")
        or ""
    ).strip()

    # ---- Translate to English ----
    translation_en = ""
    translate_json = None

    if transcript_original:
        try:
            source_lang = language_code if language_code != "unknown" else "auto"
            translate_response = client.text.translate(
                input=transcript_original,
                source_language_code=source_lang,
                target_language_code="en-IN",
            )

            if hasattr(translate_response, "model_dump"):
                translate_json = translate_response.model_dump()
            elif hasattr(translate_response, "dict"):
                translate_json = translate_response.dict()
            else:
                translate_json = {"raw": str(translate_response)}

            translation_en = (translate_json.get("translated_text") or "").strip()
        except Exception as e:
            translate_json = {"error": str(e)}
            translation_en = ""

    # ---- LLM Prompt ----
    llm_prompt = translation_en if translation_en else transcript_original

    # ---- Groq with session memory ----
    llm_reply = ""
    if llm_prompt:
        history = get_session_history(session_id)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + [
            {"role": "user", "content": llm_prompt}
        ]

        try:
            llm_reply = groq_reply(messages)
        except Exception as e:
            llm_reply = f"LLM failed: {str(e)}"

        # store this interaction using the *English* prompt (consistent memory)
        history.append({"role": "user", "content": llm_prompt})
        history.append({"role": "assistant", "content": llm_reply})
        SESSIONS[session_id] = trim_history(history)

    return {
        "ok": True,
        "latency_ms": latency_ms,
        "session_id": session_id,
        "language_code_used_for_stt": language_code,

        "transcript_original": transcript_original,
        "translation_en": translation_en,

        "llm_prompt_used": llm_prompt,
        "llm_reply": llm_reply,

        "stt_response": stt_json,
        "translate_response": translate_json,
    }
