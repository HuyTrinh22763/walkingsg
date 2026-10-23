from unittest.mock import AsyncMock, patch

import pytest
from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, ForbiddenError, NotFoundError
from src.model.map_segment_model import MapSegmentModel
from src.model.navigation_session_model import (
    NavigationSessionModel,
    NavigationStatus,
)
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.model.repository.navigation_session_repo import NavigationSessionRepository
from src.model.repository.route_repo import RouteRepository
from src.model.route_model import RouteModel, RouteType
from src.schemas.navigation_schema import (
    NavEndRequest,
    NavStartRequest,
    NavTrackRequest,
)
from src.schemas.route_schema import RouteSearchOut, RouteVariantSummary
from src.services.navigation_service import NavigationService
from src.services.route_service import RouteService
from src.utils.index import utc_now


def make_mock_route(route_id: PydanticObjectId, user_id: PydanticObjectId) -> RouteModel:
    return RouteModel.model_construct(
        id=route_id,
        user_id=user_id,
        route_type=RouteType.DIRECT,
        origin_name="Hall 11",
        origin_coordinates=(1.3500, 103.6800),
        destination_name="Hall 2",
        destination_coordinates=(1.3500, 103.6900),
        total_distance=1113.0,
        estimated_time=800,
        match_score=85.0,
        sheltered_percentage=60.0,
        stair_count=0,
        polyline=[
            [1.3500, 103.6800],
            [1.3500, 103.6850],
            [1.3500, 103.6900],
        ],
        steps=["Walk east towards North Spine", "Arrive at Hall 2"],
    )


@pytest.fixture
def mock_dependencies():
    session_repo = AsyncMock(spec=NavigationSessionRepository)
    route_repo = AsyncMock(spec=RouteRepository)
    map_segment_repo = AsyncMock(spec=MapSegmentRepository)
    route_service = AsyncMock(spec=RouteService)
    service = NavigationService(
        session_repo=session_repo,
        route_repo=route_repo,
        map_segment_repo=map_segment_repo,
        route_service=route_service,
    )
    return service, session_repo, route_repo, map_segment_repo, route_service


