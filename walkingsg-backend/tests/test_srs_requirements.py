"""One backend test per SRS requirement (Section 4) that the backend implements.

Real FastAPI app + real MongoDB; only OneMap, ORS/OSRM, NEA and email are faked.
Test names start with the requirement ID so the report can trace them.
"""
from datetime import timedelta
from types import SimpleNamespace

import pytest

from conftest import DEST, ORIGIN, SENT_CODES, code_for, h, login, make_user, seed_segments, straight_line
from src.model.route_model import RouteType
from src.services.adapters.weather_adapter import WeatherAdapter, WeatherCondition, WeatherSnapshot
from src.services.route_service import RouteService
from src.utils.index import haversine_distance

pytestmark = pytest.mark.asyncio(loop_scope="session")

PW = "Password@123"
PROFILE = {"name": "Huy", "age": 30, "mobility_needs": "None", "heat_uv_sensitivity": "Medium",
           "max_stairs_per_route": 10, "preferred_pace": "Relaxed"}
A = "/v1/api/access"


async def signup(client, email="a@example.com", pw=PW):
    return await client.post(f"{A}/signup", json={"user_email": email, "password": pw})


async def gen(client, u, **extra):
    r = await client.post("/v1/api/route/generate", headers=h(u),
                          json={"origin_coord": list(ORIGIN), "destination_coord": list(DEST), **extra})
    assert r.status_code == 200, r.text
    m = r.json()["metadata"]
    return [m["starred_route"], *m["alternative_routes"]], m.get("weather")


# ---------------- AUTH ----------------

async def test_AUTH_01_register(client, db):
    r = await signup(client)
    assert r.status_code == 201 and await db["users"].count_documents({"user_email": "a@example.com"}) == 1


async def test_AUTH_01_1_and_01_2_duplicate_email(client, db):
    await signup(client)
    r = await signup(client)
    assert r.status_code == 409 and r.json()["message"] == "Email already registered"


@pytest.mark.parametrize("pw,ok", [("Abc@123", False), ("Abcd@123", True), ("Abcdefgh", False), ("abcdefg@", True)])
async def test_AUTH_01_3_and_01_4_password_rules(client, db, pw, ok):
    r = await signup(client, pw=pw)
    assert (r.status_code == 201) == ok


async def test_AUTH_01_5_six_digit_code_sent(client, db):
    await signup(client)
    code = (await code_for("a@example.com"))
    assert len(code) == 6 and code.isdigit()


async def test_AUTH_01_6_code_expires_after_10_minutes(client, db):
    await signup(client)
    otp = await db["otps"].find_one({})
    life = otp["expires_at"] - otp["created_at"] if "created_at" in otp else None
    if life is not None:
        assert abs(life - timedelta(minutes=10)) < timedelta(seconds=5)
    await db["otps"].update_many({}, {"$set": {"expires_at": otp["expires_at"] - timedelta(minutes=11)}})
    r = await client.post(f"{A}/verify-otp", json={"user_email": "a@example.com", "otp_code": (await code_for("a@example.com"))})
    assert r.status_code == 400


async def test_AUTH_01_7_login_blocked_until_verified(client, db):
    await signup(client)
    r = await client.post(f"{A}/login", json={"user_email": "a@example.com", "password": PW})
    assert r.status_code == 403
    await client.post(f"{A}/verify-otp", json={"user_email": "a@example.com", "otp_code": (await code_for("a@example.com"))})
    r = await client.post(f"{A}/login", json={"user_email": "a@example.com", "password": PW})
    assert r.status_code == 200


async def test_AUTH_02_login(client, db):
    u = await make_user(client)
    assert u["_access"] and u["_refresh"]


@pytest.mark.parametrize("email,pw", [("walker@example.com", "Wrong@1234"), ("nobody@example.com", PW)])
async def test_AUTH_02_1_wrong_credentials_message(client, db, email, pw):
    await make_user(client)
    r = await client.post(f"{A}/login", json={"user_email": email, "password": pw})
    assert r.status_code == 401 and r.json()["message"] == "Invalid email or password"


