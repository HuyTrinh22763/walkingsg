from datetime import datetime
from enum import StrEnum

from beanie import Document, Insert, PydanticObjectId, Replace, Save, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "profiles"


class MobilityNeeds(StrEnum):
    NONE = "None"
    WHEELCHAIR = "Wheelchair"
    MOBILITY_AID = "Mobility Aid"


class HeatUvSensitivity(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class PreferredPace(StrEnum):
    SLOW = "Slow"
    RELAXED = "Relaxed"
    BRISK = "Brisk"


class ProfileModel(Document):
    user_id: PydanticObjectId
    name: str = ""
    age: int | None = None
    mobility_needs: MobilityNeeds = MobilityNeeds.NONE
    heat_uv_sensitivity: HeatUvSensitivity = HeatUvSensitivity.MEDIUM
    max_stairs_per_route: int = Field(default=10, ge=0, le=50)
    preferred_pace: PreferredPace = PreferredPace.RELAXED
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = COLLECTION_NAME
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]

    @before_event(Insert, Replace, Save)
    def touch(self) -> None:
        self.updated_at = utc_now()