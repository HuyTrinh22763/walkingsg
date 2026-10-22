from datetime import datetime
from enum import StrEnum

from beanie import Document, Insert, PydanticObjectId, Replace, Save, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "navigation_sessions"


class NavigationStatus(StrEnum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class NavigationSessionModel(Document):
    user_id: PydanticObjectId
    route_id: PydanticObjectId
    current_location: tuple[float, float]  # (latitude, longitude)
    traversed_segment_ids: list[str] = []
    session_status: NavigationStatus = NavigationStatus.ACTIVE
    started_at: datetime = Field(default_factory=utc_now)
    ended_at: datetime | None = None
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = COLLECTION_NAME
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("session_status", ASCENDING)]),
        ]

    @before_event(Insert, Replace, Save)
    def touch(self) -> None:
        self.updated_at = utc_now()