@pytest.mark.asyncio
async def test_start_navigation_success(mock_dependencies) -> None:
    service, session_repo, route_repo, _, _ = mock_dependencies
    user_id = PydanticObjectId()
    route_id = PydanticObjectId()
    session_id = PydanticObjectId()

    route = make_mock_route(route_id, user_id)
    route_repo.find_by_id.return_value = route
    session_repo.find_active_by_user.return_value = None

    mock_session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=user_id,
        route_id=route_id,
        current_location=route.origin_coordinates,
        traversed_segment_ids=[],
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.create.return_value = mock_session

    req = NavStartRequest(route_id=str(route_id))
    result = await service.start_navigation(user_id=user_id, payload=req)

    assert result.session_id == str(session_id)
    assert result.status == "ACTIVE"
    session_repo.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_navigation_cancels_previous_active_session(mock_dependencies) -> None:
    service, session_repo, route_repo, _, _ = mock_dependencies
    user_id = PydanticObjectId()
    route_id = PydanticObjectId()
    prev_session_id = PydanticObjectId()
    new_session_id = PydanticObjectId()

    route = make_mock_route(route_id, user_id)
    route_repo.find_by_id.return_value = route

    prev_session = NavigationSessionModel.model_construct(
        id=prev_session_id,
        user_id=user_id,
        route_id=route_id,
        current_location=(1.3500, 103.6800),
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.find_active_by_user.return_value = prev_session

    mock_session = NavigationSessionModel.model_construct(
        id=new_session_id,
        user_id=user_id,
        route_id=route_id,
        current_location=route.origin_coordinates,
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.create.return_value = mock_session

    req = NavStartRequest(route_id=str(route_id))
    result = await service.start_navigation(user_id=user_id, payload=req)

    session_repo.complete_session.assert_awaited_once_with(
        session=prev_session, status=NavigationStatus.CANCELLED
    )
    assert result.session_id == str(new_session_id)


@pytest.mark.asyncio
async def test_start_navigation_not_found_or_invalid_id(mock_dependencies) -> None:
    service, _, route_repo, _, _ = mock_dependencies
    user_id = PydanticObjectId()

    # Invalid ID format
    with pytest.raises(BadRequestError):
        await service.start_navigation(
            user_id=user_id, payload=NavStartRequest(route_id="not-an-oid")
        )

    # Route does not exist
    route_repo.find_by_id.return_value = None
    with pytest.raises(NotFoundError):
        await service.start_navigation(
            user_id=user_id, payload=NavStartRequest(route_id=str(PydanticObjectId()))
        )


@pytest.mark.asyncio
async def test_track_position_speed_warning(mock_dependencies) -> None:
    service, session_repo, route_repo, map_segment_repo, _ = mock_dependencies
    user_id = PydanticObjectId()
    session_id = PydanticObjectId()
    route_id = PydanticObjectId()

    session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=user_id,
        route_id=route_id,
        current_location=(1.3500, 103.6800),
        traversed_segment_ids=[],
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.find_by_id.return_value = session
    route_repo.find_by_id.return_value = make_mock_route(route_id, user_id)
    map_segment_repo.find_nearest_to_coord.return_value = None

    req = NavTrackRequest(
        session_id=str(session_id),
        current_coord=(1.3500, 103.6820),
        speed_kmh=28.5,  # Exceeds 25.0 km/h
    )

    out = await service.track_position(user_id=user_id, payload=req)

    assert out.motion_warning is True
    assert out.status == "ACTIVE"


@pytest.mark.asyncio
async def test_track_position_destination_arrival_and_confidence_increment(mock_dependencies) -> None:
    service, session_repo, route_repo, map_segment_repo, _ = mock_dependencies
    user_id = PydanticObjectId()
    session_id = PydanticObjectId()
    route_id = PydanticObjectId()

    session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=user_id,
        route_id=route_id,
        current_location=(1.3500, 103.6890),
        traversed_segment_ids=["seg-1", "seg-2"],
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.find_by_id.return_value = session
    route_repo.find_by_id.return_value = make_mock_route(route_id, user_id)

    # Mock segments for confidence score increment
    seg1 = MapSegmentModel.model_construct(segment_id="seg-1", confidence_score=10.0)
    seg2 = MapSegmentModel.model_construct(segment_id="seg-2", confidence_score=19.5)
    map_segment_repo.find_by_ids.return_value = [seg1, seg2]

    # Destination is at (1.3500, 103.6900). Current is within 2m.
    req = NavTrackRequest(
        session_id=str(session_id),
        current_coord=(1.3500, 103.6900),
        speed_kmh=4.0,
    )

    with patch.object(MapSegmentModel, "save", new_callable=AsyncMock) as mock_save:
        out = await service.track_position(user_id=user_id, payload=req)

        assert out.status == "COMPLETED"
        assert out.remaining_dist == 0.0
        assert out.remaining_time == 0
        assert "arrived" in out.next_instruction.lower()

        session_repo.complete_session.assert_awaited_once_with(
            session=session, status=NavigationStatus.COMPLETED
        )
        assert seg1.confidence_score == 11.0  # +1.0 increment
        assert seg2.confidence_score == 20.0  # clamped to 20.0 max
        assert mock_save.await_count == 2


@pytest.mark.asyncio
async def test_track_position_deviation_triggers_reroute(mock_dependencies) -> None:
    service, session_repo, route_repo, map_segment_repo, route_service = mock_dependencies
    user_id = PydanticObjectId()
    session_id = PydanticObjectId()
    route_id = PydanticObjectId()
    new_route_id = PydanticObjectId()

    session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=user_id,
        route_id=route_id,
        current_location=(1.3500, 103.6800),
        traversed_segment_ids=[],
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.find_by_id.return_value = session
    route_repo.find_by_id.return_value = make_mock_route(route_id, user_id)
    map_segment_repo.find_nearest_to_coord.return_value = None

    # Off route coordinate (30m off)
    reroute_summary = RouteVariantSummary(
        route_id=str(new_route_id),
        route_type="Direct",
        total_distance=850.0,
        estimated_time=600,
        match_score=90.0,
        sheltered_percentage=75.0,
        stair_count=0,
        is_starred=True,
    )
    route_service.generate_routes.return_value = RouteSearchOut(
        starred_route=reroute_summary,
        alternative_routes=[],
    )

    req = NavTrackRequest(
        session_id=str(session_id),
        current_coord=(1.3505, 103.6820),  # > 20m off polyline
        speed_kmh=4.5,
    )

    out = await service.track_position(user_id=user_id, payload=req)

    route_service.generate_routes.assert_awaited_once()
    session_repo.update_route.assert_awaited_once_with(
        session=session, route_id=new_route_id
    )
    assert out.recalculated_route is not None
    assert out.recalculated_route.route_id == str(new_route_id)


@pytest.mark.asyncio
async def test_track_position_forbidden_or_inactive(mock_dependencies) -> None:
    service, session_repo, _, _, _ = mock_dependencies
    session_id = PydanticObjectId()
    owner_id = PydanticObjectId()
    other_user_id = PydanticObjectId()

    session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=owner_id,
        route_id=PydanticObjectId(),
        current_location=(1.3500, 103.6800),
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.find_by_id.return_value = session

    # Different user access -> Forbidden
    with pytest.raises(ForbiddenError):
        await service.track_position(
            user_id=other_user_id,
            payload=NavTrackRequest(
                session_id=str(session_id),
                current_coord=(1.3500, 103.6800),
                speed_kmh=4.0,
            ),
        )

    # Inactive session -> BadRequest
    session.session_status = NavigationStatus.COMPLETED
    with pytest.raises(BadRequestError):
        await service.track_position(
            user_id=owner_id,
            payload=NavTrackRequest(
                session_id=str(session_id),
                current_coord=(1.3500, 103.6800),
                speed_kmh=4.0,
            ),
        )


@pytest.mark.asyncio
async def test_end_navigation_manual_cancel_and_complete(mock_dependencies) -> None:
    service, session_repo, _, _, _ = mock_dependencies
    user_id = PydanticObjectId()
    session_id = PydanticObjectId()

    session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=user_id,
        route_id=PydanticObjectId(),
        current_location=(1.3500, 103.6800),
        session_status=NavigationStatus.ACTIVE,
    )
    session_repo.find_by_id.return_value = session

    cancelled_session = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=user_id,
        route_id=PydanticObjectId(),
        current_location=(1.3500, 103.6800),
        session_status=NavigationStatus.CANCELLED,
    )
    session_repo.complete_session.return_value = cancelled_session

    req_cancel = NavEndRequest(session_id=str(session_id), manual_cancel=True)
    out_cancel = await service.end_navigation(user_id=user_id, payload=req_cancel)
    assert out_cancel.status == "CANCELLED"
    session_repo.complete_session.assert_awaited_once_with(
        session=session, status=NavigationStatus.CANCELLED
    )
