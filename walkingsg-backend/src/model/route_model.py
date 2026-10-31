from datetime import datetime
from enum import StrEnum

from beanie import Document, Insert, PydanticObjectId, Replace, Save, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "routes"


class RouteType(StrEnum):
    DIRECT = "Direct"
    MAX_SHELTER = "Maximum Shelter"
    BARRIER_FREE = "Barrier-Free"
    LOW_EFFORT = "Low-Effort"
    WIDE_QUIET = "Wide/Quiet"


class RouteModel(Document):
    user_id: PydanticObjectId
    route_type: RouteType
    origin_name: str
    origin_coordinates: tuple[float, float]  # (latitude, longitude)
    destination_name: str
    destination_coordinates: tuple[float, float]  # (latitude, longitude)
    total_distance: float = Field(ge=0)
    estimated_time: int = Field(ge=0)
    match_score: float = Field(default=0.0, ge=0, le=100)
    sheltered_percentage: float = Field(default=0.0, ge=0, le=100)
    stair_count: int = Field(default=0, ge=0)
    segment_ids: list[str] = []
    polyline: list[list[float]] = []
    steps: list[str] = []
    hazard_ids: list[str] = []
    hazard_count: int = 0
    is_starred: bool = False
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = COLLECTION_NAME
        indexes = [IndexModel([("user_id", ASCENDING)])]

    @before_event(Insert, Replace, Save)
    def touch(self) -> None:
        self.updated_at = utc_now()
