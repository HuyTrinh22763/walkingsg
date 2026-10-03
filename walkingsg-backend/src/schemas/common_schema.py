from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class HeaderName(StrEnum):
    API_KEY = "x-api-key"
    CLIENT_ID = "x-client-id"
    AUTHORIZATION = "authorization"
    REFRESH_TOKEN = "x-rtoken-id"


class PaginationParams(BaseModel):
    limit: int = Field(default=50, ge=1, le=100)
    page: int = Field(default=1, ge=1)
    sort: Literal["ctime", "oldest"] = "ctime"


class GeoPointSchema(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]  # (longitude, latitude) per GeoJSON standard
