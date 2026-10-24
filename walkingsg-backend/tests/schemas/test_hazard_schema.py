import pytest
from beanie import PydanticObjectId
from pydantic import ValidationError

from src.model.hazard_model import HazardLocation, HazardModel, HazardType
from src.schemas.hazard_schema import (
    HazardOut,
    HazardReportRequest,
    NearbyHazardsQuery,
)
from src.utils.index import utc_now


def test_hazard_report_request_valid() -> None:
    request = HazardReportRequest(
        hazard_type=HazardType.FLOODING,
        latitude=1.3521,
        longitude=103.8198,
    )

    assert request.hazard_type == HazardType.FLOODING
    assert request.latitude == 1.3521
    assert request.longitude == 103.8198


def test_hazard_report_request_accepts_mobile_category_string() -> None:
    request = HazardReportRequest(
        hazard_type="blocked", latitude=1.3521, longitude=103.8198
    )

    assert request.hazard_type == HazardType.BLOCKED


def test_hazard_report_request_forbids_extra() -> None:
    with pytest.raises(ValidationError):
        HazardReportRequest(
            hazard_type=HazardType.OTHER,
            latitude=1.3521,
            longitude=103.8198,
            note="forbidden",  # type: ignore[call-arg]
        )


def test_hazard_report_request_rejects_unknown_type_and_bad_coordinate() -> None:
    with pytest.raises(ValidationError):
        HazardReportRequest(
            hazard_type="construction", latitude=1.3521, longitude=103.8198
        )
    with pytest.raises(ValidationError):
        HazardReportRequest(
            hazard_type=HazardType.LIFT, latitude=91.0, longitude=103.8198
        )


def test_hazard_out_unpacks_document() -> None:
    hazard_id = PydanticObjectId()
    reported_at = utc_now()
    hazard = HazardModel.model_construct(
        id=hazard_id,
        reported_by_user_id=PydanticObjectId(),
        segment_id="seg-1",
        hazard_type=HazardType.UNEVEN,
        location=HazardLocation(coordinates=(103.8198, 1.3521)),
        report_timestamp=reported_at,
    )

    out = HazardOut.model_validate(hazard)

    assert out.hazard_id == str(hazard_id)
    assert out.hazard_type == HazardType.UNEVEN
    assert out.segment_id == "seg-1"
    assert out.latitude == 1.3521
    assert out.longitude == 103.8198
    assert out.report_timestamp == reported_at


def test_nearby_hazards_query_forbids_extra() -> None:
    with pytest.raises(ValidationError):
        NearbyHazardsQuery(
            latitude=1.3521, longitude=103.8198, radius=1000  # type: ignore[call-arg]
        )
