from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from src.utils.index import utc_now

COLLECTION_NAME = "otps"


class OtpModel(Document):
    user_id: PydanticObjectId
    otp_code: str
    issued_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime
    is_used: bool = False

    class Settings:
        name = COLLECTION_NAME
        indexes = [
            IndexModel([("user_id", ASCENDING), ("otp_code", ASCENDING)]),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        ]
