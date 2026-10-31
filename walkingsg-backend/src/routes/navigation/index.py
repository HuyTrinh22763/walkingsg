from http import HTTPStatus

from fastapi import APIRouter, Depends

from src.auth.auth_utils import authentication_v2
from src.controllers import navigation_controller as controller

# authentication_v2 acts exclusively as the security gate at the router layer
private_router = APIRouter(
    prefix="/v1/api/navigation",
    dependencies=[Depends(authentication_v2)],
)

private_router.post("/start", status_code=HTTPStatus.CREATED)(
    controller.start_navigation
)
private_router.post("/track", status_code=HTTPStatus.OK)(
    controller.track_position
)
private_router.post("/end", status_code=HTTPStatus.OK)(
    controller.end_navigation
)
private_router.post("/reroute", status_code=HTTPStatus.OK)(
    controller.reroute
)

router = APIRouter(tags=["navigation"])
router.include_router(private_router)
