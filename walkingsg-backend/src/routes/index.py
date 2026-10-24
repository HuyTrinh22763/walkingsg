from fastapi import APIRouter

from src.core.success_response import SuccessResponse, ok
from src.routes.access.index import router as access_router
from src.routes.hazard.index import router as hazard_router
from src.routes.location.index import router as location_router
from src.routes.navigation.index import router as navigation_router
from src.routes.profile.index import router as profile_router
from src.routes.route.index import router as route_router

router = APIRouter()


@router.get("/health")
async def health_check() -> SuccessResponse[dict]:
    return ok({"status": "healthy"}, message="WalkingSG API is active!")


router.include_router(access_router)
router.include_router(profile_router)
router.include_router(route_router)
router.include_router(location_router)
router.include_router(navigation_router)
router.include_router(hazard_router)