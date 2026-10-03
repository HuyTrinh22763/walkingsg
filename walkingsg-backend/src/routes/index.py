from fastapi import APIRouter

from src.core.success_response import SuccessResponse, ok

router = APIRouter()


@router.get("/health")
async def health_check() -> SuccessResponse[dict]:
    return ok({"status": "healthy"}, message="WalkingSG API is active!")
