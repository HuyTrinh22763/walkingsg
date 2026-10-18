from fastapi import APIRouter, Depends

from src.auth.auth_utils import authentication_v2
from src.controllers import route_controller as controller

private_router = APIRouter(
    prefix="/v1/api/route",
    dependencies=[Depends(authentication_v2)],
)

private_router.post("/generate")(controller.generate_routes)
private_router.get("/{route_id}")(controller.find_route)

router = APIRouter(tags=["route"])
router.include_router(private_router)
