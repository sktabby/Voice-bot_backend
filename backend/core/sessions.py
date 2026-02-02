from typing import Dict, List
import time
from core.config import MAX_TURNS

# ----------------------------
# Chat memory (existing)
# ----------------------------
SESSIONS: Dict[str, List[dict]] = {}

def get_session_history(session_id: str) -> List[dict]:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = []
    return SESSIONS[session_id]

def trim_history(history: List[dict]) -> List[dict]:
    keep = MAX_TURNS * 2
    return history[-keep:] if len(history) > keep else history

def reset_session(session_id: str) -> None:
    # reset chat memory
    SESSIONS.pop(session_id, None)

    # reset streaming state too (safe)
    STREAM_STATE.pop(session_id, None)
    STREAM_SESSIONS.pop(session_id, None)


# ----------------------------
# Phase 2: Partial STT state
# session_id -> { partial_text, last_processed_chunk, last_partial_ts }
# ----------------------------
STREAM_STATE: Dict[str, dict] = {}


# ----------------------------
# Phase 3: Silence detection state
# session_id -> { last_chunk_ts, finalized }
# ----------------------------
STREAM_SESSIONS: Dict[str, dict] = {}

def get_stream_session(session_id: str) -> dict:
    sess = STREAM_SESSIONS.get(session_id)
    if not sess:
        sess = {
            "last_chunk_ts": time.time(),
            "finalized": False,
        }
        STREAM_SESSIONS[session_id] = sess
    return sess

def update_last_chunk(session_id: str) -> None:
    sess = get_stream_session(session_id)
    sess["last_chunk_ts"] = time.time()

def should_finalize(session_id: str, silence_ms: int = 1500) -> bool:
    sess = get_stream_session(session_id)
    if sess.get("finalized"):
        return False

    silence = (time.time() - sess["last_chunk_ts"]) * 1000.0
    return silence >= silence_ms

def mark_finalized(session_id: str) -> None:
    sess = get_stream_session(session_id)
    sess["finalized"] = True

def clear_stream_session(session_id: str) -> None:
    STREAM_SESSIONS.pop(session_id, None)



# This module manages in-memory conversation sessions.
# It initializes and retrieves per-session chat history,
# trims stored messages to a fixed turn limit to control memory,
# and provides a reset mechanism to clear session state when needed.
