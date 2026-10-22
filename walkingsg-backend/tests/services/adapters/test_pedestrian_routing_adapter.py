from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.core.error_response import BadRequestError
from src.services.adapters.pedestrian_routing_adapter import (
    PedestrianRouteData,
    PedestrianRoutingAdapter,
)

SAMPLE_OSRM_ROUTE = {
    "distance": 482.0,
    "duration": 385.0,
    "geometry": {
        "coordinates": [
            [103.6865, 1.3540],
            [103.6860, 1.3520],
            [103.6855, 1.3500],
        ],
        "type": "LineString",
    },
    "legs": [
        {
            "steps": [
                {
                    "distance": 100.0,
                    "maneuver": {"type": "depart"},
                    "name": "Students Walk",
                },
                {
                    "distance": 200.0,
                    "maneuver": {"type": "turn", "modifier": "left"},
                    "name": "Hall 10 Path",
                },
                {
                    "distance": 182.0,
                    "maneuver": {"type": "continue"},
                    "name": "Hall 2 Linkway",
                },
                {
                    "distance": 0.0,
                    "maneuver": {"type": "arrive"},
                    "name": "",
                },
            ]
        }
    ],
}


@pytest.mark.asyncio
async def test_parse_standard_route_with_coordinate_flip():
    adapter = PedestrianRoutingAdapter()
    mock_response = AsyncMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.is_error = False
    mock_response.json.return_value = {
        "code": "Ok",
        "routes": [SAMPLE_OSRM_ROUTE],
    }

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        routes = await adapter.get_pedestrian_route(
            origin_coord=(1.3540, 103.6865),
            destination_coord=(1.3500, 103.6855),
        )

    assert len(routes) == 1
    route = routes[0]
    assert isinstance(route, PedestrianRouteData)
    assert route.distance_meters == 482.0
    assert route.duration_seconds >= 385
    # Crucial check: [lng, lat] from OSRM must be flipped to [lat, lng]
    assert route.polyline[0] == [1.3540, 103.6865]
    assert route.polyline[1] == [1.3520, 103.6860]
    assert route.polyline[2] == [1.3500, 103.6855]
    assert len(route.steps) == 4
    assert "Students Walk" in route.steps[0]
    assert "Arrive at destination" in route.steps[-1]


@pytest.mark.asyncio
async def test_parse_alternative_routes():
    adapter = PedestrianRoutingAdapter()
    alt_route = dict(SAMPLE_OSRM_ROUTE)
    alt_route["distance"] = 520.0

    mock_response = AsyncMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.is_error = False
    mock_response.json.return_value = {
        "code": "Ok",
        "routes": [SAMPLE_OSRM_ROUTE, alt_route],
    }

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        routes = await adapter.get_pedestrian_route(
            origin_coord=(1.3540, 103.6865),
            destination_coord=(1.3500, 103.6855),
        )

    assert len(routes) == 2
    assert routes[0].distance_meters == 482.0
    assert routes[1].distance_meters == 520.0


@pytest.mark.asyncio
async def test_retry_on_500_and_succeeds():
    adapter = PedestrianRoutingAdapter()
    fail_response = AsyncMock(spec=httpx.Response)
    fail_response.status_code = 500
    fail_response.is_error = True

    success_response = AsyncMock(spec=httpx.Response)
    success_response.status_code = 200
    success_response.is_error = False
    success_response.json.return_value = {
        "code": "Ok",
        "routes": [SAMPLE_OSRM_ROUTE],
    }

    with patch("httpx.AsyncClient.get", side_effect=[fail_response, success_response]) as mock_get:
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            routes = await adapter.get_pedestrian_route(
                origin_coord=(1.3540, 103.6865),
                destination_coord=(1.3500, 103.6855),
            )

    assert len(routes) == 1
    assert mock_get.call_count == 2
    mock_sleep.assert_awaited_once_with(0.2)


@pytest.mark.asyncio
async def test_retry_on_429_and_succeeds():
    adapter = PedestrianRoutingAdapter()
    rate_limit_resp = AsyncMock(spec=httpx.Response)
    rate_limit_resp.status_code = 429
    rate_limit_resp.is_error = True

    success_response = AsyncMock(spec=httpx.Response)
    success_response.status_code = 200
    success_response.is_error = False
    success_response.json.return_value = {
        "code": "Ok",
        "routes": [SAMPLE_OSRM_ROUTE],
    }

    with patch("httpx.AsyncClient.get", side_effect=[rate_limit_resp, success_response]) as mock_get:
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            routes = await adapter.get_pedestrian_route(
                origin_coord=(1.3540, 103.6865),
                destination_coord=(1.3500, 103.6855),
            )

    assert len(routes) == 1
    assert mock_get.call_count == 2
    mock_sleep.assert_awaited_once_with(0.2)


@pytest.mark.asyncio
async def test_unrecoverable_failure_raises_bad_request_error():
    adapter = PedestrianRoutingAdapter()
    fail_response = AsyncMock(spec=httpx.Response)
    fail_response.status_code = 503
    fail_response.is_error = True

    with patch("httpx.AsyncClient.get", return_value=fail_response):
        with patch("asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(BadRequestError) as exc_info:
                await adapter.get_pedestrian_route(
                    origin_coord=(1.3540, 103.6865),
                    destination_coord=(1.3500, 103.6855),
                )

    assert "Pedestrian routing is temporarily unavailable" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_live_pedestrian_routing_ntu_coords():
    """Live integration test against pedestrian routing network for NTU coords."""
    adapter = PedestrianRoutingAdapter()
    routes = await adapter.get_pedestrian_route(
        origin_coord=(1.3540, 103.6865),      # Hall 11
        destination_coord=(1.3500, 103.6855),   # Hall 2
    )

    assert len(routes) >= 1
    route = routes[0]
    assert route.distance_meters > 400
    assert route.duration_seconds > 200
    assert len(route.polyline) >= 10
    # First and last coordinates should be within NTU vicinity (lat ~ 1.35, lng ~ 103.68)
    first_pt = route.polyline[0]
    last_pt = route.polyline[-1]
    assert 1.34 <= first_pt[0] <= 1.36
    assert 103.67 <= first_pt[1] <= 103.70
    assert 1.34 <= last_pt[0] <= 1.36
    assert 103.67 <= last_pt[1] <= 103.70
    assert len(route.steps) >= 2
