# routes/health.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}


# This lightweight health endpoint exposes a simple status check,
# allowing clients or monitoring tools to verify that the service
# is running and reachable.
