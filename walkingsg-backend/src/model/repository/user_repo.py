from datetime import datetime

from beanie import PydanticObjectId

from src.model.user_model import UserModel


class UserRepository:
    async def find_by_id(self, *, user_id: PydanticObjectId) -> UserModel | None:
        return await UserModel.get(user_id)

    async def find_by_email(self, *, email: str) -> UserModel | None:
        return await UserModel.find_one({"user_email": email})

    async def create(self, *, user_email: str) -> UserModel:
        user = UserModel(user_email=user_email)
        await user.insert()
        return user

    async def set_lockout(
        self,
        *,
        user_id: PydanticObjectId,
        is_locked: bool,
        lock_expires_at: datetime | None,
    ) -> UserModel | None:
        user = await UserModel.get(user_id)
        if user is None:
            return None
        user.is_locked = is_locked
        user.lock_expires_at = lock_expires_at
        await user.save()
        return user

    async def delete_by_id(self, *, user_id: PydanticObjectId) -> bool:
        user = await UserModel.get(user_id)
        if user is None:
            return False
        await user.delete()
        return True
