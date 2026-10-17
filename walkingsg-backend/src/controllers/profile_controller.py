from typing import Annotated

from fastapi import Depends

from src.auth.auth_utils import AuthContext, authentication_v2
from src.configs.config import Settings, get_settings
from src.core.success_response import SuccessResponse, ok
from src.model.repository.credentials_repo import CredentialsRepository
from src.model.repository.key_token_repo import KeyTokenRepository
from src.model.repository.otp_repo import OtpRepository
from src.model.repository.profile_repo import ProfileRepository
from src.model.repository.user_repo import UserRepository
from src.schemas.profile_schema import DeleteAccountRequest, ProfileOut, ProfileUpdate
from src.services.key_token_service import KeyTokenService
from src.services.profile_service import ProfileService

AuthDep = Annotated[AuthContext, Depends(authentication_v2)]


def get_profile_service(
    profile_repo: Annotated[ProfileRepository, Depends(ProfileRepository)],
    user_repo: Annotated[UserRepository, Depends(UserRepository)],
    credentials_repo: Annotated[CredentialsRepository, Depends(CredentialsRepository)],
    otp_repo: Annotated[OtpRepository, Depends(OtpRepository)],
    key_token_repo: Annotated[KeyTokenRepository, Depends(KeyTokenRepository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProfileService:
    key_token_service = KeyTokenService(key_token_repo, settings)
    return ProfileService(
        profile_repo=profile_repo,
        user_repo=user_repo,
        credentials_repo=credentials_repo,
        otp_repo=otp_repo,
        key_token_service=key_token_service,
    )


ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]


async def get_profile(
    auth: AuthDep,
    profile_service: ProfileServiceDep,
) -> SuccessResponse[ProfileOut]:
    result = await profile_service.get_profile(auth.user.user_id)
    return ok(result, message="Get profile success!")


async def update_profile(
    payload: ProfileUpdate,
    auth: AuthDep,
    profile_service: ProfileServiceDep,
) -> SuccessResponse[ProfileOut]:
    result = await profile_service.update_profile(auth.user.user_id, payload)
    return ok(result, message="Update profile success!")


async def delete_account(
    payload: DeleteAccountRequest,
    auth: AuthDep,
    profile_service: ProfileServiceDep,
) -> SuccessResponse[bool]:
    result = await profile_service.delete_account(auth.user.user_id, payload)
    return ok(result, message="Delete account success!")