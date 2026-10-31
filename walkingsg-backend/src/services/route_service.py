from datetime import timedelta
import logging
from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, NotFoundError
from src.model.hazard_model import HazardModel, HazardType
from src.model.map_segment_model import MapSegmentModel
from src.model.profile_model import (
    HeatUvSensitivity,
    MobilityNeeds,
    PreferredPace,
    ProfileModel,
)
from src.model.repository.hazard_repo import HazardRepository
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.model.repository.profile_repo import ProfileRepository
from src.model.repository.route_repo import RouteRepository
from src.model.route_model import RouteModel, RouteType
from src.schemas.route_schema import (
    RouteDetailOut,
    RouteSearchOut,
    RouteSearchRequest,
    RouteVariantSummary,
)
from src.services.adapters.ors_routing_adapter import OrsRoutingAdapter
from src.services.adapters.pedestrian_routing_adapter import PedestrianRouteData
from src.services.route_types import RouteFactory
from src.utils.index import (
    clamp,
    distance_to_polyline,
    haversine_distance,
    is_within_singapore,
    normalize_weights,
    utc_now,
)

logger = logging.getLogger(__name__)

STAIR_PENALTY = 10.0
NEUTRAL_CONFIDENCE_SCORE = 50.0
BBOX_PADDING_DEG = 0.01

BASE_WEIGHTS = {
    "efficiency": 0.30,
    "shelter": 0.25,
    "effort": 0.25,
    "confidence": 0.20,
}

ROUTE_TYPE_PRIORITY = {
    RouteType.MAX_SHELTER: 0,
    RouteType.BARRIER_FREE: 1,
    RouteType.LOW_EFFORT: 2,
    RouteType.WIDE_QUIET: 3,
    RouteType.DIRECT: 4,
}


def should_avoid_hazard(hazard: HazardModel, profile: ProfileModel) -> bool:
    if hazard.hazard_type in (
        HazardType.BLOCKED,
        HazardType.FLOODING,
        HazardType.UNWALKABLE,
    ):
        return True
    if hazard.hazard_type in (HazardType.LIFT, HazardType.UNEVEN):
        return profile.mobility_needs in (
            MobilityNeeds.WHEELCHAIR,
            MobilityNeeds.MOBILITY_AID,
        )
    return False


def build_avoid_polygons(
    hazards: list[HazardModel],
    profile: ProfileModel,
    origin_coord: tuple[float, float],
    destination_coord: tuple[float, float],
    buffer_meters: float = 25.0,
) -> list[list[list[list[float]]]]:
    avoid_polygons: list[list[list[list[float]]]] = []
    delta_deg = buffer_meters / 111000.0

    for h in hazards:
        if not should_avoid_hazard(h, profile):
            continue
        h_lat = float(h.location.coordinates[1])
        h_lng = float(h.location.coordinates[0])

        # Skip doorstep hazards (< 35m from start or end) to avoid ORS routing errors
        if (
            haversine_distance((h_lat, h_lng), origin_coord) < 35.0
            or haversine_distance((h_lat, h_lng), destination_coord) < 35.0
        ):
            continue

        polygon = [
            [
                [round(h_lng - delta_deg, 6), round(h_lat - delta_deg, 6)],
                [round(h_lng + delta_deg, 6), round(h_lat - delta_deg, 6)],
                [round(h_lng + delta_deg, 6), round(h_lat + delta_deg, 6)],
                [round(h_lng - delta_deg, 6), round(h_lat + delta_deg, 6)],
                [round(h_lng - delta_deg, 6), round(h_lat - delta_deg, 6)],
            ]
        ]
        avoid_polygons.append(polygon)

    return avoid_polygons


