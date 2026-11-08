from typing import Any

from pydantic import ConfigDict, Field, field_validator

from src.schemas.access_schema import BaseRequest, BaseResponse
from src.services.adapters.weather_adapter import WeatherCondition
from src.utils.index import validate_coordinates


class RouteSearchRequest(BaseRequest):
    origin_coord: tuple[float, float]
    destination_coord: tuple[float, float]
    origin_name: str = "Origin"
    destination_name: str = "Destination"
    weather_override: WeatherCondition | None = None

    @field_validator("origin_coord")
    @classmethod
    def validate_origin_coord(cls, value: tuple[float, float]) -> tuple[float, float]:
        return validate_coordinates(value, "origin_coord")

    @field_validator("destination_coord")
    @classmethod
    def validate_destination_coord(
        cls, value: tuple[float, float]
    ) -> tuple[float, float]:
        return validate_coordinates(value, "destination_coord")


class WeatherQuery(BaseRequest):
    latitude: float = Field(default=1.3521, ge=-90.0, le=90.0)
    longitude: float = Field(default=103.8198, ge=-180.0, le=180.0)
    weather_override: WeatherCondition | None = None


class WeatherContextOut(BaseResponse):
    condition: WeatherCondition
    forecast_text: str
    temperature_c: float
    area_name: str
    advisory_message: str
    shelter_weight_pct: int
    is_simulated: bool = False


class RouteVariantSummary(BaseResponse):
    route_id: str
    route_type: str
    total_distance: float
    estimated_time: int
    match_score: float
    sheltered_percentage: float
    stair_count: int
    hazard_count: int = 0
    is_starred: bool

    @field_validator("route_id", mode="before")
    @classmethod
    def convert_route_id(cls, value: Any) -> str:
        return str(value)


class RouteSearchOut(BaseResponse):
    starred_route: RouteVariantSummary
    alternative_routes: list[RouteVariantSummary]
    weather: WeatherContextOut | None = None


class RouteDetailOut(RouteVariantSummary):
    polyline: list[list[float]] = []
    steps: list[str] = []
    hazard_ids: list[str] = []

    @field_validator("polyline")
    @classmethod
    def validate_polyline(
        cls, value: list[list[float]]
    ) -> list[list[float]]:
        for point in value:
            if len(point) != 2:
                raise ValueError("Each polyline point must be [latitude, longitude]")
        return value
