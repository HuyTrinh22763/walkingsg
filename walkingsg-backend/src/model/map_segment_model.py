from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

COLLECTION_NAME = "map_segments"


class MapSegmentModel(Document):
    segment_id: str
    start_coordinates: tuple[float, float]  # (latitude, longitude)
    end_coordinates: tuple[float, float]  # (latitude, longitude)
    confidence_score: float = Field(default=0.0, ge=-20, le=20)
    is_barrier_free: bool = False
    stair_count: int = Field(default=0, ge=0)
    is_sheltered: bool = False

    class Settings:
        name = COLLECTION_NAME
        indexes = [IndexModel([("segment_id", ASCENDING)], unique=True)]
