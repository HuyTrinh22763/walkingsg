from src.model.map_segment_model import MapSegmentModel
from src.utils.index import clamp, haversine_distance

_SEARCH_PADDING_DEG = 0.01


class MapSegmentRepository:
    async def find_segments_in_bbox(
        self, *, min_lat: float, max_lat: float, min_lng: float, max_lng: float
    ) -> list[MapSegmentModel]:
        lat_range = {"$gte": min_lat, "$lte": max_lat}
        lng_range = {"$gte": min_lng, "$lte": max_lng}
        return await MapSegmentModel.find(
            {
                "$or": [
                    {
                        "start_coordinates.0": lat_range,
                        "start_coordinates.1": lng_range,
                    },
                    {
                        "end_coordinates.0": lat_range,
                        "end_coordinates.1": lng_range,
                    },
                ]
            }
        ).to_list()

    async def find_by_ids(self, *, segment_ids: list[str]) -> list[MapSegmentModel]:
        segments = await MapSegmentModel.find(
            {"segment_id": {"$in": segment_ids}}
        ).to_list()
        order = {segment_id: index for index, segment_id in enumerate(segment_ids)}
        return sorted(segments, key=lambda segment: order[segment.segment_id])

    async def find_nearest_to_coord(
        self, *, latitude: float, longitude: float
    ) -> MapSegmentModel | None:
        candidates = await self.find_segments_in_bbox(
            min_lat=latitude - _SEARCH_PADDING_DEG,
            max_lat=latitude + _SEARCH_PADDING_DEG,
            min_lng=longitude - _SEARCH_PADDING_DEG,
            max_lng=longitude + _SEARCH_PADDING_DEG,
        )
        nearest: MapSegmentModel | None = None
        shortest = float("inf")
        for segment in candidates:
            for coord in (segment.start_coordinates, segment.end_coordinates):
                distance = haversine_distance((latitude, longitude), coord)
                if distance < shortest:
                    shortest = distance
                    nearest = segment
        return nearest

    async def adjust_confidence(
        self, *, segment_id: str, delta: float
    ) -> MapSegmentModel | None:
        segment = await MapSegmentModel.find_one({"segment_id": segment_id})
        if segment is None:
            return None
        segment.confidence_score = float(
            clamp(segment.confidence_score + delta, -20.0, 20.0)
        )
        await segment.save()
        return segment
