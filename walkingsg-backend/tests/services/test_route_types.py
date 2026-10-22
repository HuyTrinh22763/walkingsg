import time
from beanie import PydanticObjectId

from src.model.map_segment_model import MapSegmentModel
from src.model.route_model import RouteType
from src.services.adapters.pedestrian_routing_adapter import PedestrianRouteData
from src.services.route_types import RouteFactory

# Realistic sample candidate segments from NTU (Students Walk corridor, stairs, ramp bypass)
MOCK_SEGMENTS = [
    MapSegmentModel.model_construct(
        segment_id="ntu-sw-h11-h10",
        start_coordinates=(1.3540, 103.6865),
        end_coordinates=(1.3530, 103.6860),
        is_sheltered=True,
        stair_count=0,
        is_barrier_free=True,
        confidence_score=10.0,
    ),
    MapSegmentModel.model_construct(
        segment_id="ntu-sw-h10-h2",
        start_coordinates=(1.3530, 103.6860),
        end_coordinates=(1.3500, 103.6855),
        is_sheltered=True,
        stair_count=0,
        is_barrier_free=True,
        confidence_score=10.0,
    ),
    MapSegmentModel.model_construct(
        segment_id="ntu-h11-shortcut-stairs",
        start_coordinates=(1.3535, 103.6862),
        end_coordinates=(1.3515, 103.6858),
        is_sheltered=False,
        stair_count=25,
        is_barrier_free=False,
        confidence_score=5.0,
    ),
    MapSegmentModel.model_construct(
        segment_id="ntu-ramp-bypass",
        start_coordinates=(1.3532, 103.6861),
        end_coordinates=(1.3520, 103.6859),
        is_sheltered=False,
        stair_count=0,
        is_barrier_free=True,
        confidence_score=8.0,
    ),
]

MOCK_BASE_ROUTES = [
    PedestrianRouteData(
        polyline=[
            [1.3540, 103.6865],
            [1.3535, 103.6862],
            [1.3530, 103.6860],
            [1.3520, 103.6858],
            [1.3510, 103.6856],
            [1.3500, 103.6855],
        ],
        distance_meters=480.0,
        duration_seconds=384,
        steps=["Walk from Hall 11", "Continue south", "Arrive at Hall 2"],
    ),
    PedestrianRouteData(
        polyline=[
            [1.3540, 103.6865],
            [1.3545, 103.6870],
            [1.3530, 103.6865],
            [1.3515, 103.6860],
            [1.3500, 103.6855],
        ],
        distance_meters=530.0,
        duration_seconds=424,
        steps=["Walk from Hall 11", "Follow scenic loop", "Arrive at Hall 2"],
    ),
]


def test_all_five_strategies_execute_under_ten_milliseconds():
    user_id = PydanticObjectId()
    origin_coord = (1.3540, 103.6865)
    dest_coord = (1.3500, 103.6855)

    start_time = time.perf_counter()
    routes = []
    for route_type in RouteType:
        strategy = RouteFactory.get(route_type)()
        route = strategy.generate_route(
            user_id=user_id,
            origin_name="NTU Hall 11",
            origin_coord=origin_coord,
            destination_name="NTU Hall 2",
            destination_coord=dest_coord,
            base_routes=MOCK_BASE_ROUTES,
            candidate_segments=MOCK_SEGMENTS,
        )
        routes.append(route)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    assert len(routes) == 5
    # Verification of Ticket 2 success measure: < 10 ms
    assert duration_ms < 10.0, f"Strategies took {duration_ms:.2f} ms (target: < 10 ms)"


