from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, ForbiddenError, NotFoundError
from src.model.navigation_session_model import (
    NavigationSessionModel,
    NavigationStatus,
)
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.model.repository.navigation_session_repo import NavigationSessionRepository
from src.model.repository.route_repo import RouteRepository
from src.schemas.navigation_schema import (
    NavEndOut,
    NavEndRequest,
    NavStartOut,
    NavStartRequest,
    NavTrackOut,
    NavTrackRequest,
)
from src.schemas.route_schema import RouteSearchRequest
from src.services.route_service import RouteService
from src.utils.index import (
    calculate_route_progress,
    clamp,
    distance_to_polyline,
    haversine_distance,
    utc_now,
)

SPEED_SAFETY_LIMIT_KMH = 25.0
ARRIVAL_RADIUS_METRES = 5.0
DEVIATION_THRESHOLD_METRES = 20.0
SEGMENT_MATCH_DISTANCE_METRES = 15.0


class NavigationService:
    def __init__(
        self,
        session_repo: NavigationSessionRepository,
        route_repo: RouteRepository,
        map_segment_repo: MapSegmentRepository,
        route_service: RouteService,
    ) -> None:
        self._session_repo = session_repo
        self._route_repo = route_repo
        self._map_segment_repo = map_segment_repo
        self._route_service = route_service

    async def start_navigation(
        self, payload: NavStartRequest, *, user_id: PydanticObjectId | None = None
    ) -> NavStartOut:
        try:
            route_obj_id = PydanticObjectId(payload.route_id)
        except Exception:
            raise BadRequestError("Invalid route ID format")

        route = await self._route_repo.find_by_id(route_id=route_obj_id)
        if not route:
            raise NotFoundError("Route not found")

        target_user_id = user_id or route.user_id

        # Cancel any previous active navigation session for this user
        active_session = await self._session_repo.find_active_by_user(
            user_id=target_user_id
        )
        if active_session:
            await self._session_repo.complete_session(
                session=active_session, status=NavigationStatus.CANCELLED
            )

        new_session = NavigationSessionModel.model_construct(
            user_id=target_user_id,
            route_id=route_obj_id,
            current_location=route.origin_coordinates,
            traversed_segment_ids=[],
            session_status=NavigationStatus.ACTIVE,
            started_at=utc_now(),
            ended_at=None,
            updated_at=utc_now(),
        )
        created_session = await self._session_repo.create(session=new_session)

        return NavStartOut(
            session_id=str(created_session.id),
            status=created_session.session_status,
        )

    async def track_position(
        self, payload: NavTrackRequest, *, user_id: PydanticObjectId | None = None
    ) -> NavTrackOut:
        try:
            session_obj_id = PydanticObjectId(payload.session_id)
        except Exception:
            raise BadRequestError("Invalid session ID format")

        session = await self._session_repo.find_by_id(session_id=session_obj_id)
        if not session:
            raise NotFoundError("Navigation session not found")

        if user_id is not None and session.user_id != user_id:
            raise ForbiddenError("Access denied to this navigation session")

        if session.session_status != NavigationStatus.ACTIVE:
            raise BadRequestError("Navigation session is no longer active")

        route = await self._route_repo.find_by_id(route_id=session.route_id)
        if not route:
            raise NotFoundError("Associated route not found")

        # 1. Speed safety check (> 25 km/h threshold)
        motion_warning = payload.speed_kmh > SPEED_SAFETY_LIMIT_KMH

        # 2. Destination arrival check (<= 5.0m of destination coordinates)
        dist_to_destination = haversine_distance(
            payload.current_coord, route.destination_coordinates
        )
        if dist_to_destination <= ARRIVAL_RADIUS_METRES:
            await self._session_repo.update_location(
                session=session, current_location=payload.current_coord
            )
            await self._session_repo.complete_session(
                session=session, status=NavigationStatus.COMPLETED
            )

            # Increment confidence score by +1.0 (clamped to max 20.0) for traversed segments
            if session.traversed_segment_ids:
                segments = await self._map_segment_repo.find_by_ids(
                    segment_ids=session.traversed_segment_ids
                )
                for seg in segments:
                    seg.confidence_score = float(
                        clamp(seg.confidence_score + 1.0, -20.0, 20.0)
                    )
                    await seg.save()

            return NavTrackOut(
                status=NavigationStatus.COMPLETED,
                motion_warning=motion_warning,
                next_instruction="You have arrived at your destination!",
                remaining_dist=0.0,
                remaining_time=0,
                recalculated_route=None,
            )

        # 3. Off-route deviation check (> 20.0m off polyline)
        recalculated_route = None
        dist_to_route = distance_to_polyline(payload.current_coord, route.polyline)
        if dist_to_route > DEVIATION_THRESHOLD_METRES:
            search_request = RouteSearchRequest(
                origin_coord=payload.current_coord,
                destination_coord=route.destination_coordinates,
                origin_name="Current Location",
                destination_name=route.destination_name,
            )
            reroute_result = await self._route_service.generate_routes(
                user_id=user_id, payload=search_request
            )
            recalculated_route = reroute_result.starred_route
            new_route_obj_id = PydanticObjectId(recalculated_route.route_id)
            await self._session_repo.update_route(
                session=session, route_id=new_route_obj_id
            )
            route = (
                await self._route_repo.find_by_id(route_id=new_route_obj_id) or route
            )

        # 4. Normal on-track progress
        remaining_dist, remaining_time, next_instruction = calculate_route_progress(
            current_coord=payload.current_coord,
            polyline=route.polyline,
            steps=route.steps,
            total_distance=route.total_distance,
            estimated_time=route.estimated_time,
        )

        # Track nearest map segment if close
        nearest_seg = await self._map_segment_repo.find_nearest_to_coord(
            latitude=payload.current_coord[0], longitude=payload.current_coord[1]
        )
        if nearest_seg:
            seg_dist = min(
                haversine_distance(
                    payload.current_coord, nearest_seg.start_coordinates
                ),
                haversine_distance(
                    payload.current_coord, nearest_seg.end_coordinates
                ),
            )
            if seg_dist <= SEGMENT_MATCH_DISTANCE_METRES:
                await self._session_repo.append_traversed_segment(
                    session=session, segment_id=nearest_seg.segment_id
                )

        await self._session_repo.update_location(
            session=session, current_location=payload.current_coord
        )

        return NavTrackOut(
            status=session.session_status,
            motion_warning=motion_warning,
            next_instruction=next_instruction,
            remaining_dist=remaining_dist,
            remaining_time=remaining_time,
            recalculated_route=recalculated_route,
        )

    async def end_navigation(
        self, payload: NavEndRequest, *, user_id: PydanticObjectId | None = None
    ) -> NavEndOut:
        try:
            session_obj_id = PydanticObjectId(payload.session_id)
        except Exception:
            raise BadRequestError("Invalid session ID format")

        session = await self._session_repo.find_by_id(session_id=session_obj_id)
        if not session:
            raise NotFoundError("Navigation session not found")

        if user_id is not None and session.user_id != user_id:
            raise ForbiddenError("Access denied to this navigation session")

        final_status = (
            NavigationStatus.CANCELLED
            if payload.manual_cancel
            else NavigationStatus.COMPLETED
        )
        completed_session = await self._session_repo.complete_session(
            session=session, status=final_status
        )

        return NavEndOut(
            session_id=str(completed_session.id),
            status=completed_session.session_status,
        )
