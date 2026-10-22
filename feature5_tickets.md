# Feature 5 — Turn-by-Turn Live Navigation & Maneuver Tracking: Tickets Specification

> **Branch:** `Huy/test-benjamin-feature-4` (or `Huy/feature-5-live-navigation`)  
> **Architecture Standard:** Strictly follows `BE_RULES.md` (FastAPI 5-layer downward dependencies) and `architecture-context.md`.  
> **Source Plan:** `PLAN.md` Section 6 ("Live Navigation Session Tracking (`/v1/api/navigation`)").

---

## Ticket Overview & Execution Pipeline

```text
Backend Slice:
  Ticket 1: Navigation Session Model & Repository Layer (Beanie ODM + MongoDB)
  Ticket 2: Navigation Schemas (Pydantic View Layer DTOs)
  Ticket 3: Navigation Geometry & Progress Tracking Utilities (Pure Functions)
  Ticket 4: Navigation Service (Business Logic: Speed Warning, Arrival, Off-Route Rerouting, Score Increment)
  Ticket 5: Navigation Controller, Router Wiring & Postman Integration (.http)

Frontend Slice:
  Ticket 6: Mobile Navigation Types, Service Client & AppContext Integration
  Ticket 7: Mobile Screen Wiring (RouteExpandedScreen & NavActiveScreen Live Guidance HUD)
```

---

## Ticket 1 — Navigation Session Model & Repository Layer

**Layer:** `src/model/navigation_session_model.py`, `src/model/repository/navigation_session_repo.py`, `src/model/__init__.py`

**Objective:** Define the MongoDB schema for tracking live navigation sessions and implement an isolated data access repository with keyword-only arguments.

**Specifications:**
1. **Model (`NavigationSessionModel`):**
   - Subclasses Beanie `Document`.
   - `COLLECTION_NAME = "navigation_sessions"`.
   - Fields:
     - `user_id: PydanticObjectId` (indexed `ASCENDING`)
     - `route_id: PydanticObjectId`
     - `current_location: tuple[float, float]` (latitude, longitude)
     - `traversed_segment_ids: list[str] = []`
     - `session_status: NavigationStatus` (StrEnum: `ACTIVE`, `COMPLETED`, `CANCELLED`, indexed `ASCENDING`)
     - `started_at: datetime = Field(default_factory=utc_now)`
     - `ended_at: datetime | None = None`
     - `updated_at: datetime = Field(default_factory=utc_now)`
   - Register in `src/model/__init__.py` under `DOCUMENT_MODELS`.

2. **Repository (`NavigationSessionRepository`):**
   - Strictly keyword-only arguments (`*`).
   - `create(*, session: NavigationSessionModel) -> NavigationSessionModel`
   - `find_by_id(*, session_id: PydanticObjectId) -> NavigationSessionModel | None`
   - `find_active_by_user(*, user_id: PydanticObjectId) -> NavigationSessionModel | None`
   - `update_location(*, session: NavigationSessionModel, current_location: tuple[float, float]) -> NavigationSessionModel`
   - `append_traversed_segment(*, session: NavigationSessionModel, segment_id: str) -> NavigationSessionModel`
   - `complete_session(*, session: NavigationSessionModel, status: NavigationStatus) -> NavigationSessionModel`

**Files:**
- Create: `src/model/navigation_session_model.py`
- Create: `src/model/repository/navigation_session_repo.py`
- Update: `src/model/__init__.py`
- Create: `tests/model/test_navigation_session_model.py`

**Success Measures:**
- Model passes Beanie initialization cleanly.
- Unit tests verify CRUD lifecycle, timestamp updates, and index configuration.

---

## Ticket 2 — Navigation Schemas (View Layer DTO Contracts)

**Layer:** `src/schemas/navigation_schema.py`

**Objective:** Define strict Pydantic v2 request/response contracts for live navigation endpoints.