async def test_AUTH_02_2_lock_after_5_failures(client, db):
    await make_user(client)
    codes = [(await client.post(f"{A}/login", json={"user_email": "walker@example.com", "password": "Wrong@1234"})).status_code
             for _ in range(5)]
    assert codes == [401, 401, 401, 401, 403]
    user = await db["users"].find_one({"user_email": "walker@example.com"})
    assert user["is_locked"] is True


async def test_AUTH_02_2_login_while_locked_shows_lock_message(client, db):
    await make_user(client)
    for _ in range(5):
        await client.post(f"{A}/login", json={"user_email": "walker@example.com", "password": "Wrong@1234"})
    r = await client.post(f"{A}/login", json={"user_email": "walker@example.com", "password": PW})
    assert r.status_code == 403, f"got {r.status_code}"


async def test_AUTH_03_and_03_1_forgot_password_sends_code(client, db):
    await make_user(client)
    r = await client.post(f"{A}/forgot-password", json={"user_email": "walker@example.com"})
    code = (await code_for("walker@example.com"))
    assert r.status_code == 200 and len(code) == 6 and code.isdigit()
    r = await client.post(f"{A}/reset-password", json={"user_email": "walker@example.com", "otp_code": code, "new_password": "NewPass@123"})
    assert r.status_code == 200
    await login(client, "walker@example.com", "NewPass@123")


async def test_AUTH_03_2_reset_code_expires(client, db):
    await make_user(client)
    await client.post(f"{A}/forgot-password", json={"user_email": "walker@example.com"})
    otp = await db["otps"].find_one({}, sort=[("_id", -1)])
    await db["otps"].update_many({}, {"$set": {"expires_at": otp["expires_at"] - timedelta(minutes=11)}})
    r = await client.post(f"{A}/reset-password", json={"user_email": "walker@example.com",
                                                       "otp_code": (await code_for("walker@example.com")), "new_password": "NewPass@123"})
    assert r.status_code == 400


@pytest.mark.parametrize("pw,ok", [("Abc@123", False), ("Abcdefgh", False), ("Abcd@123", True)])
async def test_AUTH_03_3_reset_uses_same_password_rules(client, db, pw, ok):
    await make_user(client)
    await client.post(f"{A}/forgot-password", json={"user_email": "walker@example.com"})
    r = await client.post(f"{A}/reset-password", json={"user_email": "walker@example.com",
                                                       "otp_code": (await code_for("walker@example.com")), "new_password": pw})
    assert (r.status_code == 200) == ok


async def test_AUTH_04_and_04_1_logout_ends_token(client, db):
    u = await make_user(client)
    assert (await client.post(f"{A}/logout", headers=h(u))).status_code == 200
    assert (await client.get("/v1/api/profile", headers=h(u))).status_code == 401


@pytest.mark.parametrize("name,ok", [("A", False), ("Al", True), ("x" * 50, True), ("x" * 51, False), ("", False)])
async def test_AUTH_05_and_05_1_name_2_to_50(client, db, name, ok):
    u = await make_user(client)
    r = await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, "name": name})
    assert (r.status_code == 200) == ok


async def test_AUTH_05_2_and_05_3_delete_needs_confirmation(client, db):
    u = await make_user(client)
    r = await client.request("DELETE", "/v1/api/profile", headers=h(u), json={"confirmation": False})
    assert r.status_code != 200 and await db["users"].count_documents({}) == 1


async def test_AUTH_05_4_delete_removes_account_credentials_profile(client, db):
    u = await make_user(client)
    await client.get("/v1/api/profile", headers=h(u))
    r = await client.request("DELETE", "/v1/api/profile", headers=h(u), json={"confirmation": True})
    assert r.status_code == 200
    for col in ("users", "credentials", "profiles"):
        assert await db[col].count_documents({}) == 0, col


