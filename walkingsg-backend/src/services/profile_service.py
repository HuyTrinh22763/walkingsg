from datetime import date, datetime

from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, NotFoundError
from src.model.profile_model import MobilityNeeds
from src.model.repository.credentials_repo import CredentialsRepository
from src.model.repository.otp_repo import OtpRepository
from src.model.repository.profile_repo import ProfileRepository
from src.model.repository.user_repo import UserRepository
from src.schemas.profile_schema import (
    SINGAPORE_TZ,
    DeleteAccountRequest,
    ProfileOut,
    ProfileUpdate,
)
from src.services.key_token_service import KeyTokenService


def _calculate_age(dob: date, today: date) -> int:
    has_had_birthday = (today.month, today.day) >= (dob.month, dob.day)
    return max(0, today.year - dob.year - (0 if has_had_birthday else 1))


class ProfileService:
    def __init__(
        self,
        profile_repo: ProfileRepository,
        user_repo: UserRepository,
        credentials_repo: CredentialsRepository,
        otp_repo: OtpRepository,
        key_token_service: KeyTokenService,
    ) -> None:
        self._profile_repo = profile_repo
        self._user_repo = user_repo
        self._credentials_repo = credentials_repo
        self._otp_repo = otp_repo
        self._key_token_service = key_token_service

    async def get_profile(self, user_id: PydanticObjectId) -> ProfileOut:
        profile = await self._profile_repo.find_by_user_id(user_id=user_id)
        if profile is None:
            profile = await self._profile_repo.create(user_id=user_id)
        return ProfileOut.model_validate(profile)

    async def update_profile(
        self, user_id: PydanticObjectId, payload: ProfileUpdate
    ) -> ProfileOut:
        fields = payload.model_dump(exclude_unset=True)
        if payload.date_of_birth is not None:
            dob = date.fromisoformat(payload.date_of_birth)
            today_sgt = datetime.now(SINGAPORE_TZ).date()
            fields["age"] = _calculate_age(dob, today_sgt)
        if payload.mobility_needs == MobilityNeeds.WHEELCHAIR:
            fields["max_stairs_per_route"] = 0

        profile = await self._profile_repo.update_by_user_id(user_id=user_id, fields=fields)
        if profile is None:
            profile = await self._profile_repo.create(user_id=user_id, **fields)
        return ProfileOut.model_validate(profile)

    async def delete_account(
        self, user_id: PydanticObjectId, payload: DeleteAccountRequest
    ) -> bool:
        if not payload.confirmation:
            raise BadRequestError("Account deletion must be confirmed")

        user = await self._user_repo.find_by_id(user_id=user_id)
        if user is None:
            raise NotFoundError("User not found")

        await self._key_token_service.delete_by_user_id(user_id=user_id)
        await self._otp_repo.delete_by_user_id(user_id=user_id)
        await self._profile_repo.delete_by_user_id(user_id=user_id)
        await self._credentials_repo.delete_by_user_id(user_id=user_id)
        await self._user_repo.delete_by_id(user_id=user_id)
        return True