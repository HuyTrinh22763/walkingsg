from datetime import datetime

from beanie import PydanticObjectId

from src.model.key_token_model import KeyTokenModel


class KeyTokenRepository:
    async def create(
        self,
        *,
        user_id: PydanticObjectId,
        token_id: str,
        refresh_token: str,
        expires_at: datetime,
    ) -> KeyTokenModel:
        key_token = KeyTokenModel(
            user_id=user_id,
            token_id=token_id,
            refresh_token=refresh_token,
            expires_at=expires_at,
            is_revoked=False,
        )
        await key_token.insert()
        return key_token

    async def find_by_user_id(
        self, *, user_id: PydanticObjectId
    ) -> KeyTokenModel | None:
        return await KeyTokenModel.find_one(
            {"user_id": user_id, "is_revoked": False}
        )

    async def find_by_token_id(self, *, token_id: str) -> KeyTokenModel | None:
        return await KeyTokenModel.find_one({"token_id": token_id})

    async def revoke_token(self, *, token_id: str) -> KeyTokenModel | None:
        key_token = await KeyTokenModel.find_one({"token_id": token_id})
        if key_token is None:
            return None
        key_token.is_revoked = True
        await key_token.save()
        return key_token

    async def delete_by_user_id(self, *, user_id: PydanticObjectId) -> int:
        result = await KeyTokenModel.find({"user_id": user_id}).delete()
        return int(result.deleted_count) if result else 0
