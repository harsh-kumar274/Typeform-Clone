"""Health-check router — confirms the backend is alive."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    """Simple liveness probe. Frontend calls this on first load to confirm connectivity."""
    return {"status": "ok"}
