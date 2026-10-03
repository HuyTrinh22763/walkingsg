from datetime import datetime

from beanie import Document, Insert, Replace, Save, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "users"


class UserModel(Document):
    user_email: str
    is_locked: bool = False
    lock_expires_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = COLLECTION_NAME
        indexes = [IndexModel([("user_email", ASCENDING)], unique=True)]

    @before_event(Insert, Replace, Save)
    def touch(self) -> None:
        self.updated_at = utc_now()
