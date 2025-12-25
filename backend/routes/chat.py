from fastapi import APIRouter, HTTPException
from schemas.chat import ChatRequest
from core.sessions import get_session_history, trim_history, SESSIONS
from services.llm_service import chat_with_memory

router = APIRouter()

@router.post("/chat")
def chat(req: ChatRequest):
    session_id = (req.session_id or "").strip()
    prompt = (req.prompt or "").strip()

    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    if not prompt:
        return {"reply": "Please type a question.", "session_id": session_id}

    history = get_session_history(session_id)
    reply = chat_with_memory(history, prompt)

    history.append({"role": "user", "content": prompt})
    history.append({"role": "assistant", "content": reply})
    SESSIONS[session_id] = trim_history(history)

    return {"reply": reply, "session_id": session_id}
