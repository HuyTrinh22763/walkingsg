from enum import StrEnum

from pydantic import Field

from src.schemas.access_schema import BaseRequest, BaseResponse


class PointType(StrEnum):
    ORIGIN = "origin"
    DESTINATION = "destination"


class AutocompleteQuery(BaseRequest):
    query: str = Field(min_length=1, max_length=100)


class LocationOut(BaseResponse):
    address_label: str
    latitude: float
    longitude: float


class CoordinateValidationRequest(BaseRequest):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    point_type: PointType | None = None


class CoordinateValidationOut(BaseResponse):
    is_valid: bool
    error_message: str | None = None
