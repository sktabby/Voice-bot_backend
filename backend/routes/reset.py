# routes/reset.py
from fastapi import APIRouter, HTTPException
from core.sessions import reset_session

router = APIRouter()

@router.post("/reset")
def reset(payload: dict):
    session_id = (payload.get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    reset_session(session_id)
    return {"ok": True, "session_id": session_id}
