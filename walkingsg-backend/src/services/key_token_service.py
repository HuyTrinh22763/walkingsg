import secrets
from datetime import timedelta

import jwt
from beanie import PydanticObjectId

from src.auth.auth_utils import JWT_ALGORITHM, TokenPayload, decode_token
from src.configs.config import Settings
from src.core.error_response import AuthFailureError
from src.model.key_token_model import KeyTokenModel
from src.model.repository.key_token_repo import KeyTokenRepository
from src.utils.index import utc_now


class KeyTokenService:
    def __init__(
        self,
        key_token_repo: KeyTokenRepository,
        settings: Settings,
    ) -> None:
        self._key_token_repo = key_token_repo
        self._settings = settings

    async def create_token_pair(
        self,
        *,
        user_id: PydanticObjectId,
        email: str,
    ) -> tuple[str, str]:
        now = utc_now()
        access_exp = now + timedelta(hours=2)
        refresh_exp = now + timedelta(days=7)
        token_id = secrets.token_hex(16)
        secret = self._settings.jwt_secret.get_secret_value()

        access_payload = {
            "user_id": str(user_id),
            "email": email,
            "token_id": token_id,
            "iat": int(now.timestamp()),
            "exp": int(access_exp.timestamp()),
        }
        refresh_payload = {
            "user_id": str(user_id),
            "email": email,
            "token_id": token_id,
            "iat": int(now.timestamp()),
            "exp": int(refresh_exp.timestamp()),
        }

        access_token = jwt.encode(access_payload, secret, algorithm=JWT_ALGORITHM)
        refresh_token = jwt.encode(refresh_payload, secret, algorithm=JWT_ALGORITHM)

        await self._key_token_repo.create(
            user_id=user_id,
            token_id=token_id,
            refresh_token=refresh_token,
            expires_at=refresh_exp,
        )

        return access_token, refresh_token

    async def verify_refresh_token(self, token: str) -> TokenPayload:
        secret = self._settings.jwt_secret.get_secret_value()
        payload = decode_token(token, secret)
        key_store = await self._key_token_repo.find_by_user_id(user_id=payload.user_id)
        if key_store is None or key_store.is_revoked:
            raise AuthFailureError("Invalid session or refresh token revoked")
        return payload

    async def revoke_token(self, *, token_id: str) -> KeyTokenModel | None:
        return await self._key_token_repo.revoke_token(token_id=token_id)

    async def delete_by_user_id(self, *, user_id: PydanticObjectId) -> int:
        return await self._key_token_repo.delete_by_user_id(user_id=user_id)