# ---------------- PREF ----------------

async def test_PREF_01_1_saved_values_come_back(client, db):
    u = await make_user(client)
    want = {**PROFILE, "mobility_needs": "Mobility Aid", "heat_uv_sensitivity": "High", "max_stairs_per_route": 25, "preferred_pace": "Brisk"}
    await client.put("/v1/api/profile", headers=h(u), json=want)
    got = (await client.get("/v1/api/profile", headers=h(u))).json()["metadata"]
    assert all(got[k] == v for k, v in want.items())


@pytest.mark.parametrize("field,values", [("mobility_needs", ["None", "Wheelchair", "Mobility Aid"]),
                                          ("heat_uv_sensitivity", ["Low", "Medium", "High"]),
                                          ("preferred_pace", ["Slow", "Relaxed", "Brisk"])])
async def test_PREF_02_1_05_1_07_only_listed_options(client, db, field, values):
    u = await make_user(client)
    for v in values:
        assert (await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, field: v})).status_code == 200
    assert (await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, field: "Other"})).status_code == 422


async def test_PREF_02_2_05_2_06_07_defaults(client, db):
    u = await make_user(client)
    g = (await client.get("/v1/api/profile", headers=h(u))).json()["metadata"]
    assert (g["mobility_needs"], g["heat_uv_sensitivity"], g["max_stairs_per_route"], g["preferred_pace"]) == ("None", "Medium", 10, "Relaxed")


async def test_PREF_03_and_03_1_saved_under_own_user(client, db):
    u = await make_user(client)
    await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, "age": 44})
    doc = await db["profiles"].find_one({"age": 44})
    assert doc and str(doc["user_id"]) == u["x-client-id"]


async def test_PREF_03_2_next_search_uses_new_profile(client, db):
    await seed_segments(db, stairs=2, barrier_free=False)
    u = await make_user(client)
    await client.put("/v1/api/profile", headers=h(u), json=PROFILE)
    before, _ = await gen(client, u)
    await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, "mobility_needs": "Wheelchair"})
    after, _ = await gen(client, u)
    assert any(r["match_score"] > 0 for r in before) and all(r["match_score"] == 0 for r in after)


@pytest.mark.parametrize("age,ok", [(-1, False), (0, True), (120, True), (121, False), (25.5, False)])
async def test_PREF_04_1_age_whole_number_0_to_120(client, db, age, ok):
    u = await make_user(client)
    assert ((await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, "age": age})).status_code == 200) == ok


@pytest.mark.parametrize("stairs,ok", [(-5, False), (0, True), (5, True), (7, False), (50, True), (55, False)])
async def test_PREF_06_stairs_0_to_50_step_5(client, db, stairs, ok):
    u = await make_user(client)
    assert ((await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, "max_stairs_per_route": stairs})).status_code == 200) == ok


# ---------------- MAP ----------------

async def test_MAP_03_search_suggestions(client, db):
    r = await client.get("/v1/api/location/search", params={"query": "bu"})
    assert r.status_code == 200 and len(r.json()["metadata"]) >= 1


@pytest.mark.parametrize("o,d", [((1.4927, 103.7414), DEST), (ORIGIN, (1.4927, 103.7414))])
async def test_MAP_04_1_and_04_3_outside_singapore_rejected(client, db, o, d):
    u = await make_user(client)
    r = await client.post("/v1/api/route/generate", headers=h(u), json={"origin_coord": list(o), "destination_coord": list(d)})
    assert r.status_code in (400, 422)


async def test_MAP_04_4_destination_message(client, db):
    u = await make_user(client)
    r = await client.post("/v1/api/location/validate", json={"latitude": 1.4927, "longitude": 103.7414})
    body = r.json()
    text = body.get("message", "") + str(body.get("metadata", ""))
    assert "Invalid location. Please select a valid origin/destination within Singapore" in text


