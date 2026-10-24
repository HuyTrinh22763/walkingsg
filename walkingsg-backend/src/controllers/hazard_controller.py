from typing import Annotated

from fastapi import Depends, Query

from src.auth.auth_utils import AuthContext, authentication_v2
from src.core.success_response import SuccessResponse, created, ok
from src.model.repository.hazard_repo import HazardRepository
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.schemas.hazard_schema import HazardOut, HazardReportRequest, NearbyHazardsQuery
from src.services.hazard_service import HazardService

AuthDep = Annotated[AuthContext, Depends(authentication_v2)]


def get_hazard_service(
    hazard_repo: Annotated[HazardRepository, Depends(HazardRepository)],
    map_segment_repo: Annotated[MapSegmentRepository, Depends(MapSegmentRepository)],
) -> HazardService:
    return HazardService(
        hazard_repo=hazard_repo,
        map_segment_repo=map_segment_repo,
    )


HazardServiceDep = Annotated[HazardService, Depends(get_hazard_service)]


async def report_hazard(
    payload: HazardReportRequest,
    auth: AuthDep,
    hazard_service: HazardServiceDep,
) -> SuccessResponse[HazardOut]:
    result = await hazard_service.report_hazard(
        user_id=auth.user.user_id, payload=payload
    )
    return created(result, message="Report hazard success!")


async def get_nearby_hazards(
    query: Annotated[NearbyHazardsQuery, Query()],
    hazard_service: HazardServiceDep,
) -> SuccessResponse[list[HazardOut]]:
    result = await hazard_service.get_nearby_hazards(
        latitude=query.latitude, longitude=query.longitude
    )
    return ok(result, message="Get nearby hazards success!")
