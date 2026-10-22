from unittest.mock import AsyncMock

import pytest

from src.schemas.location_schema import PointType
from src.services.adapters.onemap_adapter import GeocodedAddress, OneMapAdapter
from src.services.location_service import LocationService


@pytest.mark.asyncio
async def test_search_address_filters_singapore_and_deduplicates():
    mock_adapter = AsyncMock(spec=OneMapAdapter)
    mock_adapter.search.return_value = [
        GeocodedAddress("Novena MRT", 1.3204, 103.8438),
        GeocodedAddress("Novena MRT", 1.3204, 103.8438),  # Duplicate
        GeocodedAddress("Johor Bahru City", 1.4927, 103.7414),  # Outside SG
    ]

    service = LocationService(geocoder=mock_adapter)
    results = await service.search_address(query="novena")

    assert len(results) == 1
    assert results[0].address_label == "Novena MRT"


@pytest.mark.asyncio
async def test_validate_coordinates_inside_singapore():
    mock_adapter = AsyncMock(spec=OneMapAdapter)
    service = LocationService(geocoder=mock_adapter)
    result = await service.validate_coordinates(
        latitude=1.3521, longitude=103.8198, point_type=PointType.ORIGIN
    )
    assert result.is_valid is True
    assert result.error_message is None


@pytest.mark.asyncio
async def test_validate_coordinates_outside_singapore():
    mock_adapter = AsyncMock(spec=OneMapAdapter)
    service = LocationService(geocoder=mock_adapter)
    result = await service.validate_coordinates(
        latitude=0.0, longitude=0.0, point_type=PointType.DESTINATION
    )
    assert result.is_valid is False
    assert "destination" in result.error_message