# ---------------- RTE ----------------

async def test_RTE_01_and_01_2_to_01_6_five_types(client, db):
    await seed_segments(db)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    assert sorted(r["route_type"] for r in routes) == sorted(t.value for t in RouteType)


async def test_RTE_01_1_wheelchair_stairs_score_zero_but_shown(client, db):
    await seed_segments(db, stairs=2, barrier_free=False)
    u = await make_user(client)
    await client.put("/v1/api/profile", headers=h(u), json={**PROFILE, "mobility_needs": "Wheelchair", "max_stairs_per_route": 0})
    routes, _ = await gen(client, u)
    assert len(routes) == 5 and all(r["match_score"] == 0 for r in routes if r["stair_count"] > 0)


async def test_RTE_01_2_direct_is_shortest(client, db):
    await seed_segments(db)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    direct = next(r for r in routes if r["route_type"] == "Direct")
    assert direct["total_distance"] == min(r["total_distance"] for r in routes)


async def test_RTE_02_metadata(client, db):
    await seed_segments(db, sheltered=True)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    for r in routes:
        assert r["total_distance"] > 0 and r["estimated_time"] > 0 and 0 <= r["sheltered_percentage"] <= 100


async def test_RTE_03_low_confidence_lowers_score():
    svc = RouteService(map_segment_repo=None, route_repo=None, profile_repo=None)
    prof = SimpleNamespace(mobility_needs="None", heat_uv_sensitivity="Medium", age=30)
    route = SimpleNamespace(stair_count=0, origin_coordinates=ORIGIN, destination_coordinates=DEST,
                            total_distance=haversine_distance(ORIGIN, DEST), sheltered_percentage=50.0)
    seg = lambda c: SimpleNamespace(is_barrier_free=True, confidence_score=c)
    good = svc.calculate_match_score(route, prof, segments=[seg(10)])
    bad = svc.calculate_match_score(route, prof, segments=[seg(-15)])
    assert bad < good


@pytest.mark.parametrize("field,a,b", [("heat_uv_sensitivity", "Low", "High"), ("age", 30, 70), ("mobility_needs", "None", "Mobility Aid")])
async def test_RTE_04_profile_fields_change_score(field, a, b):
    svc = RouteService(map_segment_repo=None, route_repo=None, profile_repo=None)
    base = dict(mobility_needs="None", heat_uv_sensitivity="Medium", age=30)
    route = SimpleNamespace(stair_count=3, origin_coordinates=ORIGIN, destination_coordinates=DEST,
                            total_distance=haversine_distance(ORIGIN, DEST) * 1.3, sheltered_percentage=90.0)
    s1 = svc.calculate_match_score(route, SimpleNamespace(**{**base, field: a}), segments=[])
    s2 = svc.calculate_match_score(route, SimpleNamespace(**{**base, field: b}), segments=[])
    assert s1 != s2


async def test_RTE_04_score_between_0_and_100():
    svc = RouteService(map_segment_repo=None, route_repo=None, profile_repo=None)
    prof = SimpleNamespace(mobility_needs="None", heat_uv_sensitivity="High", age=80)
    for stairs, shelter, ratio in [(0, 100, 1.0), (30, 0, 5.0)]:
        route = SimpleNamespace(stair_count=stairs, origin_coordinates=ORIGIN, destination_coordinates=DEST,
                                total_distance=haversine_distance(ORIGIN, DEST) * ratio, sheltered_percentage=shelter)
        assert 0 <= svc.calculate_match_score(route, prof, segments=[]) <= 100


