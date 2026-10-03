from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, Save, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "credentials"


class CredentialsModel(Document):
    user_id: PydanticObjectId
    email_id: str
    password_hash: str
    failed_login_attempts: int = 0
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = COLLECTION_NAME
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]

    @before_event(Insert, Replace, Save)
    def touch(self) -> None:
        self.updated_at = utc_now()
