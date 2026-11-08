import asyncio
import logging
import time
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import httpx

from src.utils.index import haversine_distance

logger = logging.getLogger(__name__)

NEA_FORECAST_URL = "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast"
NEA_TEMP_URL = "https://api.data.gov.sg/v1/environment/air-temperature"
CACHE_TTL_SECONDS = 300.0
TIMEOUT_SECONDS = 2.5


class WeatherCondition(StrEnum):
    CLEAR = "clear"
    CLOUDY = "cloudy"
    HOT_SUNNY = "hot_sunny"
    RAINY = "rainy"
    THUNDERY = "thundery"


@dataclass(frozen=True, slots=True)
class WeatherSnapshot:
    condition: WeatherCondition
    forecast_text: str
    temperature_c: float
    area_name: str
    advisory_message: str
    is_simulated: bool = False


SIMULATED_PRESETS: dict[WeatherCondition, tuple[str, float, str]] = {
    WeatherCondition.RAINY: (
        "Moderate Showers",
        25.6,
        "Today is raining — sheltered walkways are strongly prioritized.",
    ),
    WeatherCondition.THUNDERY: (
        "Thundery Showers",
        24.8,
        "Thunderstorm alert — maximizing covered linkways & reliable paths.",
    ),
    WeatherCondition.HOT_SUNNY: (
        "Strong Sun & Warm",
        33.6,
        "High heat & UV today — shaded paths and fewer stairs prioritized.",
    ),
    WeatherCondition.CLOUDY: (
        "Partly Cloudy",
        28.8,
        "Pleasant cloudy skies — using your standard walking preferences.",
    ),
    WeatherCondition.CLEAR: (
        "Fair & Breezy",
        28.2,
        "Clear walking weather — balanced directness and comfort weights.",
    ),
}


class WeatherAdapter:
    _cache_payload: tuple[dict[str, Any] | None, dict[str, Any] | None] | None = None
    _cache_timestamp: float = 0.0

    async def get_weather(
        self,
        origin_coord: tuple[float, float],
        *,
        override: WeatherCondition | None = None,
    ) -> WeatherSnapshot:
        if override is not None:
            forecast_text, temp_c, msg = SIMULATED_PRESETS[override]
            return WeatherSnapshot(
                condition=override,
                forecast_text=forecast_text,
                temperature_c=temp_c,
                area_name="Demo Simulation",
                advisory_message=msg,
                is_simulated=True,
            )

        forecast_data, temp_data = await self._fetch_nea_cached()
        area_name, forecast_text = self._nearest_forecast(origin_coord, forecast_data)
        temp_c = round(self._nearest_temperature(origin_coord, temp_data), 1)
        condition = self._classify(forecast_text, temp_c)
        advisory = self._build_advisory(condition, area_name, forecast_text, temp_c)

        return WeatherSnapshot(
            condition=condition,
            forecast_text=forecast_text,
            temperature_c=temp_c,
            area_name=area_name,
            advisory_message=advisory,
            is_simulated=False,
        )

    async def _fetch_nea_cached(
        self,
    ) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
        now = time.monotonic()
        if (
            self._cache_payload is not None
            and (now - self._cache_timestamp) < CACHE_TTL_SECONDS
        ):
            return self._cache_payload

        async def _safe_get(
            client: httpx.AsyncClient, url: str
        ) -> dict[str, Any] | None:
            try:
                res = await client.get(url)
                return res.json() if res.status_code == 200 else None
            except Exception as exc:
                logger.warning("NEA weather fetch failed (%s): %s", url, exc)
                return None

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            forecast_data, temp_data = await asyncio.gather(
                _safe_get(client, NEA_FORECAST_URL),
                _safe_get(client, NEA_TEMP_URL),
            )

        if forecast_data is not None or temp_data is not None:
            WeatherAdapter._cache_payload = (forecast_data, temp_data)
            WeatherAdapter._cache_timestamp = now

        return forecast_data, temp_data

    def _nearest_forecast(
        self, coord: tuple[float, float], data: dict[str, Any] | None
    ) -> tuple[str, str]:
        if not data:
            return "Singapore", "Fair"
        try:
            areas = data.get("area_metadata") or []
            items = data.get("items") or []
            if not items:
                return "Singapore", "Fair"
            forecasts = {
                f["area"]: f["forecast"]
                for f in (items[0].get("forecasts") or [])
                if isinstance(f, dict) and "area" in f and "forecast" in f
            }
            best_area = "Singapore"
            best_dist = float("inf")
            for a in areas:
                name = a.get("name")
                loc = a.get("label_location") or {}
                if name in forecasts and "latitude" in loc and "longitude" in loc:
                    d = haversine_distance(
                        coord, (float(loc["latitude"]), float(loc["longitude"]))
                    )
                    if d < best_dist:
                        best_dist = d
                        best_area = name
            return best_area, forecasts.get(best_area, "Fair")
        except Exception:
            return "Singapore", "Fair"

    def _nearest_temperature(
        self, coord: tuple[float, float], data: dict[str, Any] | None
    ) -> float:
        if not data:
            return 29.0
        try:
            stations = {
                s["id"]: (
                    float(s["location"]["latitude"]),
                    float(s["location"]["longitude"]),
                )
                for s in (data.get("metadata", {}).get("stations") or [])
                if isinstance(s, dict) and "id" in s and "location" in s
            }
            items = data.get("items") or []
            if not items:
                return 29.0
            readings = items[0].get("readings") or []
            best_temp = 29.0
            best_dist = float("inf")
            for r in readings:
                sid = r.get("station_id")
                val = r.get("value")
                if sid in stations and val is not None:
                    d = haversine_distance(coord, stations[sid])
                    if d < best_dist:
                        best_dist = d
                        best_temp = float(val)
            return best_temp
        except Exception:
            return 29.0

    def _classify(self, forecast_text: str, temp_c: float) -> WeatherCondition:
        lower = forecast_text.lower()
        if "thunder" in lower:
            return WeatherCondition.THUNDERY
        if any(k in lower for k in ("rain", "shower", "drizzle")):
            return WeatherCondition.RAINY
        if temp_c >= 32.0 or any(k in lower for k in ("warm", "hot", "sunny")):
            return WeatherCondition.HOT_SUNNY
        if any(k in lower for k in ("cloud", "overcast", "hazy")):
            return WeatherCondition.CLOUDY
        return WeatherCondition.CLEAR

    def _build_advisory(
        self,
        condition: WeatherCondition,
        area: str,
        forecast: str,
        temp_c: float,
    ) -> str:
        if condition == WeatherCondition.THUNDERY:
            return f"Today has {forecast.lower()} in {area} ({temp_c:.1f}°C) — maximizing covered walkways."
        if condition == WeatherCondition.RAINY:
            return f"Today is raining in {area} ({forecast}, {temp_c:.1f}°C) — sheltered paths prioritized."
        if condition == WeatherCondition.HOT_SUNNY:
            return f"Warm weather in {area} ({temp_c:.1f}°C, {forecast}) — shade & fewer stairs prioritized."
        return f"{forecast} in {area} ({temp_c:.1f}°C) — pleasant conditions for walking."

