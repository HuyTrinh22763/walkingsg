from abc import ABC, abstractmethod # Abstract Base Class (interface)
from typing import ClassVar

from beanie import PydanticObjectId

from src.core.error_response import BadRequestError
from src.model.map_segment_model import MapSegmentModel
from src.model.route_model import RouteModel, RouteType
from src.services.adapters.pedestrian_routing_adapter import (
    PedestrianRouteData,
    PedestrianRoutingAdapter,
)
from src.utils.index import clamp, haversine_distance

WALKING_SPEED_MPS = 1.25


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
        if base_routes:
            if 0 <= preferred_index < len(base_routes):
                return base_routes[preferred_index]
            if len(base_routes) > 0:
                return base_routes[0]

        try:
            routes = await self._adapter.get_pedestrian_route(
                origin_coord=origin_coord,
                destination_coord=destination_coord,
                via_coord=via_coord,
            )
            if routes:
                if 0 <= preferred_index < len(routes):
                    return routes[preferred_index]
                return routes[0]
        except Exception:
            pass

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
        return segments[0].start_coordinates

    def _find_corridor_segments(
        self,
        polyline: list[list[float]],
        candidate_segments: list[MapSegmentModel],
        buffer_meters: float = 80.0,
    ) -> list[MapSegmentModel]:
        if not candidate_segments or not polyline:
            return []

        deg_threshold = buffer_meters / 111000.0
        corridor: list[MapSegmentModel] = []

        for segment in candidate_segments:
            s_lat, s_lng = segment.start_coordinates
            e_lat, e_lng = segment.end_coordinates

            # Fast bounding box rejection against polyline vertices
            near_start = False
            near_end = False

            for pt in polyline:
                if (
                    abs(s_lat - pt[0]) <= deg_threshold
                    and abs(s_lng - pt[1]) <= deg_threshold
                ):
                    if haversine_distance((s_lat, s_lng), (pt[0], pt[1])) <= buffer_meters:
                        near_start = True
                        break

            for pt in polyline:
                if (
                    abs(e_lat - pt[0]) <= deg_threshold
                    and abs(e_lng - pt[1]) <= deg_threshold
                ):
                    if haversine_distance((e_lat, e_lng), (pt[0], pt[1])) <= buffer_meters:
                        near_end = True
                        break

            if near_start or near_end:
                corridor.append(segment)

        return corridor


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
        base_route = await self._get_base_route(base_routes, origin_coord, destination_coord, 0)
        corridor = self._find_corridor_segments(base_route.polyline, all_segments)

        stair_count = sum(s.stair_count for s in corridor)
        sheltered_dist = sum(
            haversine_distance(s.start_coordinates, s.end_coordinates)
            for s in corridor
            if s.is_sheltered
        )
        sheltered_pct = (
            round(
                clamp(
                    100.0 * sheltered_dist / base_route.distance_meters,
                    0.0,
                    100.0,
                ),
                2,
            )
            if base_route.distance_meters > 0
            else 0.0
        )

        steps = [f"Walk from {origin_name}"]
        for s in base_route.steps:
            if s not in steps and "Arrive at" not in s:
                steps.append(s)
        steps.append(f"Arrive at {destination_name}")

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

        base_route = await self._get_base_route(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=0,
            via_coord=shelter_wp,
        )
        corridor = self._find_corridor_segments(
            base_route.polyline, sheltered, buffer_meters=120.0
        )
        selected_segments = corridor if corridor else sheltered[:6]

        steps = [
            f"Walk from {origin_name}",
            "Follow covered linkway concourse",
            "Continue under sheltered canopy",
            f"Arrive at {destination_name}",
        ]

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
            sheltered_percentage=90.0 if selected_segments else 0.0,
            stair_count=0,
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

        base_route = await self._get_base_route(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=0,
            via_coord=ramp_wp,
        )
        corridor = self._find_corridor_segments(
            base_route.polyline, barrier_free, buffer_meters=100.0
        )
        selected_segments = corridor if corridor else barrier_free[:4]

        steps = [
            f"Walk from {origin_name}",
            "Follow barrier-free accessible ramp",
            "Continue along step-free walkway",
            f"Arrive at {destination_name}",
        ]

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
            sheltered_percentage=25.0,
            stair_count=0,
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

        base_route = await self._get_base_route(
            base_routes,
            origin_coord,
            destination_coord,
            preferred_index=0,
            via_coord=flat_wp,
        )
        corridor = self._find_corridor_segments(
            base_route.polyline, flat, buffer_meters=90.0
        )
        selected_segments = corridor if corridor else flat[:3]

        steps = [
            f"Walk from {origin_name}",
            "Follow flat footpath avoiding stairs",
            "Continue on gentle gradient",
            f"Arrive at {destination_name}",
        ]

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
            sheltered_percentage=20.0,
            stair_count=0,
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
        base_route = await self._get_base_route(
            base_routes, origin_coord, destination_coord, preferred_index=1
        )
        high_conf = [s for s in all_segments if s.confidence_score >= 0.0]
        corridor = self._find_corridor_segments(
            base_route.polyline, high_conf, buffer_meters=100.0
        )
        selected_segments = corridor if corridor else high_conf[:4]

        steps = [
            f"Walk from {origin_name}",
            "Follow wide park connector / nature path",
            "Continue on quiet walkway",
            f"Arrive at {destination_name}",
        ]

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
            sheltered_percentage=15.0,
            stair_count=0,
            segment_ids=[s.segment_id for s in selected_segments],
            polyline=base_route.polyline,
            steps=steps,
        )
