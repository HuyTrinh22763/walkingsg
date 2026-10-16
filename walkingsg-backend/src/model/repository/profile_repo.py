from typing import Any

from beanie import PydanticObjectId

from src.model.profile_model import ProfileModel


class ProfileRepository:
    async def find_by_user_id(self, *, user_id: PydanticObjectId) -> ProfileModel | None:
        return await ProfileModel.find_one(ProfileModel.user_id == user_id)

    async def create(self, *, user_id: PydanticObjectId, **fields: Any) -> ProfileModel:
        profile = ProfileModel(user_id=user_id, **fields)
        await profile.insert()
        return profile

    async def update_by_user_id(
        self, *, user_id: PydanticObjectId, fields: dict[str, Any]
    ) -> ProfileModel | None:
        profile = await self.find_by_user_id(user_id=user_id)
        if profile is None:
            return None
        for key, value in fields.items():
            setattr(profile, key, value)
        await profile.save()
        return profile

    async def delete_by_user_id(self, *, user_id: PydanticObjectId) -> bool:
        result = await ProfileModel.find(ProfileModel.user_id == user_id).delete()
        return bool(result and result.deleted_count)