"""SRS 3.4 Network Resiliency: timeouts, attempts and delays of outside calls."""
import asyncio, httpx, pytest
from src.services.adapters import onemap_adapter, pedestrian_routing_adapter, weather_adapter, ors_routing_adapter
from src.services.adapters.onemap_adapter import OneMapAdapter
from src.services.adapters.pedestrian_routing_adapter import PedestrianRoutingAdapter
from src.services.adapters.weather_adapter import WeatherAdapter

pytestmark = pytest.mark.asyncio(loop_scope="session")

def spy(monkeypatch):
    calls, sleeps, timeouts = [], [], []
    real_init = httpx.AsyncClient.__init__
    def init(self, *a, **k):
        timeouts.append(k.get("timeout")); real_init(self, *a, **k)
    async def get(self, url, **k):
        calls.append(url); raise httpx.ConnectError("down")
    async def fake_sleep(s): sleeps.append(round(s, 2))
    monkeypatch.setattr(httpx.AsyncClient, "__init__", init)
    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    monkeypatch.setattr(asyncio, "sleep", fake_sleep)
    return calls, sleeps, timeouts

async def test_onemap(monkeypatch):
    monkeypatch.undo()  # remove conftest fake search
    calls, sleeps, timeouts = spy(monkeypatch)
    with pytest.raises(Exception):
        await OneMapAdapter().search(query="bugis")
    print("\n[OneMap]", timeouts, len(calls), sleeps)
    assert timeouts == [3.0] and len(calls) == 3 and sleeps == [0.2, 0.4]

async def test_osrm(monkeypatch):
    monkeypatch.undo()
    calls, sleeps, timeouts = spy(monkeypatch)
    with pytest.raises(Exception):
        await PedestrianRoutingAdapter().get_pedestrian_route(origin_coord=(1.29, 103.85), destination_coord=(1.30, 103.85))
    print("\n[OSRM]", timeouts, len(calls), sleeps)
    assert timeouts == [3.0] and len(calls) == 6 and sleeps == [0.2, 0.4, 0.2, 0.4]

async def test_ors_settings():
    a = ors_routing_adapter.OrsRoutingAdapter(api_key="k")
    print("\n[ORS] timeout", a._timeout)
    assert a._timeout == 8.0

async def test_nea(monkeypatch):
    monkeypatch.undo()
    WeatherAdapter._cache_payload = None
    calls, sleeps, timeouts = spy(monkeypatch)
    snap = await WeatherAdapter().get_weather((1.29, 103.85))
    print("\n[NEA]", timeouts, len(calls), snap.condition)
    assert timeouts == [2.5] and len(calls) == 2 and snap.condition == "clear"

async def test_ors_falls_back_to_osrm(monkeypatch):
    monkeypatch.undo()
    calls = []
    async def post(self, url, **k):
        calls.append(("ors", url)); raise httpx.ConnectError("ORS down")
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    class FakeOsrm:
        async def get_pedestrian_route(self, **k):
            calls.append(("osrm", None)); return ["osrm-route"]
    a = ors_routing_adapter.OrsRoutingAdapter(api_key="k", fallback_adapter=FakeOsrm())
    out = await a.get_pedestrian_route(origin_coord=(1.29, 103.85), destination_coord=(1.30, 103.85))
    print("\n[ORS fallback]", [c[0] for c in calls], out)
    assert [c[0] for c in calls] == ["ors", "osrm"] and out == ["osrm-route"]
