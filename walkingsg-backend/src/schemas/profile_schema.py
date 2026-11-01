from datetime import date, datetime, timedelta, timezone
from typing import Any, Self

from pydantic import ConfigDict, Field, field_validator, model_validator

from src.model.profile_model import HeatUvSensitivity, MobilityNeeds, PreferredPace
from src.schemas.access_schema import BaseRequest, BaseResponse

MIN_BIRTH_YEAR = 1940
MAX_AGE = 120
SINGAPORE_TZ = timezone(timedelta(hours=8))


class ProfileUpdate(BaseRequest):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=50)
    age: int = Field(ge=0, le=MAX_AGE)
    date_of_birth: str | None = None
    mobility_needs: MobilityNeeds
    heat_uv_sensitivity: HeatUvSensitivity
    max_stairs_per_route: int = Field(ge=0, le=50, multiple_of=5)
    preferred_pace: PreferredPace

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = date.fromisoformat(value)
        today_sgt = datetime.now(SINGAPORE_TZ).date()
        if parsed.year < MIN_BIRTH_YEAR or parsed > today_sgt:
            raise ValueError(
                f"date_of_birth must be between {MIN_BIRTH_YEAR}-01-01 and today"
            )
        return parsed.isoformat()


class ProfileOut(BaseResponse):
    id: str
    user_id: str
    name: str
    age: int | None
    date_of_birth: str | None = None
    is_onboarded: bool = False
    mobility_needs: MobilityNeeds
    heat_uv_sensitivity: HeatUvSensitivity
    max_stairs_per_route: int
    preferred_pace: PreferredPace

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_ids(cls, value: Any) -> str:
        return str(value)

    @model_validator(mode="after")
    def compute_onboarded(self) -> Self:
        self.is_onboarded = bool(self.name.strip()) and self.age is not None
        return self


class DeleteAccountRequest(BaseRequest):
    confirmation: bool