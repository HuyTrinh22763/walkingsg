from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.app import app
from src.dbs.init_mongodb import Database


@pytest.mark.asyncio
async def test_health_check():
    with patch.object(Database, "connect", new_callable=AsyncMock), patch.object(
        Database, "close", new_callable=AsyncMock
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == 200
            assert data["message"] == "WalkingSG API is active!"
            assert data["metadata"]["status"] == "healthy"
