from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "key_tokens"


class KeyTokenModel(Document):
    user_id: PydanticObjectId
    token_id: str
    refresh_token: str
    issued_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime
    is_revoked: bool = False

    class Settings:
        name = COLLECTION_NAME
        indexes = [IndexModel([("user_id", ASCENDING)])]
