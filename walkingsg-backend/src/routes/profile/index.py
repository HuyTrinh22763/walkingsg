from fastapi import APIRouter, Depends

from src.auth.auth_utils import authentication_v2
from src.controllers import profile_controller as controller

private_router = APIRouter(
    prefix="/v1/api/profile",
    dependencies=[Depends(authentication_v2)],
)

private_router.get("")(controller.get_profile)
private_router.put("")(controller.update_profile)
private_router.delete("")(controller.delete_account)

router = APIRouter(tags=["profile"])
router.include_router(private_router)