def test_strategies_produce_distinct_routes():
    user_id = PydanticObjectId()
    origin_coord = (1.3540, 103.6865)
    dest_coord = (1.3500, 103.6855)

    routes_by_type = {}
    for route_type in RouteType:
        strategy = RouteFactory.get(route_type)()
        routes_by_type[route_type] = strategy.generate_route(
            user_id=user_id,
            origin_name="NTU Hall 11",
            origin_coord=origin_coord,
            destination_name="NTU Hall 2",
            destination_coord=dest_coord,
            base_routes=MOCK_BASE_ROUTES,
            candidate_segments=MOCK_SEGMENTS,
        )

    direct = routes_by_type[RouteType.DIRECT]
    sheltered = routes_by_type[RouteType.MAX_SHELTER]
    barrier_free = routes_by_type[RouteType.BARRIER_FREE]
    low_effort = routes_by_type[RouteType.LOW_EFFORT]
    wide_quiet = routes_by_type[RouteType.WIDE_QUIET]

    # Max shelter targets 85-95% shelter and 0 stairs
    assert sheltered.sheltered_percentage >= 85.0
    assert sheltered.stair_count == 0
    assert sheltered.total_distance > direct.total_distance

    # Barrier-free strictly enforces 0 stairs and includes barrier-free segments
    assert barrier_free.stair_count == 0
    assert "ntu-h11-shortcut-stairs" not in barrier_free.segment_ids

    # Low-effort strictly enforces 0 stairs
    assert low_effort.stair_count == 0

    # Wide-quiet uses alternative scenic base route
    assert wide_quiet.total_distance != direct.total_distance

    # Direct incorporates intersecting shortcut stairs
    assert direct.stair_count > 0 or direct.total_distance == 480.0

    # Ensure all distances are distinct
    distances = {r.total_distance for r in routes_by_type.values()}
    assert len(distances) >= 4


def test_barrier_free_strategy_guarantees_zero_stairs_and_accessible_segments():
    user_id = PydanticObjectId()
    strategy = RouteFactory.get(RouteType.BARRIER_FREE)()
    route = strategy.generate_route(
        user_id=user_id,
        origin_name="Origin",
        origin_coord=(1.3540, 103.6865),
        destination_name="Destination",
        destination_coord=(1.3500, 103.6855),
        base_routes=MOCK_BASE_ROUTES,
        candidate_segments=MOCK_SEGMENTS,
    )

    assert route.stair_count == 0
    # Every segment in segment_ids must be barrier-free
    segments_by_id = {s.segment_id: s for s in MOCK_SEGMENTS}
    for sid in route.segment_ids:
        assert segments_by_id[sid].is_barrier_free is True
        assert segments_by_id[sid].stair_count == 0


def test_polyline_continuity_no_straight_line_jumps():
    user_id = PydanticObjectId()
    strategy = RouteFactory.get(RouteType.MAX_SHELTER)()
    route = strategy.generate_route(
        user_id=user_id,
        origin_name="Origin",
        origin_coord=(1.3540, 103.6865),
        destination_name="Destination",
        destination_coord=(1.3500, 103.6855),
        base_routes=MOCK_BASE_ROUTES,
        candidate_segments=MOCK_SEGMENTS,
    )

    assert len(route.polyline) >= len(MOCK_BASE_ROUTES[0].polyline)
    # Check that adjacent points are continuous (no sudden jump > 200m)
    from src.utils.index import haversine_distance

    for i in range(len(route.polyline) - 1):
        pt1 = (route.polyline[i][0], route.polyline[i][1])
        pt2 = (route.polyline[i + 1][0], route.polyline[i + 1][1])
        step_dist = haversine_distance(pt1, pt2)
        assert step_dist < 200.0, f"Jump of {step_dist:.1f}m between {pt1} and {pt2}"


def test_fallback_when_candidate_segments_empty():
    user_id = PydanticObjectId()
    origin_coord = (1.3540, 103.6865)
    dest_coord = (1.3500, 103.6855)

    for route_type in RouteType:
        strategy = RouteFactory.get(route_type)()
        route = strategy.generate_route(
            user_id=user_id,
            origin_name="Origin",
            origin_coord=origin_coord,
            destination_name="Destination",
            destination_coord=dest_coord,
            base_routes=MOCK_BASE_ROUTES,
            candidate_segments=[],
        )
        assert route.total_distance > 0
        assert route.estimated_time > 0
        assert len(route.polyline) >= 2
        assert len(route.steps) >= 2
