from unittest.mock import AsyncMock

import pytest
from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, NotFoundError
from src.model.map_segment_model import MapSegmentModel
from src.model.profile_model import HeatUvSensitivity, MobilityNeeds, PreferredPace, ProfileModel
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.model.repository.profile_repo import ProfileRepository
from src.model.repository.route_repo import RouteRepository
from src.model.route_model import RouteModel, RouteType
from src.schemas.route_schema import RouteSearchRequest
from src.services.adapters.pedestrian_routing_adapter import (
    PedestrianRouteData,
    PedestrianRoutingAdapter,
)
from src.services.route_service import RouteService

MOCK_BASE_ROUTES = [
    PedestrianRouteData(
        polyline=[
            [1.3540, 103.6865],
            [1.3530, 103.6860],
            [1.3520, 103.6858],
            [1.3500, 103.6855],
        ],
        distance_meters=480.0,
        duration_seconds=384,
        steps=["Walk from Hall 11", "Arrive at Hall 2"],
    )
]

MOCK_SEGMENTS = [
    MapSegmentModel.model_construct(
        segment_id="seg-sheltered-1",
        start_coordinates=(1.3540, 103.6865),
        end_coordinates=(1.3520, 103.6860),
        is_sheltered=True,
        stair_count=0,
        is_barrier_free=True,
        confidence_score=10.0,
    ),
    MapSegmentModel.model_construct(
        segment_id="seg-stairs-1",
        start_coordinates=(1.3530, 103.6860),
        end_coordinates=(1.3510, 103.6858),
        is_sheltered=False,
        stair_count=18,
        is_barrier_free=False,
        confidence_score=5.0,
    ),
]


def make_profile(mobility: MobilityNeeds = MobilityNeeds.NONE) -> ProfileModel:
    return ProfileModel.model_construct(
        user_id=PydanticObjectId(),
        mobility_needs=mobility,
        heat_uv_sensitivity=HeatUvSensitivity.MEDIUM,
        preferred_pace=PreferredPace.RELAXED,
    )


@pytest.fixture
def route_service_deps():
    map_segment_repo = AsyncMock(spec=MapSegmentRepository)
    route_repo = AsyncMock(spec=RouteRepository)
    profile_repo = AsyncMock(spec=ProfileRepository)

    service = RouteService(
        map_segment_repo=map_segment_repo,
        route_repo=route_repo,
        profile_repo=profile_repo,
    )
    return {
        "service": service,
        "map_segment_repo": map_segment_repo,
        "route_repo": route_repo,
        "profile_repo": profile_repo,
    }


@pytest.mark.asyncio
async def test_generate_routes_rejects_outside_singapore(route_service_deps):
    service = route_service_deps["service"]
    user_id = PydanticObjectId()
    payload = RouteSearchRequest(
        origin_coord=(0.0, 0.0),  # Outside Singapore
        destination_coord=(1.3500, 103.6855),
    )

    with pytest.raises(BadRequestError) as exc_info:
        await service.generate_routes(user_id=user_id, payload=payload)

    assert "within Singapore" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_generate_routes_orchestrates_full_pipeline_and_persists(route_service_deps):
    service = route_service_deps["service"]
    user_id = PydanticObjectId()
    profile = make_profile(MobilityNeeds.NONE)

    route_service_deps["profile_repo"].find_by_user_id.return_value = profile
    route_service_deps["map_segment_repo"].find_segments_in_bbox.return_value = MOCK_SEGMENTS

    payload = RouteSearchRequest(
        origin_coord=(1.3540, 103.6865),
        destination_coord=(1.3500, 103.6855),
        origin_name="Hall 11",
        destination_name="Hall 2",
    )

    result = await service.generate_routes(user_id=user_id, payload=payload)

    # 2. Segments queried in bounding box
    route_service_deps["map_segment_repo"].find_segments_in_bbox.assert_awaited_once()

    # 3. All 5 routes persisted to database
    assert route_service_deps["route_repo"].create.await_count == 5

    # 4. Result contains starred route and 4 alternatives
    assert result.starred_route is not None
    assert result.starred_route.is_starred is True
    assert len(result.alternative_routes) == 4
    for alt in result.alternative_routes:
        assert alt.is_starred is False


