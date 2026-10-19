from typing import Annotated

from fastapi import Depends

from src.auth.auth_utils import AuthContext, authentication_v2
from src.configs.config import Settings, get_settings
from src.core.success_response import SuccessResponse, created, ok
from src.model.repository.credentials_repo import CredentialsRepository
from src.model.repository.key_token_repo import KeyTokenRepository
from src.model.repository.otp_repo import OtpRepository
from src.model.repository.user_repo import UserRepository
from src.schemas.access_schema import (
    ForgotPasswordRequest,
    LoginOut,
    LoginRequest,
    OtpVerifyOut,
    OtpVerifyRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    SignUpOut,
    SignUpRequest,
)
from src.services.access_service import AccessService
from src.services.adapters.mailer_adapter import MailerAdapter
from src.services.key_token_service import KeyTokenService

AuthDep = Annotated[AuthContext, Depends(authentication_v2)]


def get_access_service(
    user_repo: Annotated[UserRepository, Depends(UserRepository)],
    credentials_repo: Annotated[CredentialsRepository, Depends(CredentialsRepository)],
    otp_repo: Annotated[OtpRepository, Depends(OtpRepository)],
    key_token_repo: Annotated[KeyTokenRepository, Depends(KeyTokenRepository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AccessService:
    mailer = MailerAdapter(settings=settings)
    key_token_service = KeyTokenService(key_token_repo, settings)
    return AccessService(
        user_repo=user_repo,
        credentials_repo=credentials_repo,
        otp_repo=otp_repo,
        key_token_service=key_token_service,
        mailer_adapter=mailer,
        settings=settings,
    )


AccessServiceDep = Annotated[AccessService, Depends(get_access_service)]


async def signup(
    payload: SignUpRequest,
    access_service: AccessServiceDep,
) -> SuccessResponse[SignUpOut]:
    result = await access_service.sign_up(payload)
    return created(result, message="Create new user success!")


async def verify_otp(
    payload: OtpVerifyRequest,
    access_service: AccessServiceDep,
) -> SuccessResponse[OtpVerifyOut]:
    result = await access_service.verify_otp(payload)
    return ok(result, message="Account verification success!")


async def resend_otp(
    payload: ResendOtpRequest,
    access_service: AccessServiceDep,
) -> SuccessResponse[bool]:
    result = await access_service.resend_otp(payload)
    return ok(result, message="Resend OTP success!")


async def login(
    payload: LoginRequest,
    access_service: AccessServiceDep,
) -> SuccessResponse[LoginOut]:
    result = await access_service.login(payload)
    return ok(result, message="Login user success!")


async def forgot_password(
    payload: ForgotPasswordRequest,
    access_service: AccessServiceDep,
) -> SuccessResponse[bool]:
    result = await access_service.forgot_password(payload)
    return ok(result, message="Send reset password link success!")


async def reset_password(
    payload: ResetPasswordRequest,
    access_service: AccessServiceDep,
) -> SuccessResponse[bool]:
    result = await access_service.reset_password(payload)
    return ok(result, message="Reset password success!")


async def logout(
    auth: AuthDep,
    access_service: AccessServiceDep,
) -> SuccessResponse[bool]:
    result = await access_service.logout(auth)
    return ok(result, message="Logout success!")
