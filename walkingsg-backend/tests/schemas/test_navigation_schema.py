import pytest
from beanie import PydanticObjectId
from pydantic import ValidationError

from src.schemas.navigation_schema import (
    NavEndOut,
    NavEndRequest,
    NavStartOut,
    NavStartRequest,
    NavTrackOut,
    NavTrackRequest,
)
from src.schemas.route_schema import RouteVariantSummary


def test_nav_start_request_valid() -> None:
    req = NavStartRequest(route_id="route-123")
    assert req.route_id == "route-123"


def test_nav_start_request_forbids_extra() -> None:
    with pytest.raises(ValidationError):
        NavStartRequest(route_id="route-123", extra_field="forbidden")  # type: ignore[call-arg]


def test_nav_start_out_conversion() -> None:
    obj_id = PydanticObjectId()
    out = NavStartOut(session_id=obj_id, status="ACTIVE")
    assert out.session_id == str(obj_id)
    assert out.status == "ACTIVE"


def test_nav_track_request_valid() -> None:
    req = NavTrackRequest(
        session_id="sess-123",
        current_coord=(1.3483, 103.6831),
        speed_kmh=4.5,
    )
    assert req.session_id == "sess-123"
    assert req.current_coord == (1.3483, 103.6831)
    assert req.speed_kmh == 4.5


def test_nav_track_request_invalid_coord() -> None:
    # Invalid latitude
    with pytest.raises(ValidationError):
        NavTrackRequest(
            session_id="sess-123",
            current_coord=(95.0, 103.6831),
            speed_kmh=4.5,
        )

    # Invalid longitude
    with pytest.raises(ValidationError):
        NavTrackRequest(
            session_id="sess-123",
            current_coord=(1.3483, 190.0),
            speed_kmh=4.5,
        )


def test_nav_track_request_negative_speed() -> None:
    with pytest.raises(ValidationError):
        NavTrackRequest(
            session_id="sess-123",
            current_coord=(1.3483, 103.6831),
            speed_kmh=-1.0,
        )


def test_nav_track_out_serialization() -> None:
    out = NavTrackOut(
        status="ACTIVE",
        motion_warning=False,
        next_instruction="Turn left onto Nanyang Ave",
        remaining_dist=245.67,
        remaining_time=180,
    )
    assert out.status == "ACTIVE"
    assert out.motion_warning is False
    assert out.next_instruction == "Turn left onto Nanyang Ave"
    assert out.remaining_dist == 245.7  # rounded to 1 decimal place
    assert out.remaining_time == 180
    assert out.recalculated_route is None


def test_nav_track_out_with_recalculated_route() -> None:
    recalc = RouteVariantSummary(
        route_id="route-new-456",
        route_type="Direct",
        total_distance=350.0,
        estimated_time=240,
        match_score=92.5,
        sheltered_percentage=80.0,
        stair_count=0,
        is_starred=True,
    )
    out = NavTrackOut(
        status="ACTIVE",
        motion_warning=True,
        next_instruction="Rerouted: continue straight",
        remaining_dist=350.0,
        remaining_time=240,
        recalculated_route=recalc,
    )
    assert out.motion_warning is True
    assert out.recalculated_route is not None
    assert out.recalculated_route.route_id == "route-new-456"


def test_nav_end_request_valid() -> None:
    req = NavEndRequest(session_id="sess-123")
    assert req.session_id == "sess-123"
    assert req.manual_cancel is False

    req_cancel = NavEndRequest(session_id="sess-123", manual_cancel=True)
    assert req_cancel.manual_cancel is True


def test_nav_end_request_forbids_extra() -> None:
    with pytest.raises(ValidationError):
        NavEndRequest(session_id="sess-123", unknown_prop=True)  # type: ignore[call-arg]


def test_nav_end_out_conversion() -> None:
    obj_id = PydanticObjectId()
    out = NavEndOut(session_id=obj_id, status="CANCELLED")
    assert out.session_id == str(obj_id)
    assert out.status == "CANCELLED"
