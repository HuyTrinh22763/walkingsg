from http import HTTPStatus

from fastapi import APIRouter, Depends

from src.auth.auth_utils import authentication_v2
from src.controllers import hazard_controller as controller

public_router = APIRouter()
private_router = APIRouter(dependencies=[Depends(authentication_v2)])

public_router.get("/nearby")(controller.get_nearby_hazards)
private_router.post("/report", status_code=HTTPStatus.CREATED)(controller.report_hazard)

router = APIRouter(prefix="/v1/api/hazard", tags=["hazard"])
router.include_router(public_router)
router.include_router(private_router)