**Specifications:**
1. Inherit from `BaseRequest` (`extra="forbid"`) and `BaseResponse` (`from_attributes=True`).
2. Coordinate validation helper ensures latitude $\in [-90, 90]$ and longitude $\in [-180, 180]$.
3. DTO Classes:
   - `NavStartRequest`:
     - `route_id: str`
   - `NavStartOut`:
     - `session_id: str`
     - `status: str`
   - `NavTrackRequest`:
     - `session_id: str`
     - `current_coord: tuple[float, float]`
     - `speed_kmh: float` (must be $\ge 0.0$)
   - `NavTrackOut`:
     - `status: str` (`ACTIVE`, `COMPLETED`, `CANCELLED`)
     - `motion_warning: bool`
     - `next_instruction: str`
     - `remaining_dist: float` (meters)
     - `remaining_time: int` (seconds)
     - `recalculated_route: RouteVariantSummary | None = None`
   - `NavEndRequest`:
     - `session_id: str`
     - `manual_cancel: bool = False`
   - `NavEndOut`:
     - `session_id: str`
     - `status: str`

**Files:**
- Create: `src/schemas/navigation_schema.py`
- Create: `tests/schemas/test_navigation_schema.py`

**Success Measures:**
- Rejects unexpected extra payload attributes.
- Rejects out-of-bound coordinates or negative speeds.
- Type serializes cleanly into `SuccessResponse[T]`.

---

## Ticket 3 — Navigation Geometry & Progress Tracking Utilities

**Layer:** `src/utils/index.py`

**Objective:** Implement pure, stateless geometry calculation helpers for real-time map matching, off-route deviation detection, and remaining distance/time estimation.

**Specifications:**
1. Pure functions with zero I/O and zero upward imports:
   - `point_to_segment_distance(point: tuple[float, float], seg_start: tuple[float, float], seg_end: tuple[float, float]) -> float`  
     Computes perpendicular distance in meters from GPS coordinate to line segment.
   - `distance_to_polyline(point: tuple[float, float], polyline: list[list[float]]) -> float`  
     Finds the minimum distance in meters between user point and polyline edges.
   - `calculate_route_progress(current_coord: tuple[float, float], polyline: list[list[float]], steps: list[str], total_distance: float, estimated_time: int) -> tuple[float, int, str]`  
     Finds nearest polyline vertex index; computes remaining distance (meters), remaining time (seconds based on walking pace ratio), and active next maneuver instruction.

**Files:**
- Update: `src/utils/index.py`
- Create: `tests/utils/test_navigation_utils.py`

**Success Measures:**
- Correctly identifies perpendicular and vertex-endpoint distances.
- Detects deviation $> 20.0$m accurately against standard path coordinates.
- Remaining distance monotonically approaches 0 as user progresses along polyline.

---

## Ticket 4 — Navigation Service (Business Logic Layer)

**Layer:** `src/services/navigation_service.py`

**Objective:** Implement pure domain business rules orchestrating live navigation sessions, speed safety thresholds, destination arrival, and off-route recalculation.

**Specifications:**
1. **Class `NavigationService` constructor:**
   ```python
   def __init__(
       self,
       session_repo: NavigationSessionRepository,
       route_repo: RouteRepository,
       map_segment_repo: MapSegmentRepository,
       route_service: RouteService,
   ) -> None:
   ```

