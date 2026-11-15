"""Shared setup for the SRS verification tests.

Runs the real FastAPI app against a real local MongoDB. Only the outside
services (OneMap, OpenRouteService/OSRM, NEA weather, SMTP) are replaced
with fixed fakes, because this machine cannot reach them.
"""
import os
import sys

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_BACKEND = os.path.dirname(TESTS_DIR)
sys.path.insert(0, TESTS_DIR)
sys.path.insert(0, REPO_BACKEND)


def _from_env_file(key):
    path = os.path.join(REPO_BACKEND, ".env")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            k, _, v = line.strip().partition("=")
            if k.strip().upper() == key:
                return v.strip().strip('"').strip("'")
    return None


# Use the same database server as the app (DB_URI from the environment or walkingsg-backend/.env).
os.environ.setdefault("DB_URI", _from_env_file("DB_URI") or "mongodb://127.0.0.1:27017")
# Always use a separate test database: the tests empty it before every test, so never point this at real data.
os.environ["DB_NAME"] = "walkingsg_test"
os.environ.setdefault("JWT_SECRET", "srs-check-secret")
os.environ.pop("ORS_API_KEY", None)

import httpx  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from pymongo import AsyncMongoClient  # noqa: E402

from src.app import create_app  # noqa: E402
from src.configs.config import get_settings  # noqa: E402
from src.dbs.init_mongodb import Database  # noqa: E402
from src.services.adapters import mailer_adapter, onemap_adapter  # noqa: E402
from src.services.adapters.onemap_adapter import GeocodedAddress  # noqa: E402
from src.services.adapters.pedestrian_routing_adapter import (  # noqa: E402
    PedestrianRouteData,
    PedestrianRoutingAdapter,
)
from src.services.adapters.ors_routing_adapter import OrsRoutingAdapter  # noqa: E402
from src.services.adapters.weather_adapter import WeatherAdapter  # noqa: E402

SENT_CODES: dict[str, str] = {}

# A real walk in town: Bencoolen St -> Bugis
ORIGIN = (1.2966, 103.8498)
DEST = (1.3000, 103.8550)


def straight_line(a, b, n=20, bend=0.0):
    pts = []
    for i in range(n + 1):
        t = i / n
        lat = a[0] + (b[0] - a[0]) * t + bend * (t * (1 - t))
        lng = a[1] + (b[1] - a[1]) * t - bend * (t * (1 - t))
        pts.append([lat, lng])
    return pts


def fake_routes(origin, dest):
    from src.utils.index import haversine_distance

    out = []
    for idx, bend in enumerate((0.0, 0.0012, -0.0012)):
        poly = straight_line(origin, dest, bend=bend)
        dist = sum(
            haversine_distance(tuple(poly[i]), tuple(poly[i + 1]))
            for i in range(len(poly) - 1)
        )
        out.append(
            PedestrianRouteData(
                polyline=poly,
                distance_meters=round(dist, 2),
                duration_seconds=int(round(dist / 1.25)),
                steps=[f"Head along road {idx}", "Turn left", "Arrive at destination"],
            )
        )
    return out


SRS_TEST_MODULES = {
    "test_functional_core",
    "test_functional_gaps",
    "test_nonfunctional",
    "test_network_resiliency",
    "test_srs_requirements",
}


