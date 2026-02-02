# backend/routes/stream.py
import time
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from core.sessions import (
    STREAM_STATE,
    update_last_chunk,
    should_finalize,
    mark_finalized,
    clear_stream_session,
)
from services.stt_service import transcribe_partial
from routes.voicebot import process_audio_path

router = APIRouter()

STREAM_DIR = Path("backend/stream_uploads")
STREAM_DIR.mkdir(parents=True, exist_ok=True)

# In-memory index: session_id -> list of chunk paths
SESSION_CHUNKS = {}


@router.post("/stream/chunk")
async def stream_chunk(
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    mime_type: str = Form(""),
    language_code: str = Form("unknown"),
    file: UploadFile = File(...),
):
    session_id = (session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    sess_dir = STREAM_DIR / session_id
    sess_dir.mkdir(parents=True, exist_ok=True)

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty chunk")

    # store chunk bytes
    chunk_path = sess_dir / f"{chunk_index:06d}.bin"
    chunk_path.write_bytes(data)

    # track chunk path in memory
    lst = SESSION_CHUNKS.setdefault(session_id, [])
    if len(lst) <= chunk_index:
        lst.extend([None] * (chunk_index - len(lst) + 1))
    lst[chunk_index] = str(chunk_path)

    # ✅ Phase 3: mark "user is speaking" (chunk arrived)
    update_last_chunk(session_id)

    return {"ok": True, "chunk_index": chunk_index}


@router.get("/stream/partial")
async def stream_partial(session_id: str):
    session_id = (session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    chunk_paths = SESSION_CHUNKS.get(session_id)
    if not chunk_paths or all(p is None for p in chunk_paths):
        return {"ok": True, "session_id": session_id, "partial_text": "", "ready": False}

    # init partial state
    st = STREAM_STATE.setdefault(session_id, {
        "partial_text": "",
        "last_processed_chunk": -1,
        "last_partial_ts": 0.0,
    })

    # ✅ Phase 3: if silence detected, tell frontend to finalize
    # (do not run more partial STT at this moment)
    if should_finalize(session_id, silence_ms=1500):
        return {
            "ok": True,
            "session_id": session_id,
            "partial_text": st["partial_text"],
            "ready": True,
            "auto_finalize": True,
        }

    now = time.time()
    latest_idx = len(chunk_paths) - 1
    new_chunks = latest_idx - st["last_processed_chunk"]

    # ✅ throttle:
    # Run STT only if:
    # - at least 4 new chunks (~2 sec with 500ms chunking)
    # OR
    # - at least 2 sec since last STT
    should_run = (new_chunks >= 4) or ((now - st["last_partial_ts"]) >= 2.0)

    if not should_run:
        return {
            "ok": True,
            "session_id": session_id,
            "partial_text": st["partial_text"],
            "ready": False
        }

    sess_dir = STREAM_DIR / session_id
    sess_dir.mkdir(parents=True, exist_ok=True)

    partial_path = sess_dir / "partial.webm"

    # merge chunks so far
    with partial_path.open("wb") as out:
        for p in chunk_paths:
            if not p:
                continue
            out.write(Path(p).read_bytes())

    transcript, stt_json, stt_ms = transcribe_partial(partial_path, "unknown")

    st["partial_text"] = (transcript or "").strip()
    st["last_processed_chunk"] = latest_idx
    st["last_partial_ts"] = now

    return {
        "ok": True,
        "session_id": session_id,
        "partial_text": st["partial_text"],
        "ready": True,
        "stt_ms": stt_ms,
        "auto_finalize": False,
    }


@router.post("/stream/finalize")
async def stream_finalize(
    session_id: str = Form(...),
    language_code: str = Form("unknown"),
):
    session_id = (session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    chunk_paths = SESSION_CHUNKS.get(session_id)
    if not chunk_paths or all(p is None for p in chunk_paths):
        raise HTTPException(status_code=400, detail="No chunks received for this session")

    # ✅ Phase 3: prevent double finalize
    mark_finalized(session_id)

    sess_dir = STREAM_DIR / session_id
    merged_path = sess_dir / "merged.webm"

    # merge chunks in order
    with merged_path.open("wb") as out:
        for p in chunk_paths:
            if not p:
                continue
            out.write(Path(p).read_bytes())

    # ✅ run full pipeline once
    result = process_audio_path(str(merged_path), language_code, session_id)

    # cleanup session buffers
    SESSION_CHUNKS.pop(session_id, None)
    STREAM_STATE.pop(session_id, None)
    clear_stream_session(session_id)

    return result