2. **Core Domain Methods:**
   - `start_navigation(user_id: PydanticObjectId, payload: NavStartRequest) -> NavStartOut`:
     - Verifies route exists in `_route_repo`.
     - Automatically terminates any existing active session for the user (`status = CANCELLED`).
     - Creates new active `NavigationSessionModel`.
   - `track_position(user_id: PydanticObjectId, payload: NavTrackRequest) -> NavTrackOut`:
     - Fetches active session; verifies ownership (`session.user_id == user_id`). Raises `NotFoundError` / `ForbiddenError` if invalid.
     - **Rule 1: Speed Safety Check:** If `speed_kmh > 25.0`, set `motion_warning = True` (per `PLAN.md` 6.3).
     - **Rule 2: Arrival Check:** If `haversine_distance(current_coord, destination_coord) <= 5.0m`:
       - Mark session `COMPLETED`, record `ended_at = utc_now()`.
       - For each segment in `session.traversed_segment_ids`, increment `confidence_score` by $+1.0$ (clamped to max $+20.0$).
       - Return `status = "COMPLETED"`, `remaining_dist = 0.0`, `remaining_time = 0`.
     - **Rule 3: Deviation Check:** If `distance_to_polyline(current_coord, route.polyline) > 20.0m`:
       - Trigger automatic recalculation via `_route_service.generate_routes(...)` with `origin_coord = current_coord`.
       - Update session `route_id` to new top route.
       - Return `recalculated_route = new_starred_route`.
     - **Rule 4: On-Track Update:**
       - Compute progress via `calculate_route_progress`.
       - Find nearby map segment and append to `traversed_segment_ids` if not already present.
       - Update session `current_location`.
   - `end_navigation(user_id: PydanticObjectId, payload: NavEndRequest) -> NavEndOut`:
     - Fetches active session and marks `CANCELLED` (if `manual_cancel=True`) or `COMPLETED`.

**Files:**
- Create: `src/services/navigation_service.py`
- Create: `tests/services/test_navigation_service.py`

**Success Measures:**
- 100% test coverage for:
  - Session startup & duplicate session cancellation.
  - Speed $> 25$ km/h triggers `motion_warning`.
  - Arrival $\le 5$ m triggers completion and segment score increment (+1 clamped).
  - Deviation $> 20$ m triggers automatic recalculation.
  - Normal tracking updates remaining distance and instructions.

---

## Ticket 5 — Navigation Controller, Router Wiring & Postman Integration

**Layer:** `src/controllers/navigation_controller.py`, `src/routes/navigation/index.py`, `src/routes/index.py`

**Objective:** Expose HTTP REST endpoints for navigation following the 5-layer BE rules (thin controller, zero try/except, router decorators).

**Specifications:**
1. **Controller (`src/controllers/navigation_controller.py`):**
   - `start_navigation(...) -> SuccessResponse[NavStartOut]`: returns `created(..., message="Start navigation session success!")`.
   - `track_position(...) -> SuccessResponse[NavTrackOut]`: returns `ok(..., message="Track navigation position success!")`.
   - `end_navigation(...) -> SuccessResponse[NavEndOut]`: returns `ok(..., message="End navigation session success!")`.
2. **Router Wiring (`src/routes/navigation/index.py`):**
   - Private router with `prefix="/v1/api/navigation"`, `dependencies=[Depends(authentication_v2)]`.
   - `POST /start` (status code 201 Created)
   - `POST /track` (status code 200 OK)
   - `POST /end` (status code 200 OK)
3. **Mount in `src/routes/index.py`**:
   - `router.include_router(navigation_router)`.
4. **Postman Requests (`postman/`):**
   - `postman/navigation_start.post.http`
   - `postman/navigation_track.post.http`
   - `postman/navigation_end.post.http`

**Files:**
- Create: `src/controllers/navigation_controller.py`
- Create: `src/routes/navigation/index.py`
- Update: `src/routes/index.py`
- Create: `postman/navigation_start.post.http`
- Create: `postman/navigation_track.post.http`
- Create: `postman/navigation_end.post.http`

**Success Measures:**
- All endpoints respond with the standardized `{ status, code, message, data }` envelope.
- All unit tests pass (`pytest`).
- Dev server runs cleanly with zero routing conflicts.

---

## Ticket 6 — Mobile Navigation Types, Service Client & AppContext Integration

**Layer:** `walkingsg-mobile/src/types/navigation.ts`, `walkingsg-mobile/src/services/navigationService.ts`, `walkingsg-mobile/src/context/AppContext.tsx`

