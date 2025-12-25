from typing import Dict, List
from core.config import MAX_TURNS

SESSIONS: Dict[str, List[dict]] = {}

def get_session_history(session_id: str) -> List[dict]:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = []
    return SESSIONS[session_id]

def trim_history(history: List[dict]) -> List[dict]:
    keep = MAX_TURNS * 2
    return history[-keep:] if len(history) > keep else history

def reset_session(session_id: str) -> None:
    SESSIONS.pop(session_id, None)
