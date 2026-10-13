from typing import Annotated

from fastapi import Depends, Header

from src.configs.config import Settings, get_settings
from src.core.error_response import ForbiddenError
from src.schemas.common_schema import HeaderName


async def check_api_key(
    api_key: Annotated[str | None, Header(alias=HeaderName.API_KEY)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> str:
    if not api_key:
        raise ForbiddenError("Missing API key")
    if api_key != settings.api_key.get_secret_value():
        raise ForbiddenError("Invalid API key")
    return api_key


def check_permission(required: str):
    async def dependency(
        api_key: Annotated[str, Depends(check_api_key)],
    ) -> str:
        return api_key

    return dependency