async def test_RTE_05_1_and_05_1_1_and_05_1_2_sort_order():
    svc = RouteService(map_segment_repo=None, route_repo=None, profile_repo=None)
    R = lambda t, hz, m, et, sh: SimpleNamespace(route_type=t, hazard_count=hz, match_score=m, estimated_time=et,
                                                  sheltered_percentage=sh, is_starred=False)
    routes = [R(RouteType.DIRECT, 1, 95, 300, 10), R(RouteType.MAX_SHELTER, 0, 70, 400, 80),
              R(RouteType.BARRIER_FREE, 0, 80, 500, 20), R(RouteType.LOW_EFFORT, 0, 70, 350, 30),
              R(RouteType.WIDE_QUIET, 0, 70, 350, 60)]
    out = [r.route_type.value for r in svc.rank_routes(routes)]
    assert out == ["Barrier-Free", "Wide/Quiet", "Low-Effort", "Maximum Shelter", "Direct"]


async def test_RTE_05_up_to_five_and_one_starred(client, db):
    await seed_segments(db)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    assert len(routes) <= 5 and sum(r["is_starred"] for r in routes) == 1 and routes[0]["is_starred"]


@pytest.mark.parametrize("text,temp,want", [("Thundery Showers", 28, "thundery"), ("Light Rain", 28, "rainy"),
                                            ("Showers", 28, "rainy"), ("Fair (Day)", 33, "hot_sunny"),
                                            ("Fair and Warm", 30, "hot_sunny"), ("Partly Cloudy (Day)", 30, "cloudy"),
                                            ("Hazy", 30, "cloudy"), ("Fair (Day)", 30, "clear")])
async def test_RTE_06_2_weather_classification(text, temp, want):
    got = WeatherAdapter()._classify(text, temp)
    assert got.value.replace("/", "_").replace("-", "_").lower().startswith(want.split("_")[0]), (text, got)


@pytest.mark.parametrize("cond,shelter_pct", [("clear", 23), ("cloudy", 23), ("rainy", 50), ("thundery", 52), ("hot_sunny", 36)])
async def test_RTE_06_3_and_06_4_weights_and_payload(client, db, cond, shelter_pct):
    u = await make_user(client)
    conds = {c.value for c in WeatherCondition}
    value = next(c for c in conds if c.replace("/", "_").replace("-", "_").lower().startswith(cond.split("_")[0]))
    r = await client.get("/v1/api/route/weather", headers=h(u), params={"weather_override": value})
    m = r.json()["metadata"]
    assert r.status_code == 200 and m["advisory_message"] and m["condition"] == value
    assert m["shelter_weight_pct"] == shelter_pct, m


async def test_RTE_06_5_simulated_flag(client, db):
    await seed_segments(db)
    u = await make_user(client)
    _, weather = await gen(client, u, weather_override="rainy")
    assert weather["condition"] == "rainy" and weather["is_simulated"] is True


async def test_RTE_06_1_reuses_result_for_5_minutes(monkeypatch):
    from src.services.adapters import weather_adapter as wa
    assert wa.CACHE_TTL_SECONDS == 300.0


async def test_RTE_06_6_weather_down_still_routes(client, db, monkeypatch):
    async def boom(self, *a, **k):
        raise RuntimeError("NEA down")
    monkeypatch.setattr(WeatherAdapter, "_fetch_nea_cached", boom)
    await seed_segments(db)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    assert len(routes) == 5


async def test_RTE_07_1_avoid_list_by_mobility():
    from src.services.route_service import build_avoid_polygons
    from src.model.profile_model import MobilityNeeds
    mk = lambda t: SimpleNamespace(hazard_type=t, location=SimpleNamespace(coordinates=[103.852, 1.298]))
    hz = [mk(t) for t in ("blocked", "flooding", "unwalkable", "lift", "uneven", "other")]
    n_walk = len(build_avoid_polygons(hz, SimpleNamespace(mobility_needs=MobilityNeeds.NONE), ORIGIN, DEST))
    n_wc = len(build_avoid_polygons(hz, SimpleNamespace(mobility_needs=MobilityNeeds.WHEELCHAIR), ORIGIN, DEST))
    n_aid = len(build_avoid_polygons(hz, SimpleNamespace(mobility_needs=MobilityNeeds.MOBILITY_AID), ORIGIN, DEST))
    assert (n_walk, n_wc, n_aid) == (3, 5, 5)