def test_wheelchair_profile_gates_out_stairs(route_service_deps):
    service = route_service_deps["service"]
    wheelchair_profile = make_profile(MobilityNeeds.WHEELCHAIR)

    # Route with stairs
    stair_route = RouteModel.model_construct(
        user_id=PydanticObjectId(),
        route_type=RouteType.DIRECT,
        origin_name="Origin",
        origin_coordinates=(1.3540, 103.6865),
        destination_name="Destination",
        destination_coordinates=(1.3500, 103.6855),
        total_distance=480.0,
        estimated_time=384,
        match_score=0.0,
        sheltered_percentage=0.0,
        stair_count=20,  # Has stairs!
        segment_ids=["seg-stairs-1"],
        polyline=[[1.3540, 103.6865], [1.3500, 103.6855]],
        steps=[],
    )
    score_with_stairs = service.calculate_match_score(
        stair_route, wheelchair_profile, segments=[MOCK_SEGMENTS[1]]
    )
    # Gated out to 0.0 because of stairs
    assert score_with_stairs == 0.0

    # Route without stairs, 100% barrier-free
    barrier_free_route = RouteModel.model_construct(
        user_id=PydanticObjectId(),
        route_type=RouteType.BARRIER_FREE,
        origin_name="Origin",
        origin_coordinates=(1.3540, 103.6865),
        destination_name="Destination",
        destination_coordinates=(1.3500, 103.6855),
        total_distance=500.0,
        estimated_time=400,
        match_score=0.0,
        sheltered_percentage=50.0,
        stair_count=0,  # Zero stairs
        segment_ids=["seg-sheltered-1"],
        polyline=[[1.3540, 103.6865], [1.3500, 103.6855]],
        steps=[],
    )
    score_barrier_free = service.calculate_match_score(
        barrier_free_route, wheelchair_profile, segments=[MOCK_SEGMENTS[0]]
    )
    # Gate is 1.0, positive score calculated
    assert score_barrier_free > 50.0


def test_rank_routes_sorts_by_score_and_marks_starred(route_service_deps):
    service = route_service_deps["service"]
    user_id = PydanticObjectId()

    r1 = RouteModel.model_construct(
        user_id=user_id,
        route_type=RouteType.DIRECT,
        origin_name="O",
        origin_coordinates=(1.35, 103.68),
        destination_name="D",
        destination_coordinates=(1.35, 103.68),
        total_distance=480.0,
        estimated_time=384,
        match_score=60.0,
        sheltered_percentage=20.0,
        stair_count=0,
        segment_ids=[],
        polyline=[],
        steps=[],
        is_starred=False,
    )
    r2 = RouteModel.model_construct(
        user_id=user_id,
        route_type=RouteType.MAX_SHELTER,
        origin_name="O",
        origin_coordinates=(1.35, 103.68),
        destination_name="D",
        destination_coordinates=(1.35, 103.68),
        total_distance=510.0,
        estimated_time=408,
        match_score=92.0,  # Highest score!
        sheltered_percentage=90.0,
        stair_count=0,
        segment_ids=[],
        polyline=[],
        steps=[],
        is_starred=False,
    )

    ranked = service.rank_routes([r1, r2])
    assert ranked[0].route_type == RouteType.MAX_SHELTER
    assert ranked[0].is_starred is True
    assert ranked[1].is_starred is False


@pytest.mark.asyncio
async def test_find_route_returns_detail_or_raises_not_found(route_service_deps):
    service = route_service_deps["service"]
    route_id = PydanticObjectId()

    # When not found
    route_service_deps["route_repo"].find_by_id.return_value = None
    with pytest.raises(NotFoundError):
        await service.find_route(route_id=route_id)

    # When found
    found_route = RouteModel.model_construct(
        id=route_id,
        user_id=PydanticObjectId(),
        route_type=RouteType.DIRECT,
        origin_name="O",
        origin_coordinates=(1.35, 103.68),
        destination_name="D",
        destination_coordinates=(1.35, 103.68),
        total_distance=480.0,
        estimated_time=384,
        match_score=75.0,
        sheltered_percentage=20.0,
        stair_count=0,
        segment_ids=[],
        polyline=[[1.35, 103.68], [1.35, 103.69]],
        steps=["Step 1"],
        is_starred=True,
    )
    route_service_deps["route_repo"].find_by_id.return_value = found_route
    detail = await service.find_route(route_id=route_id)

    assert detail.route_id == str(route_id)
    assert len(detail.polyline) == 2
    assert detail.steps == ["Step 1"]
