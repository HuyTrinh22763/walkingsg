from abc import ABC, abstractmethod # Abstract Base Class (interface)
import logging
import math
from typing import ClassVar

from beanie import PydanticObjectId

from src.core.error_response import BadRequestError
from src.model.map_segment_model import MapSegmentModel
from src.model.route_model import RouteModel, RouteType
from src.services.adapters.pedestrian_routing_adapter import (
    PedestrianRouteData,
    PedestrianRoutingAdapter,
)
from src.utils.index import (
    clamp,
    distance_to_polyline,
    haversine_distance,
)

logger = logging.getLogger(__name__)

WALKING_SPEED_MPS = 1.25
DIRECT_BUFFER_METRES = 30.0
VARIANT_BUFFER_METRES = 60.0


class BaseRouteStrategy(ABC):
    route_type: ClassVar[RouteType]
    _adapter: PedestrianRoutingAdapter = PedestrianRoutingAdapter()

    @abstractmethod
    # generate_route interface for 5-variant routes
    # DirectRouteStrategy.generate_route
    # MaxShelterRouteStrategy.generate_route
    # BarrierFreeRouteStrategy.generate_route
    # LowEffortRouteStrategy.generate_route
    # WideQuietRouteStrategy.generate_route
    async def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        base_routes: list[PedestrianRouteData] | None = None,
        candidate_segments: list[MapSegmentModel] | None = None,
        segments: list[MapSegmentModel] | None = None,
    ) -> RouteModel: ...

    async def _get_base_route(
        self,
        base_routes: list[PedestrianRouteData] | None,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
        preferred_index: int = 0,
        via_coord: tuple[float, float] | None = None,
    ) -> PedestrianRouteData:
        if base_routes and via_coord is not None:
            passing = [
                r
                for r in base_routes
                if distance_to_polyline(via_coord, r.polyline) <= 80.0
            ]
            if passing:
                return passing[0]

        if not base_routes or via_coord is not None:
            try:
                routes = await self._adapter.get_pedestrian_route(
                    origin_coord=origin_coord,
                    destination_coord=destination_coord,
                    via_coord=via_coord,
                )
                if routes:
                    idx = preferred_index if 0 <= preferred_index < len(routes) else 0
                    return routes[idx]
            except Exception as exc:
                logger.warning("Adapter route fetch failed: %s", exc)

        if base_routes:
            idx = preferred_index if 0 <= preferred_index < len(base_routes) else 0
            return base_routes[idx]

        dist = haversine_distance(origin_coord, destination_coord)
        duration = int(round(dist / WALKING_SPEED_MPS))
        return PedestrianRouteData(
            polyline=[
                [origin_coord[0], origin_coord[1]],
                [destination_coord[0], destination_coord[1]],
            ],
            distance_meters=dist,
            duration_seconds=duration,
            steps=["Start walking", "Arrive at destination"],
        )

    async def _collect_candidate_routes(
        self,
        base_routes: list[PedestrianRouteData] | None,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
        preferred_index: int = 0,
        via_coord: tuple[float, float] | None = None,
    ) -> list[PedestrianRouteData]:
        candidates = list(base_routes) if base_routes else []

        needs_via_fetch = via_coord is not None and not any(
            distance_to_polyline(via_coord, r.polyline) <= 80.0
            for r in candidates
        )
        if needs_via_fetch:
            try:
                via_routes = await self._adapter.get_pedestrian_route(
                    origin_coord=origin_coord,
                    destination_coord=destination_coord,
                    via_coord=via_coord,
                )
                if via_routes:
                    candidates.extend(via_routes)
            except Exception as exc:
                logger.warning("Adapter via-route fetch failed: %s", exc)

        if candidates:
            return candidates

        fallback = await self._get_base_route(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=preferred_index,
            via_coord=via_coord,
        )
        return [fallback]

    def _find_corridor_waypoint(
        self,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
        segments: list[MapSegmentModel],
    ) -> tuple[float, float] | None:
        if not segments:
            return None
        base_d = haversine_distance(origin_coord, destination_coord)
        midpoint = (
            (origin_coord[0] + destination_coord[0]) / 2,
            (origin_coord[1] + destination_coord[1]) / 2,
        )
        corridor_candidates: list[tuple[MapSegmentModel, float]] = []
        for s in segments:
            d1 = haversine_distance(origin_coord, s.start_coordinates)
            d2 = haversine_distance(destination_coord, s.start_coordinates)
            if d1 < base_d and d2 < base_d:
                corridor_candidates.append(
                    (s, haversine_distance(midpoint, s.start_coordinates))
                )
        if corridor_candidates:
            corridor_candidates.sort(key=lambda x: x[1])
            return corridor_candidates[0][0].start_coordinates
        return None

    def _project_onto_polyline(
        self,
        point: tuple[float, float],
        polyline: list[list[float]],
    ) -> tuple[float, float]:
        if not polyline:
            return 0.0, float("inf")
        if len(polyline) == 1:
            return 0.0, haversine_distance(point, (polyline[0][0], polyline[0][1]))

        best_dist = float("inf")
        best_arc = 0.0
        cumulative = 0.0

        for i in range(len(polyline) - 1):
            a = (polyline[i][0], polyline[i][1])
            b = (polyline[i + 1][0], polyline[i + 1][1])
            edge_len = haversine_distance(a, b)

            mid_lat_rad = math.radians((a[0] + b[0]) / 2.0)
            deg_lat = 111320.0
            deg_lng = 111320.0 * math.cos(mid_lat_rad)

            dx = (b[1] - a[1]) * deg_lng
            dy = (b[0] - a[0]) * deg_lat
            len_sq = dx * dx + dy * dy

            if len_sq <= 1e-6:
                t = 0.0
                proj = a
            else:
                px = (point[1] - a[1]) * deg_lng
                py = (point[0] - a[0]) * deg_lat
                t = float(clamp((px * dx + py * dy) / len_sq, 0.0, 1.0))
                proj = (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))

            dist = haversine_distance(point, proj)
            if dist < best_dist:
                best_dist = dist
                best_arc = cumulative + t * edge_len

            cumulative += edge_len

        return best_arc, best_dist

    def _find_corridor_segments(
        self,
        polyline: list[list[float]],
        candidate_segments: list[MapSegmentModel],
        buffer_meters: float = DIRECT_BUFFER_METRES,
    ) -> list[MapSegmentModel]:
        return self._resolve_corridor_segments(
            polyline,
            candidate_segments,
            preferred_segments=None,
            buffer_meters=buffer_meters,
        )

    def _resolve_corridor_segments(
        self,
        polyline: list[list[float]],
        all_segments: list[MapSegmentModel],
        preferred_segments: list[MapSegmentModel] | None = None,
        buffer_meters: float = VARIANT_BUFFER_METRES,
    ) -> list[MapSegmentModel]:
        if not all_segments or not polyline:
            return []

        pref_ids = (
            {s.segment_id for s in preferred_segments}
            if preferred_segments is not None
            else set()
        )

        candidates: list[tuple[int, float, float, float, MapSegmentModel]] = []
        for seg in all_segments:
            arc_s, dist_s = self._project_onto_polyline(seg.start_coordinates, polyline)
            if dist_s > buffer_meters:
                continue
            arc_e, dist_e = self._project_onto_polyline(seg.end_coordinates, polyline)
            if dist_e > buffer_meters:
                continue

            span_start = min(arc_s, arc_e)
            span_end = max(arc_s, arc_e)
            span_len = span_end - span_start
            seg_len = haversine_distance(seg.start_coordinates, seg.end_coordinates)
            if seg_len > 5.0 and span_len < 0.3 * seg_len:
                continue

            priority = 0 if seg.segment_id in pref_ids else 1
            avg_dist = (dist_s + dist_e) / 2.0
            candidates.append((priority, avg_dist, span_start, span_end, seg))

        candidates.sort(key=lambda item: (item[0], item[1]))

        kept_intervals: list[tuple[float, float]] = []
        resolved: list[tuple[float, MapSegmentModel]] = []

        for _, _, s_start, s_end, seg in candidates:
            span = s_end - s_start
            if span > 1e-3:
                covered = sum(
                    max(0.0, min(s_end, k_end) - max(s_start, k_start))
                    for k_start, k_end in kept_intervals
                )
                if covered / span > 0.5:
                    continue
                kept_intervals.append((s_start, s_end))
                kept_intervals.sort()
                merged: list[tuple[float, float]] = []
                for iv_s, iv_e in kept_intervals:
                    if merged and iv_s <= merged[-1][1]:
                        merged[-1] = (merged[-1][0], max(merged[-1][1], iv_e))
                    else:
                        merged.append((iv_s, iv_e))
                kept_intervals = merged

            resolved.append((s_start, seg))

        resolved.sort(key=lambda item: item[0])
        return [seg for _, seg in resolved]

    def _compute_route_metrics(
        self,
        segments: list[MapSegmentModel],
        total_distance: float,
    ) -> tuple[float, int]:
        stair_count = sum(s.stair_count for s in segments)
        if total_distance <= 0:
            return 0.0, stair_count

        sheltered_dist = sum(
            haversine_distance(s.start_coordinates, s.end_coordinates)
            for s in segments
            if s.is_sheltered
        )
        sheltered_pct = round(
            clamp(100.0 * sheltered_dist / total_distance, 0.0, 100.0), 2
        )
        return sheltered_pct, stair_count

    def _build_steps(
        self,
        origin_name: str,
        destination_name: str,
        base_steps: list[str],
        fallback_steps: list[str],
    ) -> list[str]:
        steps = [f"Walk from {origin_name}"]
        intermediate = [
            s
            for s in base_steps
            if s not in steps and "Arrive at" not in s and s != "Start walking"
        ]
        steps.extend(intermediate if intermediate else fallback_steps)
        steps.append(f"Arrive at {destination_name}")
        return steps


