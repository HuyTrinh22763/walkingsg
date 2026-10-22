from typing import Annotated

from fastapi import Depends, Query

from src.core.success_response import SuccessResponse, ok
from src.schemas.location_schema import (
    AutocompleteQuery,
    CoordinateValidationOut,
    CoordinateValidationRequest,
    LocationOut,
)
from src.services.adapters.onemap_adapter import OneMapAdapter
from src.services.location_service import LocationService


def get_location_service(
    geocoder: Annotated[OneMapAdapter, Depends(OneMapAdapter)],
) -> LocationService:
    return LocationService(geocoder=geocoder)


LocationServiceDep = Annotated[LocationService, Depends(get_location_service)]


async def search_address(
    query: Annotated[AutocompleteQuery, Query()],
    location_service: LocationServiceDep,
) -> SuccessResponse[list[LocationOut]]:
    locations = await location_service.search_address(query=query.query)
    data = [
        LocationOut(
            address_label=loc.address_label,
            latitude=loc.latitude,
            longitude=loc.longitude,
        )
        for loc in locations
    ]
    return ok(data, message="Search location success!")


async def validate_coordinates(
    payload: CoordinateValidationRequest,
    location_service: LocationServiceDep,
) -> SuccessResponse[CoordinateValidationOut]:
    result = await location_service.validate_coordinates(
        latitude=payload.latitude,
        longitude=payload.longitude,
        point_type=payload.point_type,
    )
    data = CoordinateValidationOut(
        is_valid=result.is_valid,
        error_message=result.error_message,
    )
    return ok(data, message="Validate location success!")
