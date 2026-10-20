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
