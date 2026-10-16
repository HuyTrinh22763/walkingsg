from typing import Any

from pydantic import ConfigDict, Field, field_validator

from src.model.profile_model import HeatUvSensitivity, MobilityNeeds, PreferredPace
from src.schemas.access_schema import BaseRequest, BaseResponse


class ProfileUpdate(BaseRequest):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=50)
    age: int = Field(gt=0)
    mobility_needs: MobilityNeeds
    heat_uv_sensitivity: HeatUvSensitivity
    max_stairs_per_route: int = Field(ge=0, le=50, multiple_of=5)
    preferred_pace: PreferredPace


class ProfileOut(BaseResponse):
    id: str
    user_id: str
    name: str
    age: int | None
    mobility_needs: MobilityNeeds
    heat_uv_sensitivity: HeatUvSensitivity
    max_stairs_per_route: int
    preferred_pace: PreferredPace

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_ids(cls, value: Any) -> str:
        return str(value)


class DeleteAccountRequest(BaseRequest):
    confirmation: bool