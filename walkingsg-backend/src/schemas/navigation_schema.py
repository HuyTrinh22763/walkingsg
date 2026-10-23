from typing import Any

from pydantic import Field, field_validator

from src.schemas.access_schema import BaseRequest, BaseResponse
from src.schemas.route_schema import RouteVariantSummary
from src.utils.index import validate_coordinates


class NavStartRequest(BaseRequest):
    route_id: str = Field(min_length=1)


class NavStartOut(BaseResponse):
    session_id: str
    status: str

    @field_validator("session_id", mode="before")
    @classmethod
    def convert_session_id(cls, value: Any) -> str:
        return str(value)


class NavTrackRequest(BaseRequest):
    session_id: str = Field(min_length=1)
    current_coord: tuple[float, float]
    speed_kmh: float = Field(ge=0.0)

    @field_validator("current_coord")
    @classmethod
    def validate_current_coord(
        cls, value: tuple[float, float]
    ) -> tuple[float, float]:
        return validate_coordinates(value, "current_coord")


class NavTrackOut(BaseResponse):
    status: str
    motion_warning: bool
    next_instruction: str
    remaining_dist: float = Field(ge=0.0)
    remaining_time: int = Field(ge=0)
    recalculated_route: RouteVariantSummary | None = None

    @field_validator("remaining_dist")
    @classmethod
    def round_remaining_dist(cls, value: float) -> float:
        return round(value, 1)


class NavEndRequest(BaseRequest):
    session_id: str = Field(min_length=1)
    manual_cancel: bool = False


class NavEndOut(BaseResponse):
    session_id: str
    status: str

    @field_validator("session_id", mode="before")
    @classmethod
    def convert_session_id(cls, value: Any) -> str:
        return str(value)