**Objective:** Implement frontend typed contracts, HTTP service client, and global reactive state for navigation sessions.

**Specifications:**
1. **Types (`src/types/navigation.ts`):**
   - `NavStartRequest`, `NavStartResponse`
   - `NavTrackRequest`, `NavTrackResponse`
   - `NavEndRequest`, `NavEndResponse`
2. **Service (`src/services/navigationService.ts`):**
   - `startNavigation(routeId: string, token: string, clientId: string)`
   - `trackPosition(sessionId: string, coord: LatLng, speedKmh: number, token: string, clientId: string)`
   - `endNavigation(sessionId: string, manualCancel: boolean, token: string, clientId: string)`
3. **AppContext Integration (`src/context/AppContext.tsx`):**
   - Exposes:
     - `activeNavSession: NavStartResponse | null`
     - `isNavigating: boolean`
     - `navTracking: NavTrackResponse | null`
     - `startNavigationSession(routeId: string) => Promise<NavStartResponse>`
     - `trackNavPosition(coord: LatLng, speedKmh: number) => Promise<NavTrackResponse>`
     - `endNavigationSession(manualCancel?: boolean) => Promise<NavEndResponse>`

**Files:**
- Create: `walkingsg-mobile/src/types/navigation.ts`
- Create: `walkingsg-mobile/src/services/navigationService.ts`
- Update: `walkingsg-mobile/src/context/AppContext.tsx`

**Success Measures:**
- `npx tsc --noEmit` passes with 0 errors.
- AppContext handles auto-injection of bearer token and active session state.

---

## Ticket 7 — Mobile Screen Wiring (`RouteExpandedScreen.tsx` & `NavActiveScreen.tsx`)

**Layer:** `walkingsg-mobile/src/screens/routes/RouteExpandedScreen.tsx`, `walkingsg-mobile/src/screens/navigation/NavActiveScreen.tsx`

**Objective:** Connect the real navigation lifecycle to the UI, replacing static mocks with live route polyline, turn HUD, motion warnings, and arrival detection.

**Specifications:**
1. **`RouteExpandedScreen.tsx`:**
   - "Start Navigation" button triggers `startNavigationSession(selectedRoute.id)`.
   - On success, transitions to `NavActive` screen.
2. **`NavActiveScreen.tsx`:**
   - Renders live OneMap view using `selectedRouteDetail.polyline` and origin/destination pins.
   - Periodic GPS tracking hook (or simulated trajectory progression) invoking `trackNavPosition`.
   - Top HUD dynamically updates:
     - Next turn instruction (e.g., "Turn left onto Nanyang Ave in 60m").
     - Speed Warning Banner if `motion_warning === true` ("Walking safety alert: high speed detected").
   - Bottom HUD displays dynamic remaining time & distance (`X min · Y m left`).
   - Exit/Cancel button calls `endNavigationSession(true)` and returns to routes list.
   - Destination Arrival Banner / Alert when `status === "COMPLETED"`.

**Files:**
- Update: `walkingsg-mobile/src/screens/routes/RouteExpandedScreen.tsx`
- Update: `walkingsg-mobile/src/screens/navigation/NavActiveScreen.tsx`

**Success Measures:**
- Seamless navigation loop: start -> track -> arrive/cancel.
- Clean HUD styling and zero mock data dependencies.
- `npx tsc --noEmit` passes with 0 errors.

---

## Verification & Execution Protocol

1. Present this ticket breakdown to the user for formal approval before modifying code.
2. Implement **one ticket at a time**.
3. Display code snippets for review prior to writing files.
4. Execute static type checks (`npx tsc --noEmit`) and tests (`pytest`) after each ticket.
5. Create atomic git commits adhering strictly to:
   - One concern per commit.
   - **Zero "and" or "&" conjunctions in commit messages.**
6. Pause for user verification after completing each ticket.