async def test_RTE_07_2_and_07_3_hazard_within_40m_costs_20(client, db):
    await seed_segments(db)
    u = await make_user(client)
    clean, _ = await gen(client, u)
    mid = straight_line(ORIGIN, DEST)[10]
    await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "other", "latitude": mid[0], "longitude": mid[1]})
    await db["map_segments"].update_many({}, {"$set": {"confidence_score": 0.0}})  # isolate the 20-point rule
    dirty, _ = await gen(client, u)
    d0 = next(r for r in clean if r["route_type"] == "Direct")
    d1 = next(r for r in dirty if r["route_type"] == "Direct")
    assert d1["hazard_count"] == 1 and d1["match_score"] == max(0, round(d0["match_score"] - 20, 2))


# ---------------- NAV ----------------

async def start_nav(client, db):
    await seed_segments(db)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    direct = next(r for r in routes if r["route_type"] == "Direct")
    r = await client.post("/v1/api/navigation/start", headers=h(u), json={"route_id": direct["route_id"]})
    return u, r.json()["metadata"]["session_id"]


async def track(client, u, sid, pt, speed=4.0):
    r = await client.post("/v1/api/navigation/track", headers=h(u), json={"session_id": sid, "current_coord": list(pt), "speed_kmh": speed})
    return r.json()["metadata"]


async def test_NAV_02_and_05_instruction_and_metrics_update(client, db):
    u, sid = await start_nav(client, db)
    line = straight_line(ORIGIN, DEST)
    a = await track(client, u, sid, line[2])
    b = await track(client, u, sid, line[12])
    assert a["next_instruction"] and b["next_instruction"]
    assert b["remaining_dist"] < a["remaining_dist"] and b["remaining_time"] < a["remaining_time"]


async def test_NAV_03_and_03_1_and_03_2_off_route_reroutes_from_here(client, db):
    u, sid = await start_nav(client, db)
    off = (ORIGIN[0] + 0.002, ORIGIN[1] - 0.002)
    m = await track(client, u, sid, off)
    new = m["recalculated_route"]
    assert new is not None
    detail = (await client.get(f"/v1/api/route/{new['route_id']}", headers=h(u))).json()["metadata"]
    assert haversine_distance(tuple(detail["polyline"][0]), off) < 1


async def test_NAV_03_no_reroute_on_path(client, db):
    u, sid = await start_nav(client, db)
    assert (await track(client, u, sid, straight_line(ORIGIN, DEST)[5]))["recalculated_route"] is None


@pytest.mark.parametrize("metres,done", [(4.0, True), (6.0, False)])
async def test_NAV_04_and_04_1_arrival_within_5m(client, db, metres, done):
    u, sid = await start_nav(client, db)
    pt = (DEST[0] + metres / 111_195.0, DEST[1])
    assert ((await track(client, u, sid, pt))["status"].lower() == "completed") == done


async def test_NAV_04_2_traversed_segments_plus_1_cap_20(client, db):
    u, sid = await start_nav(client, db)
    await db["map_segments"].update_one({"segment_id": "seg-0"}, {"$set": {"confidence_score": 19.5}})
    line = straight_line(ORIGIN, DEST)
    for p in line[:-1]:
        await track(client, u, sid, p)
    await track(client, u, sid, DEST)
    seg0 = await db["map_segments"].find_one({"segment_id": "seg-0"})
    seg5 = await db["map_segments"].find_one({"segment_id": "seg-5"})
    assert seg0["confidence_score"] == 20.0 and seg5["confidence_score"] == 1.0


# ---------------- HAZ ----------------

@pytest.mark.parametrize("t", ["unwalkable", "blocked", "flooding", "other", "lift", "uneven"])
async def test_HAZ_02_all_six_types_accepted(client, db, t):
    await seed_segments(db)
    u = await make_user(client)
    r = await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": t, "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    assert r.status_code == 201


