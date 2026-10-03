from beanie import PydanticObjectId

from src.model.credentials_model import CredentialsModel


class CredentialsRepository:
    async def find_by_user_id(
        self, *, user_id: PydanticObjectId
    ) -> CredentialsModel | None:
        return await CredentialsModel.find_one({"user_id": user_id})

    async def create(
        self,
        *,
        user_id: PydanticObjectId,
        email_id: str,
        password_hash: str,
    ) -> CredentialsModel:
        creds = CredentialsModel(
            user_id=user_id,
            email_id=email_id,
            password_hash=password_hash,
            failed_login_attempts=0,
        )
        await creds.insert()
        return creds

    async def increment_failed_attempts(
        self, *, credentials_id: PydanticObjectId
    ) -> CredentialsModel | None:
        creds = await CredentialsModel.get(credentials_id)
        if creds is None:
            return None
        creds.failed_login_attempts += 1
        await creds.save()
        return creds

    async def reset_failed_attempts(
        self, *, credentials_id: PydanticObjectId
    ) -> CredentialsModel | None:
        creds = await CredentialsModel.get(credentials_id)
        if creds is None:
            return None
        creds.failed_login_attempts = 0
        await creds.save()
        return creds

    async def update_password(
        self, *, user_id: PydanticObjectId, password_hash: str
    ) -> CredentialsModel | None:
        creds = await CredentialsModel.find_one({"user_id": user_id})
        if creds is None:
            return None
        creds.password_hash = password_hash
        creds.failed_login_attempts = 0
        await creds.save()
        return creds

    async def delete_by_user_id(self, *, user_id: PydanticObjectId) -> bool:
        creds = await CredentialsModel.find_one({"user_id": user_id})
        if creds is None:
            return False
        await creds.delete()
        return True
