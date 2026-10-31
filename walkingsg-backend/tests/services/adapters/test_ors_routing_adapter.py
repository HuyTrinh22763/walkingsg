from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.services.adapters.ors_routing_adapter import OrsRoutingAdapter
from src.services.adapters.pedestrian_routing_adapter import PedestrianRouteData


@pytest.mark.asyncio
async def test_ors_fallback_when_no_api_key() -> None:
    mock_fallback = AsyncMock()
    mock_fallback.get_pedestrian_route.return_value = [
        PedestrianRouteData(
            distance_meters=100.0,
            duration_seconds=120,
            polyline=[[1.30, 103.85], [1.31, 103.86]],
            steps=[],
        )
    ]

    adapter = OrsRoutingAdapter(api_key=None, fallback_adapter=mock_fallback)
    result = await adapter.get_pedestrian_route((1.30, 103.85), (1.31, 103.86))

    assert len(result) == 1
    assert result[0].distance_meters == 100.0
    mock_fallback.get_pedestrian_route.assert_called_once()


@pytest.mark.asyncio
async def test_ors_success_with_avoid_polygons() -> None:
    mock_fallback = AsyncMock()
    mock_ors_response = {
        "features": [
            {
                "geometry": {
                    "coordinates": [
                        [103.85, 1.30],
                        [103.855, 1.305],
                        [103.86, 1.31],
                    ]
                },
                "properties": {
                    "summary": {
                        "distance": 210.5,
                        "duration": 250.0,
                    }
                },
            }
        ]
    }

    adapter = OrsRoutingAdapter(api_key="mock_ors_key", fallback_adapter=mock_fallback)

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = httpx.Response(200, json=mock_ors_response)

        avoid_polygons = [
            [
                [
                    [103.852, 1.302],
                    [103.854, 1.302],
                    [103.854, 1.304],
                    [103.852, 1.304],
                    [103.852, 1.302],
                ]
            ]
        ]

        result = await adapter.get_pedestrian_route(
            (1.30, 103.85), (1.31, 103.86), avoid_polygons=avoid_polygons
        )

        assert len(result) == 1
        assert result[0].distance_meters == 210.5
        assert result[0].duration_seconds == 250
        assert len(result[0].polyline) == 3
        assert result[0].polyline[0] == [1.30, 103.85]
        mock_fallback.get_pedestrian_route.assert_not_called()

        called_json = mock_post.call_args[1]["json"]
        assert "options" in called_json
        assert (
            called_json["options"]["avoid_polygons"]["coordinates"] == avoid_polygons
        )


@pytest.mark.asyncio
async def test_ors_fallback_on_error() -> None:
    mock_fallback = AsyncMock()
    mock_fallback.get_pedestrian_route.return_value = [
        PedestrianRouteData(
            distance_meters=150.0,
            duration_seconds=180,
            polyline=[[1.30, 103.85], [1.31, 103.86]],
            steps=[],
        )
    ]

    adapter = OrsRoutingAdapter(api_key="mock_ors_key", fallback_adapter=mock_fallback)

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = httpx.Response(500, text="Internal Server Error")

        result = await adapter.get_pedestrian_route((1.30, 103.85), (1.31, 103.86))

        assert len(result) == 1
        assert result[0].distance_meters == 150.0
        mock_fallback.get_pedestrian_route.assert_called_once()
