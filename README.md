# Feature 4: 5-Route Variant Scoring & Ranking Engine

Implements `PLAN.md` §5 — the `/v1/api/route` endpoints of the WalkingSG backend.
Delivered as 11 atomic vertical-MVC stages, each with its own tests and conventional commit.

## Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| POST | `/v1/api/route/generate` | Generate, score, rank and persist 5 route variants | 200 `RouteSearchOut` |
| GET | `/v1/api/route/{route_id}` | Route detail with polyline and steps | 200 `RouteDetailOut`, 404 on miss |

Both endpoints are on a private router (`authentication_v2` dependency) and return the
standard `SuccessResponse` envelope (`message`, `status`, `metadata`).

## Route Variants

Five strategies registered in a `RouteFactory` registry (Stage 5):

`Maximum Shelter` · `Barrier-Free` · `Low-Effort` · `Wide/Quiet` · `Direct`

- **Barrier-Free** strictly filters segments with `confidence_score < -10` or `stair_count > 0`;
  an empty selection falls back to a straight-line origin-to-destination route.
- **Wide/Quiet** selects segments with `confidence_score >= 0`.

## Scoring (PLAN §5.5)

```
Match_Score = G × (w_eff × S_eff + w_shelter × S_shelter + w_effort × S_effort + w_conf × S_conf)
```

- **Gate G = 0** when the profile is `Wheelchair` and stairs/curbs are present
  (`stair_count > 0` or any segment `is_barrier_free == False`), otherwise `G = 1`.
- **S_eff** = `clamp(100 × direct_distance / total_distance, 0, 100)`
- **S_shelter** = `clamp(sheltered_percentage, 0, 100)`
- **S_effort** = `clamp(100 − stair_count × 10, 0, 100)`
- **S_conf** = `clamp((avg_confidence + 20) / 40 × 100, 0, 100)`, neutral 50 with no segments
- **Weights** start at `{efficiency .30, shelter .25, effort .25, confidence .20}`, are adjusted
  by profile attributes (High heat → shelter +.20; Wheelchair/Mobility Aid → effort +.20;
  Brisk → efficiency +.10; Slow → effort +.10) and passed through `normalize_weights`.
- Final score clamped to 0–100, rounded to 2 decimals.

## Ranking

Single composite sort key:

1. `match_score` descending
2. `estimated_time` ascending (shorter wins)
3. `sheltered_percentage` descending
4. Fixed type order: Maximum Shelter → Barrier-Free → Low-Effort → Wide/Quiet → Direct

The top route is flagged `is_starred = True`; all others reset to `False`.

## Validation

- Both coordinates must pass `is_within_singapore` (added in Stage 2 for reuse by Feature 3),
  otherwise `400 Bad Request` with the PLAN §4.4 message.
- Request DTO uses `extra="forbid"` with lat/lng range validators (422 on malformed input).
- Missing profile is created with defaults, so new users still get base weights.

## Architecture (strict 5-layer dependency)

```
routes → controllers → services → repositories → models
schemas are imported downward; no try/except in controllers
```

- DI: `get_route_service` provider + `RouteServiceDep` inside the controller module
  (matches the existing `ProfileController` style).
- Repositories are keyword-only, returning `None` / `[]` on misses.
- `calculate_match_score` and `rank_routes` are pure sync methods; `generate_routes` and
  `find_route` are async and own all DB access.

## Stages & Commits

| # | Commit | Contents |
|---|--------|----------|
| 1 | `feat(backend): add route models and document registration` | `RouteModel`, `RouteType`, `MapSegmentModel` |
| 2 | `feat(backend): add route scoring utilities` | `haversine_distance`, `clamp`, `normalize_weights`, `is_within_singapore` |
| 3 | `feat(backend): add map segment and route repositories` | bbox query, order-preserving `find_by_ids`, nearest coord |
| 4 | `feat(backend): add route schemas` | `RouteSearchRequest`, `RouteVariantSummary`, `RouteSearchOut`, `RouteDetailOut` |
| 5 | `feat(backend): add route strategy factory and variants` | `BaseRouteStrategy`, `RouteFactory`, 5 strategies |
| 6 | `feat(backend): add route match score calculation` | gate, components, profile-driven weights |
| 7 | `feat(backend): add route ranking with tie breakers` | composite sort, star flag |
| 8 | `feat(backend): add route generation orchestration` | bounds check, profile, bbox, 5 strategies, persist |
| 9 | `feat(backend): add route detail lookup` | `find_route` with `NotFoundError` |
| 10 | `feat(backend): add route controller and routes` | controller, private router, mounting |
| 11 | `feat(backend): add route postman tests and endpoint verification` | `.http` files, full suite run |

## Verification

**125 tests passing** (45 added by this feature's test files across all stages).

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Test layers: models, utilities, repositories, schemas, strategies, scoring/ranking/service
orchestration, and end-to-end endpoint tests (auth 401, bounds 400, malformed id 422,
miss 404, success 200 envelope checks).

Postman: `postman/route_generate.post.http`, `postman/route_find.get.http`.

## Known Limitations

- `origin_name` / `destination_name` are placeholders (`"Origin"` / `"Destination"`);
  reverse geocoding arrives with Feature 3's OneMap adapter.
- `find_route` has no ownership check — PLAN §5.4 does not specify one.
