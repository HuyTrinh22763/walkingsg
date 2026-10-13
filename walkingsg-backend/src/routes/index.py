from fastapi import APIRouter

from src.core.success_response import SuccessResponse, ok
from src.routes.access.index import router as access_router

router = APIRouter()


@router.get("/health")
async def health_check() -> SuccessResponse[dict]:
    return ok({"status": "healthy"}, message="WalkingSG API is active!")


router.include_router(access_router)