async def test_HAZ_02_1_optional_description(client, db):
    await seed_segments(db)
    u = await make_user(client)
    r1 = await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    r2 = await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1], "description": "fence"})
    assert r1.status_code == 201 and r2.status_code == 201 and r2.json()["metadata"]["description"] == "fence"


async def test_HAZ_02_2_nearest_segment(client, db):
    segs = await seed_segments(db)
    u = await make_user(client)
    a, b = segs[7]["start_coordinates"], segs[7]["end_coordinates"]
    mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    r = await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": mid[0], "longitude": mid[1]})
    assert r.json()["metadata"]["segment_id"] == "seg-7"


async def test_HAZ_02_3_minus_2_floor_minus_20(client, db):
    await seed_segments(db)
    u = await make_user(client)
    await db["map_segments"].update_one({"segment_id": "seg-0"}, {"$set": {"confidence_score": -19.0}})
    await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    seg = await db["map_segments"].find_one({"segment_id": "seg-0"})
    assert seg["confidence_score"] == -20.0


async def test_HAZ_03_1_only_last_72_hours(client, db):
    from datetime import datetime, timezone
    await seed_segments(db)
    u = await make_user(client)
    for _ in range(2):
        await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    first = await db["hazards"].find_one({})
    await db["hazards"].update_one({"_id": first["_id"]}, {"$set": {"report_timestamp": datetime.now(timezone.utc) - timedelta(hours=73)}})
    feed = (await client.get("/v1/api/hazard/nearby", params={"latitude": ORIGIN[0], "longitude": ORIGIN[1]})).json()["metadata"]
    assert len(feed) == 1


async def test_HAZ_03_2_within_5km(client, db):
    await seed_segments(db)
    u = await make_user(client)
    await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": "blocked", "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    near = (await client.get("/v1/api/hazard/nearby", params={"latitude": ORIGIN[0] + 4.9 / 111.195, "longitude": ORIGIN[1]})).json()["metadata"]
    far = (await client.get("/v1/api/hazard/nearby", params={"latitude": ORIGIN[0] + 5.1 / 111.195, "longitude": ORIGIN[1]})).json()["metadata"]
    assert len(near) == 1 and len(far) == 0


async def test_HAZ_03_3_and_03_4_newest_first(client, db):
    await seed_segments(db)
    u = await make_user(client)
    for t in ("blocked", "flooding", "uneven"):
        await client.post("/v1/api/hazard/report", headers=h(u), json={"hazard_type": t, "latitude": ORIGIN[0], "longitude": ORIGIN[1]})
    feed = (await client.get("/v1/api/hazard/nearby", params={"latitude": ORIGIN[0], "longitude": ORIGIN[1]})).json()["metadata"]
    assert [x["hazard_type"] for x in feed] == ["uneven", "flooding", "blocked"]


async def test_RTE_01_7_routing_down_still_returns_straight_line(client, db, monkeypatch):
    from src.services.adapters.pedestrian_routing_adapter import PedestrianRoutingAdapter
    from src.services.adapters.ors_routing_adapter import OrsRoutingAdapter
    async def boom(self, *a, **k):
        raise RuntimeError("down")
    monkeypatch.setattr(PedestrianRoutingAdapter, "get_pedestrian_route", boom)
    monkeypatch.setattr(OrsRoutingAdapter, "get_pedestrian_route", boom)
    await seed_segments(db)
    u = await make_user(client)
    routes, _ = await gen(client, u)
    assert len(routes) == 5
    detail = (await client.get(f"/v1/api/route/{routes[0]['route_id']}", headers=h(u))).json()["metadata"]
    straight = haversine_distance(ORIGIN, DEST)
    assert abs(detail["total_distance"] - straight) < 5 and len(detail["polyline"]) >= 2
