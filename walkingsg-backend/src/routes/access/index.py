from http import HTTPStatus

from fastapi import APIRouter, Depends

from src.auth.auth_utils import authentication_v2
from src.controllers import access_controller as controller

public_router = APIRouter()
private_router = APIRouter(dependencies=[Depends(authentication_v2)])

public_router.post("/signup", status_code=HTTPStatus.CREATED)(controller.signup)
public_router.post("/verify-otp")(controller.verify_otp)
public_router.post("/resend-otp")(controller.resend_otp)
public_router.post("/login")(controller.login)
public_router.post("/forgot-password")(controller.forgot_password)
public_router.post("/reset-password")(controller.reset_password)

private_router.post("/logout")(controller.logout)

router = APIRouter(prefix="/v1/api/access", tags=["access"])
router.include_router(public_router)
router.include_router(private_router)
