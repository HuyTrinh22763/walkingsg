import math
import secrets
from datetime import UTC, datetime

import bcrypt
from starlette.concurrency import run_in_threadpool

EARTH_RADIUS_M = 6371000.0

SINGAPORE_LAT_MIN = 1.1304
SINGAPORE_LAT_MAX = 1.4784
SINGAPORE_LNG_MIN = 103.6020
SINGAPORE_LNG_MAX = 104.0945


def utc_now() -> datetime:
    return datetime.now(UTC)


async def hash_password(password: str) -> str:
    salt = await run_in_threadpool(bcrypt.gensalt)
    hashed = await run_in_threadpool(bcrypt.hashpw, password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


async def verify_password(password: str, hashed_password: str) -> bool:
    return await run_in_threadpool(
        bcrypt.checkpw,
        password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def generate_numeric_otp(digits: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(digits))


def is_within_singapore(latitude: float, longitude: float) -> bool:
    return (
        SINGAPORE_LAT_MIN <= latitude <= SINGAPORE_LAT_MAX
        and SINGAPORE_LNG_MIN <= longitude <= SINGAPORE_LNG_MAX
    )


def haversine_distance(
    coord1: tuple[float, float], coord2: tuple[float, float]
) -> float:
    """Great-circle distance in metres between two (latitude, longitude) points."""
    lat1, lng1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lng2 = math.radians(coord2[0]), math.radians(coord2[1])
    d_lat = lat2 - lat1
    d_lng = lng2 - lng1
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def clamp(
    val: float | int, min_val: float | int, max_val: float | int
) -> float | int:
    return max(min_val, min(val, max_val))


def normalize_weights(weights: dict[str, float]) -> dict[str, float]:
    total = sum(weights.values())
    if total <= 0:
        count = len(weights)
        if count == 0:
            return {}
        return {key: 1.0 / count for key in weights}
    return {key: value / total for key, value in weights.items()}


def point_to_segment_distance(
    point: tuple[float, float],
    seg_start: tuple[float, float],
    seg_end: tuple[float, float],
) -> float:
    """Perpendicular distance in metres from point to a line segment."""
    lat_p, lng_p = point
    lat_a, lng_a = seg_start
    lat_b, lng_b = seg_end

    # Equirectangular projection around segment midpoint
    mid_lat_rad = math.radians((lat_a + lat_b) / 2.0)
    deg_to_m_lat = 111320.0
    deg_to_m_lng = 111320.0 * math.cos(mid_lat_rad)

    dx = (lng_b - lng_a) * deg_to_m_lng
    dy = (lat_b - lat_a) * deg_to_m_lat
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq <= 1e-6:
        return haversine_distance(point, seg_start)

    px = (lng_p - lng_a) * deg_to_m_lng
    py = (lat_p - lat_a) * deg_to_m_lat

    t = max(0.0, min(1.0, (px * dx + py * dy) / seg_len_sq))
    proj_lat = lat_a + t * (lat_b - lat_a)
    proj_lng = lng_a + t * (lng_b - lng_a)

    return haversine_distance(point, (proj_lat, proj_lng))


def distance_to_polyline(
    point: tuple[float, float],
    polyline: list[list[float]],
) -> float:
    """Minimum distance in metres from point to any edge on a polyline."""
    if not polyline:
        return float("inf")
    if len(polyline) == 1:
        return haversine_distance(point, (polyline[0][0], polyline[0][1]))

    min_dist = float("inf")
    for i in range(len(polyline) - 1):
        p1 = (polyline[i][0], polyline[i][1])
        p2 = (polyline[i + 1][0], polyline[i + 1][1])
        dist = point_to_segment_distance(point, p1, p2)
        if dist < min_dist:
            min_dist = dist
    return min_dist


def calculate_route_progress(
    current_coord: tuple[float, float],
    polyline: list[list[float]],
    steps: list[str],
    total_distance: float,
    estimated_time: int,
) -> tuple[float, int, str]:
    """Computes remaining distance (m), remaining time (s), and next maneuver instruction."""
    if not polyline:
        return 0.0, 0, "Destination reached"

    # Find closest vertex index along polyline
    best_idx = 0
    best_dist = float("inf")
    for idx, vertex in enumerate(polyline):
        dist = haversine_distance(current_coord, (vertex[0], vertex[1]))
        if dist < best_dist:
            best_dist = dist
            best_idx = idx

    # Calculate remaining path distance from closest vertex to destination
    remaining_dist = haversine_distance(
        current_coord, (polyline[best_idx][0], polyline[best_idx][1])
    )
    for i in range(best_idx, len(polyline) - 1):
        remaining_dist += haversine_distance(
            (polyline[i][0], polyline[i][1]),
            (polyline[i + 1][0], polyline[i + 1][1]),
        )

    # Estimate remaining time in seconds proportionally
    if total_distance > 0:
        ratio = max(0.0, min(1.0, remaining_dist / total_distance))
        remaining_time = int(estimated_time * ratio)
    else:
        remaining_time = 0

    # Pick maneuver instruction corresponding to route progress
    if remaining_dist <= 5.0:
        next_instruction = "You have arrived at your destination!"
        remaining_time = 0
    elif steps:
        step_idx = min(
            int((best_idx / max(1, len(polyline) - 1)) * len(steps)),
            len(steps) - 1,
        )
        next_instruction = steps[step_idx]
    else:
        next_instruction = "Continue straight along route"

    return remaining_dist, remaining_time, next_instruction

