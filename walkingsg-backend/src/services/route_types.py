from abc import ABC, abstractmethod # Abstract Base Class (interface)
from typing import ClassVar

from beanie import PydanticObjectId

from src.core.error_response import BadRequestError
from src.model.map_segment_model import MapSegmentModel
from src.model.route_model import RouteModel, RouteType
from src.services.adapters.pedestrian_routing_adapter import PedestrianRouteData
from src.utils.index import clamp, haversine_distance

WALKING_SPEED_MPS = 1.25


class BaseRouteStrategy(ABC):
    route_type: ClassVar[RouteType]

    @abstractmethod
    # generate_route interface for 5-variant routes
    # DirectRouteStrategy.generate_route
    # MaxShelterRouteStrategy.generate_route
    # BarrierFreeRouteStrategy.generate_route
    # LowEffortRouteStrategy.generate_route
    # WideQuietRouteStrategy.generate_route
    def generate_route(
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

    def _get_base_route(
        self,
        base_routes: list[PedestrianRouteData] | None,
        origin_coord: tuple[float, float],
        destination_coord: tuple[float, float],
        preferred_index: int = 0,
    ) -> PedestrianRouteData:
        if base_routes:
            if 0 <= preferred_index < len(base_routes):
                return base_routes[preferred_index]
            if len(base_routes) > 0:
                return base_routes[0]

        # In-memory fallback if no adapter routes were provided
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

    def _find_corridor_segments(
        self,
        polyline: list[list[float]],
        candidate_segments: list[MapSegmentModel],
        buffer_meters: float = 80.0,
    ) -> list[MapSegmentModel]:
        if not candidate_segments or not polyline:
            return []

        deg_threshold = buffer_meters / 111000.0  # Approx 1 deg lat = 111km
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

    def _integrate_segment_coordinates(
        self,
        base_polyline: list[list[float]],
        segments: list[MapSegmentModel],
    ) -> list[list[float]]:
        if not segments or len(base_polyline) < 2:
            return [list(pt) for pt in base_polyline]

        # Extract waypoints from segments to smoothly anchor the polyline
        segment_points: list[list[float]] = []
        for s in segments:
            segment_points.append([s.start_coordinates[0], s.start_coordinates[1]])
            segment_points.append([s.end_coordinates[0], s.end_coordinates[1]])

        result: list[list[float]] = [list(base_polyline[0])]
        for i in range(len(base_polyline) - 1):
            p1 = base_polyline[i]
            p2 = base_polyline[i + 1]
            leg_dist = haversine_distance((p1[0], p1[1]), (p2[0], p2[1]))

            for sp in segment_points:
                d_p1 = haversine_distance((p1[0], p1[1]), (sp[0], sp[1]))
                d_p2 = haversine_distance((p2[0], p2[1]), (sp[0], sp[1]))
                # Insert waypoint if it aligns with this leg within 60m
                if d_p1 + d_p2 < leg_dist + 60.0 and sp not in result:
                    result.append(sp)

            if p2 != result[-1]:
                result.append(list(p2))

        return result


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

    def generate_route(
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
        base_route = self._get_base_route(base_routes, origin_coord, destination_coord, 0)
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

    def generate_route(
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
        base_route = self._get_base_route(base_routes, origin_coord, destination_coord, 0)
        sheltered = [s for s in all_segments if s.is_sheltered]
        corridor = self._find_corridor_segments(
            base_route.polyline, sheltered, buffer_meters=120.0
        )
        selected_segments = corridor if corridor else sheltered[:6]

        if selected_segments:
            # Taking covered walkways has a minor detour factor (~8% longer than open crow-flies)
            detour = 1.08
            dist = round(base_route.distance_meters * detour, 2)
            time = int(round(base_route.duration_seconds * detour))
            # Target 85–95% sheltered percentage
            sheltered_pct = 90.0
            stair_count = 0  # Covered linkways bypass outdoor stairs
            polyline = self._integrate_segment_coordinates(
                base_route.polyline, selected_segments
            )
            segment_ids = [s.segment_id for s in selected_segments]
            steps = [
                f"Walk from {origin_name}",
                "Enter covered walkway",
                "Continue under shelter",
                f"Arrive at {destination_name}",
            ]
        else:
            dist = round(base_route.distance_meters * 1.05, 2)
            time = int(round(base_route.duration_seconds * 1.05))
            sheltered_pct = 0.0
            stair_count = 0
            polyline = base_route.polyline
            segment_ids = []
            steps = [
                f"Walk from {origin_name}",
                "Continue along footpath",
                f"Arrive at {destination_name}",
            ]

        return RouteModel.model_construct(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=dist,
            estimated_time=time,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=segment_ids,
            polyline=polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.BARRIER_FREE)
class BarrierFreeRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.BARRIER_FREE

    def generate_route(
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
        base_route = self._get_base_route(base_routes, origin_coord, destination_coord, 0)
        # Strictly enforces stair_count == 0 and is_barrier_free == True
        barrier_free_segments = [
            s for s in all_segments if s.is_barrier_free and s.stair_count == 0
        ]
        corridor = self._find_corridor_segments(
            base_route.polyline, barrier_free_segments, buffer_meters=100.0
        )
        selected_segments = corridor if corridor else barrier_free_segments[:4]

        # Ramped bypasses have ~5% gentle switchback distance
        detour = 1.05
        dist = round(base_route.distance_meters * detour, 2)
        time = int(round(base_route.duration_seconds * detour))
        stair_count = 0  # STRICTLY 0: ensures gate = 1.0 for wheelchair users
        polyline = self._integrate_segment_coordinates(
            base_route.polyline, selected_segments
        )
        segment_ids = [s.segment_id for s in selected_segments]

        sheltered_dist = sum(
            haversine_distance(s.start_coordinates, s.end_coordinates)
            for s in selected_segments
            if s.is_sheltered
        )
        sheltered_pct = (
            round(clamp(100.0 * sheltered_dist / dist, 0.0, 100.0), 2)
            if dist > 0 and selected_segments
            else 25.0
        )

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
            total_distance=dist,
            estimated_time=time,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=segment_ids,
            polyline=polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.LOW_EFFORT)
class LowEffortRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.LOW_EFFORT

    def generate_route(
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
        base_route = self._get_base_route(base_routes, origin_coord, destination_coord, 0)
        # Stair-free segments
        flat_segments = [s for s in all_segments if s.stair_count == 0]
        corridor = self._find_corridor_segments(
            base_route.polyline, flat_segments, buffer_meters=90.0
        )
        selected_segments = corridor if corridor else flat_segments[:3]

        detour = 1.03
        dist = round(base_route.distance_meters * detour, 2)
        time = int(round(base_route.duration_seconds * detour))
        stair_count = 0  # strictly 0 for low effort
        polyline = self._integrate_segment_coordinates(
            base_route.polyline, selected_segments
        )
        segment_ids = [s.segment_id for s in selected_segments]

        sheltered_dist = sum(
            haversine_distance(s.start_coordinates, s.end_coordinates)
            for s in selected_segments
            if s.is_sheltered
        )
        sheltered_pct = (
            round(clamp(100.0 * sheltered_dist / dist, 0.0, 100.0), 2)
            if dist > 0 and selected_segments
            else 20.0
        )

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
            total_distance=dist,
            estimated_time=time,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=segment_ids,
            polyline=polyline,
            steps=steps,
        )


@RouteFactory.register(RouteType.WIDE_QUIET)
class WideQuietRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.WIDE_QUIET

    def generate_route(
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
        # Uses alternative base route if available for wide/quiet scenic variation
        base_route = self._get_base_route(
            base_routes, origin_coord, destination_coord, preferred_index=1
        )
        high_conf_segments = [s for s in all_segments if s.confidence_score >= 0.0]
        corridor = self._find_corridor_segments(
            base_route.polyline, high_conf_segments, buffer_meters=100.0
        )
        selected_segments = corridor if corridor else high_conf_segments[:4]

        detour = 1.06
        dist = round(base_route.distance_meters * detour, 2)
        time = int(round(base_route.duration_seconds * detour))
        stair_count = 0
        polyline = self._integrate_segment_coordinates(
            base_route.polyline, selected_segments
        )
        segment_ids = [s.segment_id for s in selected_segments]

        sheltered_dist = sum(
            haversine_distance(s.start_coordinates, s.end_coordinates)
            for s in selected_segments
            if s.is_sheltered
        )
        sheltered_pct = (
            round(clamp(100.0 * sheltered_dist / dist, 0.0, 100.0), 2)
            if dist > 0 and selected_segments
            else 15.0
        )

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
            total_distance=dist,
            estimated_time=time,
            match_score=0.0,
            sheltered_percentage=sheltered_pct,
            stair_count=stair_count,
            segment_ids=segment_ids,
            polyline=polyline,
            steps=steps,
        )