class RouteFactory:
    _registry: ClassVar[dict[RouteType, type[BaseRouteStrategy]]] = {}

    @classmethod
    def register(cls, route_type: RouteType):
        def decorator(strategy_cls: type[BaseRouteStrategy]) -> type[BaseRouteStrategy]:
            cls._registry[route_type] = strategy_cls
            return strategy_cls

        return decorator

    @classmethod
    def get(cls, route_type: RouteType) -> type[BaseRouteStrategy]:
        try:
            return cls._registry[route_type]
        except KeyError:
            raise BadRequestError(f"Invalid route type: {route_type}") from None


@RouteFactory.register(RouteType.DIRECT)
class DirectRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.DIRECT

    async def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        base_routes: list[PedestrianRouteData] | None = None,
        candidate_segments: list[MapSegmentModel] | None = None,
        segments: list[MapSegmentModel] | None = None,
    ) -> RouteModel:
        all_segments = candidate_segments if candidate_segments is not None else (segments or [])
        if base_routes:
            base_route = min(base_routes, key=lambda r: r.distance_meters)
        else:
            base_route = await self._get_base_route(
                base_routes, origin_coord, destination_coord, 0
            )
        corridor = self._find_corridor_segments(base_route.polyline, all_segments)

        sheltered_pct, stair_count = self._compute_route_metrics(
            corridor, base_route.distance_meters
        )
        steps = self._build_steps(
            origin_name, destination_name, base_route.steps, []
        )

        return RouteModel.model_construct(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=round(base_route.distance_meters, 2),
            estimated_time=base_route.duration_seconds,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=[s.segment_id for s in corridor],
            polyline=base_route.polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.MAX_SHELTER)
class MaxShelterRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.MAX_SHELTER

    async def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        base_routes: list[PedestrianRouteData] | None = None,
        candidate_segments: list[MapSegmentModel] | None = None,
        segments: list[MapSegmentModel] | None = None,
    ) -> RouteModel:
        all_segments = candidate_segments if candidate_segments is not None else (segments or [])
        sheltered = [s for s in all_segments if s.is_sheltered]
        shelter_wp = (
            self._find_corridor_waypoint(origin_coord, destination_coord, sheltered)
            if sheltered
            else None
        )

        candidates = await self._collect_candidate_routes(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=0,
            via_coord=shelter_wp,
        )
        base_route = max(
            candidates,
            key=lambda r: self._compute_route_metrics(
                self._resolve_corridor_segments(
                    r.polyline,
                    all_segments,
                    sheltered,
                    buffer_meters=VARIANT_BUFFER_METRES,
                ),
                r.distance_meters,
            )[0],
        )

        selected_segments = self._resolve_corridor_segments(
            base_route.polyline,
            all_segments,
            sheltered,
            buffer_meters=VARIANT_BUFFER_METRES,
        )
        sheltered_pct, stair_count = self._compute_route_metrics(
            selected_segments, base_route.distance_meters
        )
        steps = self._build_steps(
            origin_name,
            destination_name,
            base_route.steps,
            [
                "Follow covered linkway concourse",
                "Continue under sheltered canopy",
            ],
        )

        return RouteModel.model_construct(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=round(base_route.distance_meters, 2),
            estimated_time=base_route.duration_seconds,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=[s.segment_id for s in selected_segments],
            polyline=base_route.polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.BARRIER_FREE)
class BarrierFreeRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.BARRIER_FREE

    async def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        base_routes: list[PedestrianRouteData] | None = None,
        candidate_segments: list[MapSegmentModel] | None = None,
        segments: list[MapSegmentModel] | None = None,
    ) -> RouteModel:
        all_segments = candidate_segments if candidate_segments is not None else (segments or [])
        barrier_free = [s for s in all_segments if s.is_barrier_free and s.stair_count == 0]
        ramp_wp = (
            self._find_corridor_waypoint(origin_coord, destination_coord, barrier_free)
            if barrier_free
            else None
        )

        def _barrier_cost(r: PedestrianRouteData) -> tuple[int, int, float]:
            segs = self._resolve_corridor_segments(
                r.polyline,
                all_segments,
                barrier_free,
                buffer_meters=VARIANT_BUFFER_METRES,
            )
            violations = sum(
                1 for s in segs if not s.is_barrier_free or s.stair_count > 0
            )
            stairs = sum(s.stair_count for s in segs)
            return violations, stairs, r.distance_meters

        candidates = await self._collect_candidate_routes(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=0,
            via_coord=ramp_wp,
        )
        base_route = min(candidates, key=_barrier_cost)

        selected_segments = self._resolve_corridor_segments(
            base_route.polyline,
            all_segments,
            barrier_free,
            buffer_meters=VARIANT_BUFFER_METRES,
        )
        sheltered_pct, stair_count = self._compute_route_metrics(
            selected_segments, base_route.distance_meters
        )
        steps = self._build_steps(
            origin_name,
            destination_name,
            base_route.steps,
            [
                "Follow barrier-free accessible ramp",
                "Continue along step-free walkway",
            ],
        )

        return RouteModel.model_construct(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=round(base_route.distance_meters, 2),
            estimated_time=base_route.duration_seconds,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=[s.segment_id for s in selected_segments],
            polyline=base_route.polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.LOW_EFFORT)
class LowEffortRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.LOW_EFFORT

    async def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        base_routes: list[PedestrianRouteData] | None = None,
        candidate_segments: list[MapSegmentModel] | None = None,
        segments: list[MapSegmentModel] | None = None,
    ) -> RouteModel:
        all_segments = candidate_segments if candidate_segments is not None else (segments or [])
        flat = [s for s in all_segments if s.stair_count == 0]
        flat_wp = (
            self._find_corridor_waypoint(origin_coord, destination_coord, flat)
            if flat
            else None
        )

        def _effort_cost(r: PedestrianRouteData) -> tuple[int, float]:
            segs = self._resolve_corridor_segments(
                r.polyline,
                all_segments,
                flat,
                buffer_meters=VARIANT_BUFFER_METRES,
            )
            return sum(s.stair_count for s in segs), r.distance_meters

        candidates = await self._collect_candidate_routes(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=0,
            via_coord=flat_wp,
        )
        base_route = min(candidates, key=_effort_cost)

        selected_segments = self._resolve_corridor_segments(
            base_route.polyline,
            all_segments,
            flat,
            buffer_meters=VARIANT_BUFFER_METRES,
        )
        sheltered_pct, stair_count = self._compute_route_metrics(
            selected_segments, base_route.distance_meters
        )
        steps = self._build_steps(
            origin_name,
            destination_name,
            base_route.steps,
            [
                "Follow flat footpath avoiding stairs",
                "Continue on gentle gradient",
            ],
        )

        return RouteModel.model_construct(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=round(base_route.distance_meters, 2),
            estimated_time=base_route.duration_seconds,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=[s.segment_id for s in selected_segments],
            polyline=base_route.polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.WIDE_QUIET)
class WideQuietRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.WIDE_QUIET

    async def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        base_routes: list[PedestrianRouteData] | None = None,
        candidate_segments: list[MapSegmentModel] | None = None,
        segments: list[MapSegmentModel] | None = None,
    ) -> RouteModel:
        all_segments = candidate_segments if candidate_segments is not None else (segments or [])
        high_conf = [s for s in all_segments if s.confidence_score >= 0.0]

        def _avg_conf(r: PedestrianRouteData) -> float:
            segs = self._resolve_corridor_segments(
                r.polyline,
                all_segments,
                high_conf,
                buffer_meters=VARIANT_BUFFER_METRES,
            )
            return (
                sum(s.confidence_score for s in segs) / len(segs)
                if segs
                else 0.0
            )

        candidates = await self._collect_candidate_routes(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=1,
        )
        base_route = max(
            enumerate(candidates),
            key=lambda item: (_avg_conf(item[1]), item[0] >= 1),
        )[1]

        selected_segments = self._resolve_corridor_segments(
            base_route.polyline,
            all_segments,
            high_conf,
            buffer_meters=VARIANT_BUFFER_METRES,
        )
        sheltered_pct, stair_count = self._compute_route_metrics(
            selected_segments, base_route.distance_meters
        )
        steps = self._build_steps(
            origin_name,
            destination_name,
            base_route.steps,
            [
                "Follow wide park connector / nature path",
                "Continue on quiet walkway",
            ],
        )

        return RouteModel.model_construct(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=round(base_route.distance_meters, 2),
            estimated_time=base_route.duration_seconds,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=[s.segment_id for s in selected_segments],
            polyline=base_route.polyline,
            steps=steps,
        )
