import pytest

from src.utils.index import (
    calculate_route_progress,
    distance_to_polyline,
    haversine_distance,
    point_to_segment_distance,
    validate_coordinates,
)


def test_validate_coordinates() -> None:
    # Valid
    assert validate_coordinates((1.35, 103.8), "coord") == (1.35, 103.8)

    # Invalid latitude
    with pytest.raises(ValueError, match="latitude"):
        validate_coordinates((95.0, 103.8), "test_coord")

    # Invalid longitude
    with pytest.raises(ValueError, match="longitude"):
        validate_coordinates((1.35, 190.0), "test_coord")



def test_point_to_segment_distance_on_segment() -> None:
    # Segment from (1.3500, 103.6800) to (1.3500, 103.6900)
    start = (1.3500, 103.6800)
    end = (1.3500, 103.6900)
    midpoint = (1.3500, 103.6850)

    dist = point_to_segment_distance(midpoint, start, end)
    assert dist == pytest.approx(0.0, abs=0.5)


def test_point_to_segment_distance_perpendicular() -> None:
    # A segment running West to East at lat 1.3500
    start = (1.3500, 103.6800)
    end = (1.3500, 103.6900)
    # Point offset north by ~111 meters (0.001 deg lat)
    point = (1.3510, 103.6850)

    dist = point_to_segment_distance(point, start, end)
    expected = haversine_distance(point, (1.3500, 103.6850))
    assert dist == pytest.approx(expected, rel=1e-2)


def test_point_to_segment_distance_clamped_to_endpoints() -> None:
    start = (1.3500, 103.6800)
    end = (1.3500, 103.6900)
    # Point far to the west of start
    point_west = (1.3500, 103.6700)
    dist = point_to_segment_distance(point_west, start, end)
    expected = haversine_distance(point_west, start)
    assert dist == pytest.approx(expected, rel=1e-2)


def test_distance_to_polyline_empty_and_single() -> None:
    point = (1.3500, 103.6850)
    assert distance_to_polyline(point, []) == float("inf")

    single = [[1.3500, 103.6800]]
    expected = haversine_distance(point, (1.3500, 103.6800))
    assert distance_to_polyline(point, single) == pytest.approx(expected, rel=1e-2)


def test_distance_to_polyline_multi_segment() -> None:
    polyline = [
        [1.3500, 103.6800],
        [1.3500, 103.6850],
        [1.3550, 103.6850],
    ]
    # Point right on second leg
    point_on_path = (1.3525, 103.6850)
    assert distance_to_polyline(point_on_path, polyline) == pytest.approx(0.0, abs=1.0)

    # Point offset by 30 meters
    point_off = (1.3525, 103.6853)
    dist = distance_to_polyline(point_off, polyline)
    assert dist > 20.0  # detected as off-route (> 20m)


def test_calculate_route_progress_start() -> None:
    polyline = [
        [1.3500, 103.6800],
        [1.3500, 103.6850],
        [1.3500, 103.6900],
    ]
    steps = ["Start walking east", "Arrive at destination"]
    total_dist = 1113.0
    est_time = 800

    rem_dist, rem_time, instruction = calculate_route_progress(
        current_coord=(1.3500, 103.6800),
        polyline=polyline,
        steps=steps,
        total_distance=total_dist,
        estimated_time=est_time,
    )

    assert rem_dist > 1000.0
    assert rem_time > 700
    assert instruction == "Start walking east"


def test_calculate_route_progress_midway() -> None:
    polyline = [
        [1.3500, 103.6800],
        [1.3500, 103.6850],
        [1.3500, 103.6900],
    ]
    steps = ["Start walking east", "Continue east", "Arrive at destination"]
    total_dist = 1113.0
    est_time = 800

    rem_dist, rem_time, instruction = calculate_route_progress(
        current_coord=(1.3500, 103.6850),
        polyline=polyline,
        steps=steps,
        total_distance=total_dist,
        estimated_time=est_time,
    )

    assert rem_dist < 600.0
    assert rem_time < 500
    assert instruction in ("Continue east", "Start walking east")


def test_calculate_route_progress_arrival() -> None:
    polyline = [
        [1.3500, 103.6800],
        [1.3500, 103.6850],
        [1.3500, 103.6900],
    ]
    steps = ["Start walking east", "Arrive at destination"]
    total_dist = 1113.0
    est_time = 800

    # User right at destination (< 5m)
    rem_dist, rem_time, instruction = calculate_route_progress(
        current_coord=(1.3500, 103.6900),
        polyline=polyline,
        steps=steps,
        total_distance=total_dist,
        estimated_time=est_time,
    )

    assert rem_dist <= 5.0
    assert rem_time == 0
    assert instruction == "You have arrived at your destination!"
