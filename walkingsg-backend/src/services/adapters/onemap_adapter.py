import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from src.core.error_response import BadRequestError

logger = logging.getLogger(__name__)

ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search"
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
TIMEOUT_SECONDS = 3.0
MAX_ATTEMPTS = 3
BACKOFF_SECONDS = 0.2


@dataclass(frozen=True, slots=True)
class GeocodedAddress:
    address_label: str
    latitude: float
    longitude: float


class OneMapAdapter:
    async def search(self, *, query: str) -> list[GeocodedAddress]:
        params = {
            "searchVal": query,
            "returnGeom": "Y",
            "getAddrDetails": "Y",
        }
        payload = await self._fetch(params)
        return self._parse_results(payload)

    async def _fetch(self, params: dict[str, str]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            for attempt in range(1, MAX_ATTEMPTS + 1):
                try:
                    response = await client.get(ONEMAP_SEARCH_URL, params=params)
                    if response.status_code not in RETRYABLE_STATUS_CODES:
                        if response.is_error:
                            raise BadRequestError(
                                message=f"OneMap upstream error (status {response.status_code})"
                            )
                        return response.json()
                    logger.warning(
                        "OneMap returned %d (attempt %d/%d)",
                        response.status_code, attempt, MAX_ATTEMPTS,
                    )
                except httpx.TransportError as err:
                    logger.warning(
                        "OneMap request failed (attempt %d/%d): %s",
                        attempt, MAX_ATTEMPTS, type(err).__name__,
                    )
                if attempt < MAX_ATTEMPTS:
                    await asyncio.sleep(BACKOFF_SECONDS * attempt)

        raise BadRequestError(message="Location search is temporarily unavailable")

    def _parse_results(self, payload: dict[str, Any]) -> list[GeocodedAddress]:
        results = payload.get("results") or []
        addresses: list[GeocodedAddress] = []
        for item in results:
            address = self._to_geocoded_address(item)
            if address is not None:
                addresses.append(address)
        return addresses

    def _to_geocoded_address(self, item: Any) -> GeocodedAddress | None:
        if not isinstance(item, dict):
            return None
        label = item.get("ADDRESS") or item.get("SEARCHVAL")
        if not label or label == "NIL":
            return None
        try:
            lat = float(item["LATITUDE"])
            lng = float(item.get("LONGITUDE", item.get("LONGTITUDE")))
            return GeocodedAddress(address_label=label.strip(), latitude=lat, longitude=lng)
        except (KeyError, TypeError, ValueError):
            return None
