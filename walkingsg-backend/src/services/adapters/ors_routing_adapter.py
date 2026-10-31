import logging
from typing import Any

import httpx

from src.configs.config import get_settings
from src.services.adapters.pedestrian_routing_adapter import (
    PedestrianRouteData,
    PedestrianRoutingAdapter,
)

logger = logging.getLogger(__name__)

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"


_UNSET = object()


class OrsRoutingAdapter:
    def __init__(
        self,
        api_key: Any = _UNSET,
        fallback_adapter: PedestrianRoutingAdapter | None = None,
        timeout: float = 8.0,
    ) -> None:
        if api_key is _UNSET:
            settings_key = get_settings().ors_api_key
            self._api_key = (
                settings_key.get_secret_value() if settings_key else None
            )
        else:
            self._api_key = api_key

        self._fallback_adapter = fallback_adapter or PedestrianRoutingAdapter()
        self._timeout = timeout

    async def get_pedestrian_route(
        self,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
        avoid_polygons: list[list[list[list[float]]]] | None = None,
    ) -> list[PedestrianRouteData]:
        """Fetch pedestrian routes from OpenRouteService with optional polygon avoidance.

        Falls back to PedestrianRoutingAdapter (OSRM) if API key is not configured or request fails.
        """
        if not self._api_key:
            logger.debug("No ORS_API_KEY configured, falling back to OSRM adapter")
            return await self._fallback_adapter.get_pedestrian_route(
                origin_coord=origin_coord, destination_coord=destination_coord
            )

        headers = {
            "Authorization": self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json",
        }

        body: dict[str, Any] = {
            "coordinates": [
                [origin_coord[1], origin_coord[0]],
                [destination_coord[1], destination_coord[0]],
            ],
            "alternative_routes": {
                "target_count": 3,
            },
        }

        if avoid_polygons:
            body["options"] = {
                "avoid_polygons": {
                    "type": "MultiPolygon",
                    "coordinates": avoid_polygons,
                }
            }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    ORS_DIRECTIONS_URL, json=body, headers=headers
                )

                if response.status_code != 200:
                    logger.warning(
                        "ORS returned HTTP %s: %s. Falling back to OSRM.",
                        response.status_code,
                        response.text[:200],
                    )
                    return await self._fallback_adapter.get_pedestrian_route(
                        origin_coord=origin_coord, destination_coord=destination_coord
                    )

                data = response.json()
                features = data.get("features", [])
                if not features:
                    logger.warning("ORS returned empty features. Falling back to OSRM.")
                    return await self._fallback_adapter.get_pedestrian_route(
                        origin_coord=origin_coord, destination_coord=destination_coord
                    )

                results: list[PedestrianRouteData] = []
                for feat in features:
                    geometry = feat.get("geometry", {})
                    raw_coords = geometry.get("coordinates", [])
                    # GeoJSON is [lon, lat] -> convert to [[lat, lon], ...]
                    route_coords = [
                        [float(coord[1]), float(coord[0])] for coord in raw_coords
                    ]

                    properties = feat.get("properties", {})
                    summary = properties.get("summary", {})
                    distance_m = float(summary.get("distance", 0.0))
                    duration_s = int(round(float(summary.get("duration", 0.0))))

                    if route_coords:
                        results.append(
                            PedestrianRouteData(
                                polyline=route_coords,
                                distance_meters=distance_m,
                                duration_seconds=duration_s,
                                steps=[],
                            )
                        )

                if results:
                    return results

                return await self._fallback_adapter.get_pedestrian_route(
                    origin_coord=origin_coord, destination_coord=destination_coord
                )

        except Exception as exc:
            logger.warning("Failed to call ORS directions: %s. Falling back to OSRM.", exc)
            return await self._fallback_adapter.get_pedestrian_route(
                origin_coord=origin_coord, destination_coord=destination_coord
            )
