import time
from pathlib import Path
from fastapi import UploadFile, HTTPException
from core.config import UPLOAD_DIR

async def save_upload(file: UploadFile) -> Path:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = Path(file.filename).suffix.lower() or ".webm"
    raw_path = UPLOAD_DIR / f"upload_{int(time.time()*1000)}{ext}"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file.")

    raw_path.write_bytes(content)
    return raw_path



# This async utility validates an uploaded file, generates a unique filename,
# persists the file to the configured upload directory, and returns the saved path
# while handling empty or invalid upload errors.
