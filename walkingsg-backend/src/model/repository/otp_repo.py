from datetime import datetime

from beanie import PydanticObjectId

from src.model.otp_model import OtpModel
from src.utils.index import utc_now


class OtpRepository:
    async def create(
        self,
        *,
        user_id: PydanticObjectId,
        otp_code: str,
        expires_at: datetime,
    ) -> OtpModel:
        otp = OtpModel(
            user_id=user_id,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False,
        )
        await otp.insert()
        return otp

    async def find_active_otp(
        self,
        *,
        user_id: PydanticObjectId,
        otp_code: str,
    ) -> OtpModel | None:
        now = utc_now()
        return await OtpModel.find_one(
            {
                "user_id": user_id,
                "otp_code": otp_code,
                "is_used": False,
                "expires_at": {"$gt": now},
            }
        )

    async def find_valid_otp_for_reset(
        self,
        *,
        user_id: PydanticObjectId,
        otp_code: str,
    ) -> OtpModel | None:
        now = utc_now()
        return await OtpModel.find_one(
            {
                "user_id": user_id,
                "otp_code": otp_code,
                "expires_at": {"$gt": now},
            }
        )

    async def mark_used(self, *, otp_id: PydanticObjectId) -> OtpModel | None:
        otp = await OtpModel.get(otp_id)
        if otp is None:
            return None
        otp.is_used = True
        await otp.save()
        return otp

    async def delete_by_user_id(self, *, user_id: PydanticObjectId) -> int:
        result = await OtpModel.find({"user_id": user_id}).delete()
        return int(result.deleted_count) if result else 0
