import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from src.core.error_response import BadRequestError

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 3.0
MAX_ATTEMPTS = 3
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
BACKOFF_SECONDS = 0.2

OSRM_FOOT_URL = "https://routing.openstreetmap.de/routed-foot/route/v1/foot"
OSRM_FALLBACK_URL = "https://router.project-osrm.org/route/v1/foot"


@dataclass(frozen=True, slots=True)
class PedestrianRouteData:
    polyline: list[list[float]]  # [[lat, lng], ...]
    distance_meters: float
    duration_seconds: int
    steps: list[str]


class PedestrianRoutingAdapter:
    async def get_pedestrian_route(
        self,
        *,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
    ) -> list[PedestrianRouteData]:
        payload = await self._fetch_route_with_fallback(
            origin_coord=origin_coord, destination_coord=destination_coord
        )
        return self._parse_routes(payload)

    async def _fetch_route_with_fallback(
        self,
        *,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
    ) -> dict[str, Any]:
        endpoints = [OSRM_FOOT_URL, OSRM_FALLBACK_URL]
        # OSRM coordinate order in path: {lng},{lat};{lng},{lat}
        coord_path = (
            f"{origin_coord[1]:.6f},{origin_coord[0]:.6f};"
            f"{destination_coord[1]:.6f},{destination_coord[0]:.6f}"
        )
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "alternatives": "true",
        }

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            for base_url in endpoints:
                url = f"{base_url}/{coord_path}"
                for attempt in range(1, MAX_ATTEMPTS + 1):
                    try:
                        response = await client.get(url, params=params)
                        if response.status_code not in RETRYABLE_STATUS_CODES:
                            if response.is_error:
                                logger.warning(
                                    "Upstream routing error %d from %s",
                                    response.status_code,
                                    base_url,
                                )
                                break  # try fallback endpoint or fail
                            data = response.json()
                            if data.get("code") == "Ok" and data.get("routes"):
                                return data
                            logger.warning(
                                "Upstream routing returned non-ok code '%s' from %s",
                                data.get("code"),
                                base_url,
                            )
                            break
                        logger.warning(
                            "Routing endpoint %s returned %d (attempt %d/%d)",
                            base_url,
                            response.status_code,
                            attempt,
                            MAX_ATTEMPTS,
                        )
                    except httpx.TransportError as err:
                        logger.warning(
                            "Routing request to %s failed (attempt %d/%d): %s",
                            base_url,
                            attempt,
                            MAX_ATTEMPTS,
                            type(err).__name__,
                        )
                    if attempt < MAX_ATTEMPTS:
                        await asyncio.sleep(BACKOFF_SECONDS * attempt)

        raise BadRequestError(message="Pedestrian routing is temporarily unavailable")

    def _parse_routes(self, payload: dict[str, Any]) -> list[PedestrianRouteData]:
        raw_routes = payload.get("routes") or []
        routes: list[PedestrianRouteData] = []

        for item in raw_routes:
            route_data = self._to_route_data(item)
            if route_data is not None:
                routes.append(route_data)

        if not routes:
            raise BadRequestError(message="Pedestrian routing is temporarily unavailable")

        return routes

    def _to_route_data(self, item: dict[str, Any]) -> PedestrianRouteData | None:
        try:
            geometry = item.get("geometry") or {}
            raw_coords = geometry.get("coordinates") or []
            if not raw_coords:
                return None

            # GeoJSON coordinates are [longitude, latitude] -> convert to [latitude, longitude]
            polyline = [[float(pt[1]), float(pt[0])] for pt in raw_coords]

            distance = float(item.get("distance", 0.0))
            raw_duration = float(item.get("duration", 0.0))

            # Walking speed baseline (~1.25 m/s): ensure duration reflects pedestrian pace
            duration = (
                int(round(max(raw_duration, distance / 1.25)))
                if distance > 0
                else int(round(raw_duration))
            )

            steps: list[str] = []
            legs = item.get("legs") or []
            for leg in legs:
                raw_steps = leg.get("steps") or []
                for s in raw_steps:
                    formatted = self._format_step(s)
                    if formatted:
                        steps.append(formatted)

            if not steps:
                steps = ["Start walking", "Arrive at destination"]

            return PedestrianRouteData(
                polyline=polyline,
                distance_meters=distance,
                duration_seconds=duration,
                steps=steps,
            )
        except (KeyError, TypeError, ValueError) as err:
            logger.warning("Failed to parse route item: %s", err)
            return None

    def _format_step(self, step: dict[str, Any]) -> str:
        maneuver = step.get("maneuver") or {}
        m_type = maneuver.get("type", "")
        modifier = maneuver.get("modifier", "")
        name = (step.get("name") or "").strip()
        dist = round(float(step.get("distance", 0.0)))

        if m_type == "depart":
            if name:
                return f"Head along {name}"
            return "Start walking"
        if m_type == "arrive":
            return "Arrive at destination"
        if m_type in ("turn", "end of road", "fork"):
            direction = f" {modifier}" if modifier else ""
            onto = f" onto {name}" if name else ""
            return f"Turn{direction}{onto}".strip()
        if m_type == "continue":
            onto = f" onto {name}" if name else ""
            for_dist = f" for {dist}m" if dist > 0 else ""
            return f"Continue{onto}{for_dist}".strip()

        if name:
            return f"Follow {name}"
        if dist > 0:
            return f"Walk for {dist}m"
        return "Continue along path"
