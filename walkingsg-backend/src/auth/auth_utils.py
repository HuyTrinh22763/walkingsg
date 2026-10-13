from dataclasses import dataclass
from typing import Annotated

import jwt
from beanie import PydanticObjectId
from fastapi import Depends, Header
from pydantic import BaseModel

from src.configs.config import Settings, get_settings
from src.core.error_response import AuthFailureError
from src.model.key_token_model import KeyTokenModel
from src.model.repository.key_token_repo import KeyTokenRepository
from src.schemas.common_schema import HeaderName

JWT_ALGORITHM = "HS256"


class TokenPayload(BaseModel):
    user_id: PydanticObjectId
    email: str


@dataclass(frozen=True, slots=True)
class AuthContext:
    user: TokenPayload
    key_store: KeyTokenModel
    refresh_token: str | None = None


def decode_token(token: str, secret: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        return TokenPayload.model_validate(payload)
    except jwt.ExpiredSignatureError as err:
        raise AuthFailureError("Token expired") from err
    except jwt.InvalidTokenError as err:
        raise AuthFailureError("Invalid token") from err


async def authentication_v2(
    client_id: Annotated[str | None, Header(alias=HeaderName.CLIENT_ID)] = None,
    authorization: Annotated[str | None, Header(alias=HeaderName.AUTHORIZATION)] = None,
    refresh_token: Annotated[str | None, Header(alias=HeaderName.REFRESH_TOKEN)] = None,
    key_token_repo: Annotated[KeyTokenRepository, Depends(KeyTokenRepository)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AuthContext:
    if not client_id:
        raise AuthFailureError("Missing client ID")

    try:
        user_id = PydanticObjectId(client_id)
    except Exception as err:
        raise AuthFailureError("Invalid client ID") from err

    key_store = await key_token_repo.find_by_user_id(user_id=user_id)
    if key_store is None or key_store.is_revoked:
        raise AuthFailureError("Invalid key store or session revoked")

    secret = settings.jwt_secret.get_secret_value()

    if refresh_token:
        token_payload = decode_token(refresh_token, secret)
        if token_payload.user_id != user_id:
            raise AuthFailureError("Invalid client ID for token")
        return AuthContext(user=token_payload, key_store=key_store, refresh_token=refresh_token)

    if not authorization:
        raise AuthFailureError("Missing authorization token")

    token = authorization.removeprefix("Bearer ").strip()
    token_payload = decode_token(token, secret)
    if token_payload.user_id != user_id:
        raise AuthFailureError("Invalid client ID for token")

    return AuthContext(user=token_payload, key_store=key_store)
