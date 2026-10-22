from dataclasses import dataclass

from src.schemas.location_schema import PointType
from src.services.adapters.onemap_adapter import GeocodedAddress, OneMapAdapter
from src.utils.index import is_within_singapore


@dataclass(frozen=True, slots=True)
class CoordinateValidationResult:
    is_valid: bool
    error_message: str | None = None


class LocationService:
    def __init__(self, geocoder: OneMapAdapter) -> None:
        self._geocoder = geocoder

    async def search_address(self, *, query: str) -> list[GeocodedAddress]:
        candidates = await self._geocoder.search(query=query)
        seen: set[tuple[str, float, float]] = set()
        results: list[GeocodedAddress] = []
        for candidate in candidates:
            if not is_within_singapore(candidate.latitude, candidate.longitude):
                continue
            key = (candidate.address_label, candidate.latitude, candidate.longitude)
            if key in seen:
                continue
            seen.add(key)
            results.append(candidate)
        return results

    async def validate_coordinates(
        self,
        *,
        latitude: float,
        longitude: float,
        point_type: PointType | None = None,
    ) -> CoordinateValidationResult:
        if is_within_singapore(latitude, longitude):
            return CoordinateValidationResult(is_valid=True)

        point = point_type.value if point_type else "origin/destination"
        return CoordinateValidationResult(
            is_valid=False,
            error_message=f"Invalid location. Please select a valid {point} within Singapore",
        )
