from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends

from src.auth.auth_utils import AuthContext, authentication_v2
from src.core.success_response import SuccessResponse, ok
from src.model.repository.hazard_repo import HazardRepository
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.model.repository.profile_repo import ProfileRepository
from src.model.repository.route_repo import RouteRepository
from src.schemas.route_schema import RouteDetailOut, RouteSearchOut, RouteSearchRequest
from src.services.route_service import RouteService

AuthDep = Annotated[AuthContext, Depends(authentication_v2)]


def get_route_service(
    map_segment_repo: Annotated[MapSegmentRepository, Depends(MapSegmentRepository)],
    route_repo: Annotated[RouteRepository, Depends(RouteRepository)],
    profile_repo: Annotated[ProfileRepository, Depends(ProfileRepository)],
    hazard_repo: Annotated[HazardRepository, Depends(HazardRepository)],
) -> RouteService:
    return RouteService(
        map_segment_repo=map_segment_repo,
        route_repo=route_repo,
        profile_repo=profile_repo,
        hazard_repo=hazard_repo,
    )


RouteServiceDep = Annotated[RouteService, Depends(get_route_service)]


async def generate_routes(
    payload: RouteSearchRequest,
    auth: AuthDep,
    route_service: RouteServiceDep,
) -> SuccessResponse[RouteSearchOut]:
    result = await route_service.generate_routes(auth.user.user_id, payload)
    return ok(result, message="Generate routes success!")


async def find_route(
    route_id: PydanticObjectId,
    route_service: RouteServiceDep,
) -> SuccessResponse[RouteDetailOut]:
    result = await route_service.find_route(route_id=route_id)
    return ok(result, message="Get route success!")
