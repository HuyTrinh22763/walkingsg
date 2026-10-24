from datetime import datetime
from typing import Any

from pydantic import Field, model_validator

from src.helper.hazard_helper import format_hazard_response
from src.model.hazard_model import HazardType
from src.schemas.access_schema import BaseRequest, BaseResponse


class HazardReportRequest(BaseRequest):
    hazard_type: HazardType
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


class NearbyHazardsQuery(BaseRequest):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


class HazardOut(BaseResponse):
    hazard_id: str
    hazard_type: HazardType
    segment_id: str
    latitude: float
    longitude: float
    report_timestamp: datetime

    @model_validator(mode="before")
    @classmethod
    def format_response(cls, value: Any) -> Any:
        return format_hazard_response(value)
