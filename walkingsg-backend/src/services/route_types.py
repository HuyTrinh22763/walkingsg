from abc import ABC, abstractmethod
from typing import ClassVar

from beanie import PydanticObjectId

from src.core.error_response import BadRequestError
from src.model.map_segment_model import MapSegmentModel
from src.model.route_model import RouteModel, RouteType
from src.utils.index import clamp, haversine_distance

WALKING_SPEED_MPS = 1.25


class BaseRouteStrategy(ABC):
    route_type: ClassVar[RouteType]

    @abstractmethod
    def select_segments(
        self, *, segments: list[MapSegmentModel]
    ) -> list[MapSegmentModel]: ...

    def generate_route(
        self,
        *,
        user_id: PydanticObjectId,
        origin_name: str,
        origin_coord: tuple[float, float],
        destination_name: str,
        destination_coord: tuple[float, float],
        segments: list[MapSegmentModel],
    ) -> RouteModel:
        chain = self._build_chain(
            segments=self.select_segments(segments=segments),
            origin_coord=origin_coord,
        )

        polyline: list[list[float]] = [[origin_coord[0], origin_coord[1]]]
        total_distance = 0.0
        sheltered_distance = 0.0
        stair_count = 0
        segment_ids: list[str] = []
        current = origin_coord

        for segment, is_reversed in chain:
            start = segment.end_coordinates if is_reversed else segment.start_coordinates
            end = segment.start_coordinates if is_reversed else segment.end_coordinates
            total_distance += haversine_distance(current, start)
            for point in (start, end):
                if polyline[-1] != [point[0], point[1]]:
                    polyline.append([point[0], point[1]])
            leg = haversine_distance(start, end)
            total_distance += leg
            if segment.is_sheltered:
                sheltered_distance += leg
            stair_count += segment.stair_count
            segment_ids.append(segment.segment_id)
            current = end

        total_distance += haversine_distance(current, destination_coord)
        if polyline[-1] != [destination_coord[0], destination_coord[1]]:
            polyline.append([destination_coord[0], destination_coord[1]])

        if total_distance > 0:
            sheltered_percentage = clamp(100.0 * sheltered_distance / total_distance, 0.0, 100.0)
        else:
            sheltered_percentage = 0.0

        return RouteModel(
            user_id=user_id,
            route_type=self.route_type,
            origin_name=origin_name,
            origin_coordinates=origin_coord,
            destination_name=destination_name,
            destination_coordinates=destination_coord,
            total_distance=round(total_distance, 2),
            estimated_time=int(total_distance / WALKING_SPEED_MPS),
            match_score=0.0,
            sheltered_percentage=round(float(sheltered_percentage), 2),
            stair_count=stair_count,
            segment_ids=segment_ids,
            polyline=polyline,
            steps=self._build_steps(
                origin_name=origin_name,
                destination_name=destination_name,
                chain=chain,
            ),
        )

    def _build_chain(
        self,
        *,
        segments: list[MapSegmentModel],
        origin_coord: tuple[float, float],
    ) -> list[tuple[MapSegmentModel, bool]]:
        chain: list[tuple[MapSegmentModel, bool]] = []
        remaining = list(segments)
        current = origin_coord
        while remaining:
            best_segment = remaining[0]
            first_start = haversine_distance(current, best_segment.start_coordinates)
            first_end = haversine_distance(current, best_segment.end_coordinates)
            best_distance = min(first_start, first_end)
            best_reversed = first_end < first_start
            for segment in remaining[1:]:
                to_start = haversine_distance(current, segment.start_coordinates)
                to_end = haversine_distance(current, segment.end_coordinates)
                if min(to_start, to_end) < best_distance:
                    best_distance = min(to_start, to_end)
                    best_segment = segment
                    best_reversed = to_end < to_start
            remaining.remove(best_segment)
            chain.append((best_segment, best_reversed))
            current = (
                best_segment.start_coordinates
                if best_reversed
                else best_segment.end_coordinates
            )
        return chain

    def _build_steps(
        self,
        *,
        origin_name: str,
        destination_name: str,
        chain: list[tuple[MapSegmentModel, bool]],
    ) -> list[str]:
        steps = [f"Walk from {origin_name}"]
        for segment, _ in chain:
            if segment.stair_count > 0:
                steps.append(f"Take {segment.stair_count} stairs")
            elif segment.is_sheltered:
                steps.append("Continue under shelter")
            else:
                steps.append("Continue along the walkway")
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

    def select_segments(
        self, *, segments: list[MapSegmentModel]
    ) -> list[MapSegmentModel]:
        return list(segments)


@RouteFactory.register(RouteType.MAX_SHELTER)
class MaxShelterRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.MAX_SHELTER

    def select_segments(
        self, *, segments: list[MapSegmentModel]
    ) -> list[MapSegmentModel]:
        sheltered = [segment for segment in segments if segment.is_sheltered]
        return sheltered if sheltered else list(segments)


@RouteFactory.register(RouteType.BARRIER_FREE)
class BarrierFreeRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.BARRIER_FREE

    def select_segments(
        self, *, segments: list[MapSegmentModel]
    ) -> list[MapSegmentModel]:
        return [
            segment
            for segment in segments
            if segment.confidence_score >= -10.0 and segment.stair_count == 0
        ]


@RouteFactory.register(RouteType.LOW_EFFORT)
class LowEffortRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.LOW_EFFORT

    def select_segments(
        self, *, segments: list[MapSegmentModel]
    ) -> list[MapSegmentModel]:
        stair_free = [segment for segment in segments if segment.stair_count == 0]
        return stair_free if stair_free else list(segments)


@RouteFactory.register(RouteType.WIDE_QUIET)
class WideQuietRouteStrategy(BaseRouteStrategy):
    route_type = RouteType.WIDE_QUIET

    def select_segments(
        self, *, segments: list[MapSegmentModel]
    ) -> list[MapSegmentModel]:
        quiet = [segment for segment in segments if segment.confidence_score >= 0.0]
        return quiet if quiet else list(segments)
