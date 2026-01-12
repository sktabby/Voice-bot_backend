import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
if not SARVAM_API_KEY:
    raise RuntimeError("Missing SARVAM_API_KEY. Create backend/.env with SARVAM_API_KEY=...")

MAX_TURNS = 8



# This configuration module loads environment variables, resolves project paths,
# ensures required directories exist, validates the presence of the SARVAM API key,
# and defines global constants used for request limits and file handling.
