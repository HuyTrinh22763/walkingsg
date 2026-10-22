from typing import Any

from pydantic import ConfigDict, field_validator

from src.schemas.access_schema import BaseRequest, BaseResponse


def _validate_coord(value: tuple[float, float], field_name: str) -> tuple[float, float]:
    latitude, longitude = value
    if not -90.0 <= latitude <= 90.0:
        raise ValueError(f"{field_name} latitude must be between -90 and 90")
    if not -180.0 <= longitude <= 180.0:
        raise ValueError(f"{field_name} longitude must be between -180 and 180")
    return value


class RouteSearchRequest(BaseRequest):
    origin_coord: tuple[float, float]
    destination_coord: tuple[float, float]
    origin_name: str = "Origin"
    destination_name: str = "Destination"

    @field_validator("origin_coord")
    @classmethod
    def validate_origin_coord(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _validate_coord(value, "origin_coord")

    @field_validator("destination_coord")
    @classmethod
    def validate_destination_coord(
        cls, value: tuple[float, float]
    ) -> tuple[float, float]:
        return _validate_coord(value, "destination_coord")


class RouteVariantSummary(BaseResponse):
    route_id: str
    route_type: str
    total_distance: float
    estimated_time: int
    match_score: float
    sheltered_percentage: float
    stair_count: int
    is_starred: bool

    @field_validator("route_id", mode="before")
    @classmethod
    def convert_route_id(cls, value: Any) -> str:
        return str(value)


class RouteSearchOut(BaseResponse):
    starred_route: RouteVariantSummary
    alternative_routes: list[RouteVariantSummary]


class RouteDetailOut(RouteVariantSummary):
    polyline: list[list[float]] = []
    steps: list[str] = []

    @field_validator("polyline")
    @classmethod
    def validate_polyline(
        cls, value: list[list[float]]
    ) -> list[list[float]]:
        for point in value:
            if len(point) != 2:
                raise ValueError("Each polyline point must be [latitude, longitude]")
        return value
