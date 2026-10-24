from datetime import datetime

from beanie import PydanticObjectId

from src.model.hazard_model import HazardModel, HazardStatus

_EARTH_RADIUS_M = 6_378_100


class HazardRepository:
    async def create(self, *, hazard: HazardModel) -> HazardModel:
        await hazard.insert()
        return hazard

    async def find_active_within_radius(
        self,
        *,
        latitude: float,
        longitude: float,
        since: datetime,
        radius_m: float = 5000,
    ) -> list[HazardModel]:
        return await (
            HazardModel.find(
                {
                    "location": {
                        "$geoWithin": {
                            "$centerSphere": [
                                [longitude, latitude],
                                radius_m / _EARTH_RADIUS_M,
                            ]
                        }
                    },
                    "hazard_status": HazardStatus.ACTIVE,
                    "report_timestamp": {"$gte": since},
                }
            )
            .sort("-report_timestamp")
            .to_list()
        )

    async def find_expired_active_hazards(
        self, *, cutoff: datetime
    ) -> list[HazardModel]:
        return await HazardModel.find(
            {
                "hazard_status": HazardStatus.ACTIVE,
                "report_timestamp": {"$lt": cutoff},
            }
        ).to_list()

    async def set_status(
        self, *, hazard_id: PydanticObjectId, status: HazardStatus
    ) -> HazardModel | None:
        hazard = await HazardModel.get(hazard_id)
        if hazard is None:
            return None
        hazard.hazard_status = status
        await hazard.save()
        return hazard
