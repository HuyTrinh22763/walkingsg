from datetime import datetime
from enum import StrEnum
from typing import Literal

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, GEOSPHERE, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "hazards"


class HazardType(StrEnum):
    LIFT = "lift"
    FLOODING = "flooding"
    BLOCKED = "blocked"
    UNWALKABLE = "unwalkable"
    UNEVEN = "uneven"
    OTHER = "other"


class HazardStatus(StrEnum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"


class HazardLocation(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]  # (longitude, latitude)


class HazardModel(Document):
    reported_by_user_id: PydanticObjectId
    segment_id: str
    hazard_type: HazardType
    hazard_status: HazardStatus = HazardStatus.ACTIVE
    location: HazardLocation
    report_timestamp: datetime = Field(default_factory=utc_now)

    class Settings:
        name = COLLECTION_NAME
        indexes = [
            IndexModel([("location", GEOSPHERE)]),
            IndexModel(
                [("hazard_status", ASCENDING), ("report_timestamp", DESCENDING)]
            ),
        ]