class RouteService:
    def __init__(
        self,
        map_segment_repo: MapSegmentRepository,
        route_repo: RouteRepository,
        profile_repo: ProfileRepository,
        hazard_repo: HazardRepository | None = None,
        routing_adapter: OrsRoutingAdapter | None = None,
    ) -> None:
        self._map_segment_repo = map_segment_repo
        self._route_repo = route_repo
        self._profile_repo = profile_repo
        self._hazard_repo = hazard_repo
        self._routing_adapter = routing_adapter or OrsRoutingAdapter()

    def calculate_match_score(
        self,
        route: RouteModel,
        profile: ProfileModel,
        *,
        segments: list[MapSegmentModel] | None = None,
    ) -> float:
        route_segments = segments or []

        has_barriers = route.stair_count > 0 or any(
            not segment.is_barrier_free for segment in route_segments
        )
        gate = (
            0.0
            if profile.mobility_needs == MobilityNeeds.WHEELCHAIR and has_barriers
            else 1.0
        )

        direct_distance = haversine_distance(
            route.origin_coordinates, route.destination_coordinates
        )
        if route.total_distance > 0:
            score_efficiency = clamp(
                100.0 * direct_distance / route.total_distance, 0.0, 100.0
            )
        else:
            score_efficiency = 100.0

        score_shelter = clamp(route.sheltered_percentage, 0.0, 100.0)
        score_effort = clamp(
            100.0 - route.stair_count * STAIR_PENALTY, 0.0, 100.0
        )

        if route_segments:
            avg_confidence = (
                sum(segment.confidence_score for segment in route_segments)
                / len(route_segments)
            )
            score_confidence = clamp(
                (avg_confidence + 20.0) / 40.0 * 100.0, 0.0, 100.0
            )
        else:
            score_confidence = NEUTRAL_CONFIDENCE_SCORE

        weights = self._select_weights(profile)
        score = gate * (
            weights["efficiency"] * score_efficiency
            + weights["shelter"] * score_shelter
            + weights["effort"] * score_effort
            + weights["confidence"] * score_confidence
        )
        return round(clamp(score, 0.0, 100.0), 2)

    def rank_routes(self, routes: list[RouteModel]) -> list[RouteModel]:
        ranked = sorted(
            routes,
            key=lambda route: (
                getattr(route, "hazard_count", 0),
                -route.match_score,
                route.estimated_time,
                -route.sheltered_percentage,
                ROUTE_TYPE_PRIORITY[route.route_type],
            ),
        )
        for index, route in enumerate(ranked):
            route.is_starred = index == 0
        return ranked

    async def generate_routes(
        self, user_id: PydanticObjectId, payload: RouteSearchRequest
    ) -> RouteSearchOut:
        if not is_within_singapore(*payload.origin_coord) or not is_within_singapore(
            *payload.destination_coord
        ):
            raise BadRequestError(
                "Invalid location. Please select a valid origin/destination within Singapore"
            )

        profile = await self._profile_repo.find_by_user_id(user_id=user_id)
        if profile is None:
            profile = await self._profile_repo.create(user_id=user_id)

        candidates = await self._map_segment_repo.find_segments_in_bbox(
            min_lat=min(payload.origin_coord[0], payload.destination_coord[0])
            - BBOX_PADDING_DEG,
            max_lat=max(payload.origin_coord[0], payload.destination_coord[0])
            + BBOX_PADDING_DEG,
            min_lng=min(payload.origin_coord[1], payload.destination_coord[1])
            - BBOX_PADDING_DEG,
            max_lng=max(payload.origin_coord[1], payload.destination_coord[1])
            + BBOX_PADDING_DEG,
        )
        segments_by_id = {
            segment.segment_id: segment for segment in candidates
        }

        # Query active hazards within trip radius (last 72 hours)
        active_hazards: list[HazardModel] = []
        if self._hazard_repo is not None:
            try:
                mid_lat = (payload.origin_coord[0] + payload.destination_coord[0]) / 2.0
                mid_lng = (payload.origin_coord[1] + payload.destination_coord[1]) / 2.0
                dist_m = haversine_distance(payload.origin_coord, payload.destination_coord)
                search_radius = max(5000.0, dist_m + 1000.0)
                active_hazards = await self._hazard_repo.find_active_within_radius(
                    latitude=mid_lat,
                    longitude=mid_lng,
                    since=utc_now() - timedelta(hours=72),
                    radius_m=search_radius,
                )
            except Exception as exc:
                logger.warning("Hazard query error: %s", exc)
                active_hazards = []

        # Build avoidance polygons for ORS
        avoid_polygons = build_avoid_polygons(
            active_hazards,
            profile,
            payload.origin_coord,
            payload.destination_coord,
        )

        # Pre-fetch base pedestrian routes avoiding active hazards
        base_routes: list[PedestrianRouteData] | None = None
        try:
            base_routes = await self._routing_adapter.get_pedestrian_route(
                origin_coord=payload.origin_coord,
                destination_coord=payload.destination_coord,
                avoid_polygons=avoid_polygons if avoid_polygons else None,
            )
        except Exception as exc:
            logger.warning("Routing adapter base route error: %s", exc)

        routes: list[RouteModel] = []
        for route_type in RouteType:
            strategy = RouteFactory.get(route_type)()
            route = await strategy.generate_route(
                user_id=user_id,
                origin_name=payload.origin_name,
                origin_coord=payload.origin_coord,
                destination_name=payload.destination_name,
                destination_coord=payload.destination_coord,
                base_routes=base_routes,
                candidate_segments=candidates,
                segments=candidates,
            )
            route_segments = [
                segments_by_id[sid]
                for sid in route.segment_ids
                if sid in segments_by_id
            ]
            route.match_score = self.calculate_match_score(
                route,
                profile,
                segments=route_segments,
            )

            # Tag route with active hazards still intersecting the path
            hazards_on_route: list[str] = []
            for h in active_hazards:
                h_coord = (float(h.location.coordinates[1]), float(h.location.coordinates[0]))
                if distance_to_polyline(h_coord, route.polyline) <= 40.0:
                    hazards_on_route.append(str(h.id))
            route.hazard_ids = hazards_on_route
            route.hazard_count = len(hazards_on_route)

            # Penalize match score if unavoidable hazards remain on path
            if route.hazard_count > 0:
                route.match_score = clamp(
                    round(route.match_score - route.hazard_count * 20.0, 2),
                    0.0,
                    100.0,
                )

            routes.append(route)

        ranked = self.rank_routes(routes)
        for route in ranked:
            await self._route_repo.create(route=route)

        return RouteSearchOut(
            starred_route=self._to_summary(ranked[0]),
            alternative_routes=[self._to_summary(route) for route in ranked[1:]],
        )

    async def find_route(self, route_id: PydanticObjectId) -> RouteDetailOut:
        route = await self._route_repo.find_by_id(route_id=route_id)
        if route is None:
            raise NotFoundError("Route not found")

        summary = self._to_summary(route)
        return RouteDetailOut(
            **summary.model_dump(),
            polyline=route.polyline,
            steps=route.steps,
            hazard_ids=getattr(route, "hazard_ids", []),
        )

    def _to_summary(self, route: RouteModel) -> RouteVariantSummary:
        return RouteVariantSummary(
            route_id=route.id,
            route_type=route.route_type,
            total_distance=route.total_distance,
            estimated_time=route.estimated_time,
            match_score=route.match_score,
            sheltered_percentage=route.sheltered_percentage,
            stair_count=route.stair_count,
            hazard_count=getattr(route, "hazard_count", 0),
            is_starred=route.is_starred,
        )

    def _select_weights(self, profile: ProfileModel) -> dict[str, float]:
        weights = dict(BASE_WEIGHTS)
        if profile.heat_uv_sensitivity == HeatUvSensitivity.HIGH:
            weights["shelter"] += 0.20
        if profile.mobility_needs in (
            MobilityNeeds.WHEELCHAIR,
            MobilityNeeds.MOBILITY_AID,
        ):
            weights["effort"] += 0.20
        if profile.preferred_pace == PreferredPace.BRISK:
            weights["efficiency"] += 0.10
        elif profile.preferred_pace == PreferredPace.SLOW:
            weights["effort"] += 0.10
        return normalize_weights(weights)
