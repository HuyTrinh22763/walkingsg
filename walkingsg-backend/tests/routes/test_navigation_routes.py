from unittest.mock import AsyncMock

import pytest
from beanie import PydanticObjectId
from httpx import ASGITransport, AsyncClient

from src.app import app
from src.auth.auth_utils import AuthContext, TokenPayload, authentication_v2
from src.controllers.navigation_controller import get_navigation_service
from src.model.key_token_model import KeyTokenModel
from src.schemas.navigation_schema import (
    NavEndOut,
    NavStartOut,
    NavTrackOut,
)
from src.schemas.route_schema import RouteDetailOut
from src.services.navigation_service import NavigationService


@pytest.fixture
def mock_nav_service():
    service = AsyncMock(spec=NavigationService)
    app.dependency_overrides[get_navigation_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_navigation_service, None)


@pytest.fixture
def mock_auth():
    user_id = PydanticObjectId()
    auth_ctx = AuthContext(
        user=TokenPayload(user_id=user_id, email="test@e.ntu.edu.sg"),
        key_store=KeyTokenModel.model_construct(user_id=user_id),
    )
    app.dependency_overrides[authentication_v2] = lambda: auth_ctx
    yield auth_ctx
    app.dependency_overrides.pop(authentication_v2, None)


@pytest.mark.asyncio
async def test_navigation_routes_require_authentication():
    # When authentication_v2 is not mocked, calls without headers fail (401 AuthFailureError)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/v1/api/navigation/start",
            json={"route_id": str(PydanticObjectId())},
        )
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_start_navigation_route_success(mock_auth, mock_nav_service):
    session_id = str(PydanticObjectId())
    mock_nav_service.start_navigation.return_value = NavStartOut(
        session_id=session_id,
        status="ACTIVE",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        route_id = str(PydanticObjectId())
        res = await client.post(
            "/v1/api/navigation/start",
            json={"route_id": route_id},
        )

        assert res.status_code == 201
        data = res.json()
        assert data["status"] == 201
        assert data["message"] == "Start navigation session success!"
        assert data["metadata"]["session_id"] == session_id
        assert data["metadata"]["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_track_position_route_success(mock_auth, mock_nav_service):
    mock_nav_service.track_position.return_value = NavTrackOut(
        status="ACTIVE",
        motion_warning=False,
        next_instruction="Turn left onto Nanyang Ave",
        remaining_dist=250.0,
        remaining_time=180,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        session_id = str(PydanticObjectId())
        res = await client.post(
            "/v1/api/navigation/track",
            json={
                "session_id": session_id,
                "current_coord": [1.3500, 103.6820],
                "speed_kmh": 4.5,
            },
        )

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == 200
        assert data["message"] == "Track navigation position success!"
        assert data["metadata"]["status"] == "ACTIVE"
        assert data["metadata"]["motion_warning"] is False
        assert data["metadata"]["remaining_dist"] == 250.0


@pytest.mark.asyncio
async def test_end_navigation_route_success(mock_auth, mock_nav_service):
    session_id = str(PydanticObjectId())
    mock_nav_service.end_navigation.return_value = NavEndOut(
        session_id=session_id,
        status="CANCELLED",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/v1/api/navigation/end",
            json={
                "session_id": session_id,
                "manual_cancel": True,
            },
        )

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == 200
        assert data["message"] == "End navigation session success!"
        assert data["metadata"]["session_id"] == session_id
        assert data["metadata"]["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_reroute_route_success(mock_auth, mock_nav_service):
    session_id = str(PydanticObjectId())
    route_id = str(PydanticObjectId())
    mock_nav_service.reroute.return_value = RouteDetailOut(
        route_id=route_id,
        route_type="Direct",
        total_distance=450.0,
        estimated_time=360,
        match_score=95.0,
        sheltered_percentage=60.0,
        stair_count=0,
        hazard_count=0,
        is_starred=True,
        polyline=[[1.30, 103.85], [1.31, 103.86]],
        steps=["Step 1"],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/v1/api/navigation/reroute",
            json={
                "session_id": session_id,
                "current_coord": [1.30, 103.85],
            },
        )

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == 200
        assert data["message"] == "Reroute navigation session success!"
        assert data["metadata"]["route_id"] == route_id
        assert data["metadata"]["hazard_count"] == 0