@pytest.fixture(autouse=True)
def stub_outside_services(request, monkeypatch):
    if request.module.__name__.split(".")[-1] not in SRS_TEST_MODULES:
        return

    async def fake_search(self, *, query):
        return [
            GeocodedAddress("BENCOOLEN STREET", ORIGIN[0], ORIGIN[1]),
            GeocodedAddress("BUGIS JUNCTION", DEST[0], DEST[1]),
        ]

    async def fake_ped(self, *, origin_coord, destination_coord, via_coord=None):
        return fake_routes(origin_coord, destination_coord)

    async def fake_ors(self, origin_coord, destination_coord, avoid_polygons=None):
        return fake_routes(origin_coord, destination_coord)

    async def fake_nea(self):
        return (
            {
                "area_metadata": [
                    {"name": "City", "label_location": {"latitude": 1.29, "longitude": 103.85}}
                ],
                "items": [{"forecasts": [{"area": "City", "forecast": "Partly Cloudy"}]}],
            },
            {
                "metadata": {
                    "stations": [
                        {"id": "S1", "location": {"latitude": 1.29, "longitude": 103.85}}
                    ]
                },
                "items": [{"readings": [{"station_id": "S1", "value": 29.0}]}],
            },
        )

    async def fake_send(self, *, email, code):
        SENT_CODES[email] = code
        return True

    monkeypatch.setattr(onemap_adapter.OneMapAdapter, "search", fake_search)
    monkeypatch.setattr(PedestrianRoutingAdapter, "get_pedestrian_route", fake_ped)
    monkeypatch.setattr(OrsRoutingAdapter, "get_pedestrian_route", fake_ors)
    monkeypatch.setattr(WeatherAdapter, "_fetch_nea_cached", fake_nea)
    monkeypatch.setattr(mailer_adapter.MailerAdapter, "send_otp", fake_send)


@pytest_asyncio.fixture(loop_scope="session", scope="session")
async def app():
    application = create_app()
    await Database.connect(get_settings())
    yield application
    await Database.close()


@pytest_asyncio.fixture(loop_scope="session")
async def db(app):
    client = AsyncMongoClient(os.environ["DB_URI"])
    database = client[os.environ["DB_NAME"]]
    for name in await database.list_collection_names():
        await database[name].delete_many({})
    yield database
    await client.close()


@pytest_asyncio.fixture(loop_scope="session")
async def client(app, db):
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def code_for(email):
    """Latest 6-digit code for this email, read from the test database (does not rely on email)."""
    mc = AsyncMongoClient(os.environ["DB_URI"])
    try:
        dbx = mc[os.environ["DB_NAME"]]
        user = await dbx["users"].find_one({"user_email": email})
        assert user is not None, f"no user {email}"
        otp = await dbx["otps"].find_one({"user_id": user["_id"]}, sort=[("_id", -1)])
        assert otp is not None, f"no code stored for {email}"
        return otp["otp_code"]
    finally:
        await mc.close()


async def make_user(client, email="walker@example.com", password="Password@123"):
    r = await client.post(
        "/v1/api/access/signup", json={"user_email": email, "password": password}
    )
    assert r.status_code == 201, r.text
    r = await client.post(
        "/v1/api/access/verify-otp",
        json={"user_email": email, "otp_code": await code_for(email)},
    )
    assert r.status_code == 200, r.text
    return await login(client, email, password)


async def login(client, email, password="Password@123"):
    r = await client.post(
        "/v1/api/access/login", json={"user_email": email, "password": password}
    )
    assert r.status_code == 200, r.text
    meta = r.json()["metadata"]
    return {
        "authorization": f"Bearer {meta['access_token']}",
        "x-client-id": meta["user_id"],
        "_access": meta["access_token"],
        "_refresh": meta["refresh_token"],
    }


def h(user):
    return {k: v for k, v in user.items() if not k.startswith("_")}


async def seed_segments(db, *, stairs=0, barrier_free=True, sheltered=True, confidence=0.0):
    """Lay map segments along the straight fake route."""
    poly = straight_line(ORIGIN, DEST)
    docs = []
    for i in range(len(poly) - 1):
        docs.append(
            {
                "segment_id": f"seg-{i}",
                "start_coordinates": poly[i],
                "end_coordinates": poly[i + 1],
                "confidence_score": confidence,
                "is_barrier_free": barrier_free,
                "stair_count": stairs,
                "is_sheltered": sheltered,
            }
        )
    await db["map_segments"].insert_many(docs)
    return docs
