from datetime import timedelta

from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, NotFoundError
from src.model.hazard_model import HazardLocation, HazardModel, HazardStatus
from src.model.repository.hazard_repo import HazardRepository
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.schemas.hazard_schema import HazardOut, HazardReportRequest
from src.utils.index import is_within_singapore, utc_now

HAZARD_RADIUS_M = 5000
HAZARD_TTL = timedelta(hours=72)
HAZARD_PENALTY = 2.0


class HazardService:
    def __init__(
        self,
        hazard_repo: HazardRepository,
        map_segment_repo: MapSegmentRepository,
    ) -> None:
        self._hazard_repo = hazard_repo
        self._map_segment_repo = map_segment_repo

    async def report_hazard(
        self, *, user_id: PydanticObjectId, payload: HazardReportRequest
    ) -> HazardOut:
        if not is_within_singapore(payload.latitude, payload.longitude):
            raise BadRequestError(
                "Invalid location. Please select a valid location within Singapore"
            )

        segment = await self._map_segment_repo.find_nearest_to_coord(
            latitude=payload.latitude, longitude=payload.longitude
        )
        if segment is None:
            raise NotFoundError("No map segment found near this location")

        hazard = HazardModel.model_construct(
            reported_by_user_id=user_id,
            segment_id=segment.segment_id,
            hazard_type=payload.hazard_type,
            hazard_status=HazardStatus.ACTIVE,
            location=HazardLocation(
                coordinates=(payload.longitude, payload.latitude)
            ),
            report_timestamp=utc_now(),
        )
        created = await self._hazard_repo.create(hazard=hazard)
        await self._map_segment_repo.adjust_confidence(
            segment_id=segment.segment_id, delta=-HAZARD_PENALTY
        )
        return HazardOut.model_validate(created)

    async def restore_expired_hazards(self) -> int:
        cutoff = utc_now() - HAZARD_TTL
        expired = await self._hazard_repo.find_expired_active_hazards(cutoff=cutoff)
        restored = 0
        for hazard in expired:
            updated = await self._hazard_repo.set_status(
                hazard_id=hazard.id, status=HazardStatus.EXPIRED
            )
            if updated is None:
                continue
            await self._map_segment_repo.adjust_confidence(
                segment_id=hazard.segment_id, delta=HAZARD_PENALTY
            )
            restored += 1
        return restored

    async def get_nearby_hazards(
        self, *, latitude: float, longitude: float
    ) -> list[HazardOut]:
        if not is_within_singapore(latitude, longitude):
            raise BadRequestError(
                "Invalid location. Please select a valid location within Singapore"
            )
        await self.restore_expired_hazards()
        hazards = await self._hazard_repo.find_active_within_radius(
            latitude=latitude,
            longitude=longitude,
            since=utc_now() - HAZARD_TTL,
            radius_m=HAZARD_RADIUS_M,
        )
        return [HazardOut.model_validate(hazard) for hazard in hazards]
