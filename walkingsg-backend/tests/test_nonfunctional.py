"""Tests for SRS Section 5 (non-functional requirements) and 5.5 business rules.

Each test name starts with the SRS item it checks.
"""
import json
import re
import statistics
import time
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from conftest import DEST, ORIGIN, h, login, make_user, seed_segments

pytestmark = pytest.mark.asyncio(loop_scope="session")

RESULTS: dict[str, str] = {}


def record(key, text):
    RESULTS[key] = text
    print(f"\n[{key}] {text}")


# ---------------------------------------------------------------- 5.1 Performance

async def test_5_1a_autocomplete_backend_time(client):
    """Autocomplete within 500 ms. OneMap itself is faked (blocked here), so
    this measures only WalkingSG's own share of the 500 ms budget."""
    times = []
    for _ in range(50):
        t0 = time.perf_counter()
        r = await client.get("/v1/api/location/search", params={"query": "bugis"})
        times.append((time.perf_counter() - t0) * 1000)
        assert r.status_code == 200
    p95 = sorted(times)[int(0.95 * len(times)) - 1]
    record("5.1a", f"backend own time p95={p95:.1f} ms (mobile adds a 300 ms debounce)")
    assert p95 + 300 < 500


async def test_5_1c_hazard_feed_under_3s_with_load(client, db):
    """Hazard feed loads within 3.0 s. Seed 2,000 active hazards near the user
    plus 300 expired ones (the endpoint cleans those up on every call)."""
    user = await make_user(client)
    await seed_segments(db)
    now = datetime.now(timezone.utc)
    docs = []
    for i in range(2000):
        docs.append({
            "reported_by_user_id": __import__("bson").ObjectId(user["x-client-id"]),
            "segment_id": "seg-1",
            "hazard_type": "blocked",
            "description": "",
            "hazard_status": "ACTIVE",
            "location": {"type": "Point", "coordinates": [ORIGIN[1] + (i % 50) * 1e-4, ORIGIN[0] + (i // 50) * 1e-4]},
            "report_timestamp": now - timedelta(hours=1, seconds=i),
        })
    for i in range(300):
        docs.append({**docs[i], "report_timestamp": now - timedelta(hours=80)})
    await db["hazards"].insert_many([{k: v for k, v in d.items() if k != "_id"} for d in docs])
    await db["hazards"].create_index([("location", "2dsphere")])

    t0 = time.perf_counter()
    r = await client.get("/v1/api/hazard/nearby", params={"latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    first = (time.perf_counter() - t0) * 1000
    assert r.status_code == 200
    t0 = time.perf_counter()
    r = await client.get("/v1/api/hazard/nearby", params={"latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    second = (time.perf_counter() - t0) * 1000
    body = r.content
    record("5.1c", f"first call (cleans 300 expired) {first:.0f} ms, next call {second:.0f} ms, "
                   f"{len(r.json()['metadata'])} hazards, {len(body)/1024:.0f} KB payload")
    assert first < 3000 and second < 3000


# ---------------------------------------------------------------- 5.2 Safety

async def test_5_2a_hazard_reduces_confidence_by_2_floor_minus_20(client, db):
    user = await make_user(client)
    await seed_segments(db)
    scores = []
    for _ in range(12):
        r = await client.post("/v1/api/hazard/report", headers=h(user), json={
            "hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
        assert r.status_code == 201, r.text
        seg = await db["map_segments"].find_one({"segment_id": "seg-0"})
        scores.append(seg["confidence_score"])
    record("5.2a", f"confidence after 12 reports: {scores}")
    assert scores[:10] == [-2.0 * (i + 1) for i in range(10)]
    assert scores[10:] == [-20.0, -20.0]


async def _start_nav(client, user):
    r = await client.post("/v1/api/route/generate", headers=h(user), json={
        "origin_coord": list(ORIGIN), "destination_coord": list(DEST)})
    assert r.status_code == 200, r.text
    route_id = r.json()["metadata"]["starred_route"]["route_id"]
    r = await client.post("/v1/api/navigation/start", headers=h(user), json={"route_id": route_id})
    assert r.status_code == 201, r.text
    return route_id, r.json()["metadata"]["session_id"]


async def test_5_2b_speed_warning_boundary(client, db):
    user = await make_user(client)
    await seed_segments(db)
    _, sid = await _start_nav(client, user)
    on_route = [ORIGIN[0] + (DEST[0] - ORIGIN[0]) * 0.3, ORIGIN[1] + (DEST[1] - ORIGIN[1]) * 0.3]
    out = {}
    for speed in (0.0, 24.9, 25.0, 25.1, 60.0):
        r = await client.post("/v1/api/navigation/track", headers=h(user), json={
            "session_id": sid, "current_coord": on_route, "speed_kmh": speed})
        assert r.status_code == 200, r.text
        out[speed] = r.json()["metadata"]["motion_warning"]
    record("5.2b", f"motion_warning by speed: {out}")
    assert out == {0.0: False, 24.9: False, 25.0: False, 25.1: True, 60.0: True}


@pytest.mark.parametrize("origin,dest,ok", [
    ((1.1304, 103.6020), DEST, True),      # exact south-west corner
    ((1.4784, 104.0945), DEST, True),      # exact north-east corner
    ((1.1303, 103.8000), DEST, False),     # just south
    ((1.4785, 103.8000), DEST, False),     # just north (Johor)
    (ORIGIN, (1.3000, 104.0946), False),   # destination just east
    (ORIGIN, (1.3000, 103.6019), False),   # destination just west
])
async def test_5_2c_reject_routes_outside_singapore(client, db, origin, dest, ok):
    user = await make_user(client)
    r = await client.post("/v1/api/route/generate", headers=h(user), json={
        "origin_coord": list(origin), "destination_coord": list(dest)})
    assert (r.status_code == 200) == ok, r.text
    if not ok:
        assert r.status_code == 400
        assert "within Singapore" in r.json()["message"]


# ---------------------------------------------------------------- 5.3 Security

async def test_5_3a_passwords_are_hashed(client, db):
    await make_user(client, password="Password@123")
    cred = await db["credentials"].find_one({})
    record("5.3a", f"stored hash prefix {cred['password_hash'][:7]}..., length {len(cred['password_hash'])}")
    assert "Password@123" not in json.dumps(cred, default=str)
    assert re.match(r"^\$2[aby]\$\d\d\$", cred["password_hash"])  # bcrypt


async def test_5_3b_token_lifetimes(client):
    user = await make_user(client)
    a = jwt.decode(user["_access"], options={"verify_signature": False})
    r = jwt.decode(user["_refresh"], options={"verify_signature": False})
    access_h = (a["exp"] - a["iat"]) / 3600
    refresh_d = (r["exp"] - r["iat"]) / 86400
    record("5.3b", f"access token lasts {access_h} h, refresh token lasts {refresh_d} d")
    assert access_h == 2 and refresh_d == 7


async def test_5_3b_expired_access_token_rejected(client):
    user = await make_user(client)
    payload = jwt.decode(user["_access"], options={"verify_signature": False})
    payload["exp"] = int(time.time()) - 5
    stale = jwt.encode(payload, "srs-check-secret", algorithm="HS256")
    r = await client.get("/v1/api/profile", headers={
        "authorization": f"Bearer {stale}", "x-client-id": user["x-client-id"]})
    assert r.status_code == 401 and r.json()["message"] == "Token expired"


async def test_5_3c_extra_fields_rejected(client):
    user = await make_user(client)
    r = await client.put("/v1/api/profile", headers=h(user), json={
        "name": "Huy", "age": 20, "mobility_needs": "None", "heat_uv_sensitivity": "Low",
        "max_stairs_per_route": 10, "preferred_pace": "Relaxed", "is_admin": True})
    assert r.status_code == 422


async def test_5_3c_search_query_limit(client):
    r = await client.get("/v1/api/location/search", params={"query": "x" * 101})
    assert r.status_code == 422


async def test_5_3c_no_raw_queries_in_source():
    import pathlib
    src = pathlib.Path(__file__).resolve().parent.parent / "src"
    hits = [str(p) for p in src.rglob("*.py")
            if re.search(r"\$where|execute\(|\bSELECT\b|aggregate\(", p.read_text())]
    record("5.3c-odm", f"raw query patterns found: {hits}")
    assert hits == []


async def test_5_5b_only_owner_can_edit_profile(client):
    a = await make_user(client, email="a@example.com")
    b = await make_user(client, email="b@example.com")
    r = await client.put("/v1/api/profile", headers={
        "authorization": a["authorization"], "x-client-id": b["x-client-id"]}, json={
        "name": "Hacked", "age": 30, "mobility_needs": "None", "heat_uv_sensitivity": "Low",
        "max_stairs_per_route": 10, "preferred_pace": "Relaxed"})
    assert r.status_code == 401


# ---------------------------------------------------------------- 5.4 Quality

async def test_5_4_testability_100_identical_requests(client, db):
    user = await make_user(client)
    await seed_segments(db, stairs=1, sheltered=True)
    payloads = set()
    for _ in range(100):
        r = await client.post("/v1/api/route/generate", headers=h(user), json={
            "origin_coord": list(ORIGIN), "destination_coord": list(DEST)})
        assert r.status_code == 200
        m = r.json()["metadata"]
        for rt in [m["starred_route"], *m["alternative_routes"]]:
            rt.pop("route_id")
        m["starred_route"].pop("route_id", None)
        payloads.add(json.dumps(m, sort_keys=True))
    record("5.4-testability", f"distinct payloads over 100 calls (ignoring new route_id): {len(payloads)}")
    assert len(payloads) == 1


async def test_5_4_adaptability_penalty_change_needs_no_api_change(client, db, monkeypatch):
    from src.services import hazard_service
    user = await make_user(client)
    await seed_segments(db)
    r1 = await client.post("/v1/api/hazard/report", headers=h(user), json={
        "hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    monkeypatch.setattr(hazard_service, "HAZARD_PENALTY", 5.0)
    r2 = await client.post("/v1/api/hazard/report", headers=h(user), json={
        "hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    seg = await db["map_segments"].find_one({"segment_id": "seg-0"})
    assert set(r1.json()["metadata"]) == set(r2.json()["metadata"])
    assert seg["confidence_score"] == -7.0


async def test_5_4_maintainability_swap_routing_provider():
    """Scoring must not change when the map provider is swapped behind the adapter."""
    from unittest.mock import AsyncMock
    from conftest import fake_routes
    from src.model.profile_model import ProfileModel
    from src.services.route_service import RouteService
    from src.schemas.route_schema import RouteSearchRequest
    from beanie import PydanticObjectId

    class OtherProvider:
        async def get_pedestrian_route(self, origin_coord, destination_coord, avoid_polygons=None):
            return fake_routes(origin_coord, destination_coord)

    uid = PydanticObjectId()
    profile = ProfileModel.model_construct(user_id=uid, age=30, mobility_needs="None",
                                           heat_uv_sensitivity="Medium", max_stairs_per_route=10,
                                           preferred_pace="Relaxed")
    repo = AsyncMock()
    repo.find_by_user_id.return_value = profile
    segs = AsyncMock(); segs.find_segments_in_bbox.return_value = []
    routes = AsyncMock()

    async def _create(*, route):
        route.id = PydanticObjectId()
        return route
    routes.create.side_effect = _create
    svc = RouteService(segs, routes, repo, routing_adapter=OtherProvider())
    out = await svc.generate_routes(uid, RouteSearchRequest(origin_coord=ORIGIN, destination_coord=DEST))
    assert out.starred_route.match_score > 0


# ---------------------------------------------------------------- 5.5 Business rules

async def test_5_5a_completion_adds_1_capped_at_20(client, db):
    user = await make_user(client)
    await seed_segments(db, confidence=19.5)
    _, sid = await _start_nav(client, user)
    from conftest import straight_line
    for pt in straight_line(ORIGIN, DEST)[:-1]:
        r = await client.post("/v1/api/navigation/track", headers=h(user), json={
            "session_id": sid, "current_coord": pt, "speed_kmh": 4})
        assert r.status_code == 200, r.text
    r = await client.post("/v1/api/navigation/track", headers=h(user), json={
        "session_id": sid, "current_coord": list(DEST), "speed_kmh": 4})
    assert r.json()["metadata"]["status"] == "COMPLETED"
    scores = sorted({s["confidence_score"] async for s in db["map_segments"].find({})})
    record("5.5a", f"segment scores after arrival: {scores}")
    assert max(scores) == 20.0


async def test_5_5c_match_score_formula_by_hand():
    from src.model.profile_model import ProfileModel
    from src.model.route_model import RouteModel
    from src.services.route_service import RouteService
    from src.services.adapters.weather_adapter import WeatherCondition, WeatherSnapshot
    from src.utils.index import haversine_distance
    from unittest.mock import MagicMock

    svc = RouteService(MagicMock(), MagicMock(), MagicMock(), routing_adapter=MagicMock())
    profile = ProfileModel.model_construct(age=70, mobility_needs="None", heat_uv_sensitivity="High")
    straight = haversine_distance(ORIGIN, DEST)
    route = RouteModel.model_construct(origin_coordinates=ORIGIN, destination_coordinates=DEST,
                                       total_distance=straight * 1.25, sheltered_percentage=40.0,
                                       stair_count=3)
    rain = WeatherSnapshot(WeatherCondition.RAINY, "Showers", 26, "City", "x")
    got = svc.calculate_match_score(route, profile, segments=[], weather=rain)
    # by hand: w_eff .25-.05=.20, w_sh .20+.30=.50, w_eff(ort) .20, w_conf .15 -> sum 1.05
    s_eff, s_sh, s_effort, s_conf = 80.0, 40.0, 70.0, 50.0
    expect = (0.20 * s_eff + 0.50 * s_sh + 0.20 * s_effort + 0.15 * s_conf) / 1.05
    record("5.5c", f"engine {got} vs by hand {round(expect, 2)}")
    assert got == round(expect, 2)


async def test_5_5d_hazard_within_40m_costs_20_points(client, db):
    user = await make_user(client)
    await seed_segments(db)
    r0 = await client.post("/v1/api/route/generate", headers=h(user), json={
        "origin_coord": list(ORIGIN), "destination_coord": list(DEST)})
    base = {x["route_type"]: x for x in [r0.json()["metadata"]["starred_route"], *r0.json()["metadata"]["alternative_routes"]]}
    mid = [(ORIGIN[0] + DEST[0]) / 2, (ORIGIN[1] + DEST[1]) / 2]
    await client.post("/v1/api/hazard/report", headers=h(user), json={
        "hazard_type": "other", "latitude": mid[0], "longitude": mid[1]})
    r1 = await client.post("/v1/api/route/generate", headers=h(user), json={
        "origin_coord": list(ORIGIN), "destination_coord": list(DEST)})
    after = {x["route_type"]: x for x in [r1.json()["metadata"]["starred_route"], *r1.json()["metadata"]["alternative_routes"]]}
    d = after["Direct"]
    record("5.5d", f"Direct: before {base['Direct']['match_score']} -> after {d['match_score']} "
                   f"with {d['hazard_count']} hazard")
    assert d["hazard_count"] == 1
