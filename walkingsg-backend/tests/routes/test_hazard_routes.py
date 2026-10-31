from http import HTTPStatus
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.app import app
from src.controllers.hazard_controller import get_hazard_service
from src.dbs.init_mongodb import Database
from src.model.hazard_model import HazardType
from src.routes.hazard.index import private_router, public_router, router
from src.schemas.hazard_schema import HazardOut
from src.utils.index import utc_now


def test_hazard_routes_split_public_and_private() -> None:
    nearby = next(route for route in public_router.routes if route.path == "/nearby")
    report = next(route for route in private_router.routes if route.path == "/report")
    mounted = {
        f"{router.prefix}{getattr(sub_r, 'path', '')}"
        for r in router.routes
        for sub_r in getattr(r, "original_router", r).routes
    }

    assert "GET" in nearby.methods
    assert public_router.dependencies == []
    assert "POST" in report.methods
    assert report.status_code == HTTPStatus.CREATED
    assert private_router.dependencies
    assert mounted == {"/v1/api/hazard/nearby", "/v1/api/hazard/report"}


def test_hazard_routes_are_mounted() -> None:
    paths = app.openapi()["paths"]
    assert "/v1/api/hazard/report" in paths
    assert "/v1/api/hazard/nearby" in paths


@pytest.mark.asyncio
async def test_report_hazard_requires_authentication() -> None:
    with patch.object(Database, "connect", new_callable=AsyncMock), patch.object(
        Database, "close", new_callable=AsyncMock
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/v1/api/hazard/report",
                json={
                    "hazard_type": "flooding",
                    "latitude": 1.3521,
                    "longitude": 103.8198,
                },
            )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_nearby_hazards_is_public() -> None:
    service = AsyncMock()
    service.get_nearby_hazards.return_value = [
        HazardOut(
            hazard_id="hazard-1",
            hazard_type=HazardType.FLOODING,
            segment_id="seg-1",
            latitude=1.3521,
            longitude=103.8198,
            report_timestamp=utc_now(),
        )
    ]
    app.dependency_overrides[get_hazard_service] = lambda: service
    try:
        with patch.object(Database, "connect", new_callable=AsyncMock), patch.object(
            Database, "close", new_callable=AsyncMock
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/v1/api/hazard/nearby",
                    params={"latitude": 1.3521, "longitude": 103.8198},
                )
    finally:
        app.dependency_overrides.pop(get_hazard_service, None)

    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Get nearby hazards success!"
    assert body["metadata"][0]["segment_id"] == "seg-1"
