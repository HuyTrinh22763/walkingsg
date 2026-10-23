from typing import Annotated

from fastapi import Depends

from src.controllers.route_controller import get_route_service
from src.core.success_response import SuccessResponse, created, ok
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.model.repository.navigation_session_repo import NavigationSessionRepository
from src.model.repository.route_repo import RouteRepository
from src.schemas.navigation_schema import (
    NavEndOut,
    NavEndRequest,
    NavStartOut,
    NavStartRequest,
    NavTrackOut,
    NavTrackRequest,
)
from src.services.navigation_service import NavigationService
from src.services.route_service import RouteService


def get_navigation_service(
    session_repo: Annotated[
        NavigationSessionRepository, Depends(NavigationSessionRepository)
    ],
    route_repo: Annotated[RouteRepository, Depends(RouteRepository)],
    map_segment_repo: Annotated[
        MapSegmentRepository, Depends(MapSegmentRepository)
    ],
    route_service: Annotated[RouteService, Depends(get_route_service)],
) -> NavigationService:
    return NavigationService(
        session_repo=session_repo,
        route_repo=route_repo,
        map_segment_repo=map_segment_repo,
        route_service=route_service,
    )


NavigationServiceDep = Annotated[NavigationService, Depends(get_navigation_service)]


async def start_navigation(
    payload: NavStartRequest,
    service: NavigationServiceDep,
) -> SuccessResponse[NavStartOut]:
    result = await service.start_navigation(payload=payload)
    return created(result, message="Start navigation session success!")


async def track_position(
    payload: NavTrackRequest,
    service: NavigationServiceDep,
) -> SuccessResponse[NavTrackOut]:
    result = await service.track_position(payload=payload)
    return ok(result, message="Track navigation position success!")


async def end_navigation(
    payload: NavEndRequest,
    service: NavigationServiceDep,
) -> SuccessResponse[NavEndOut]:
    result = await service.end_navigation(payload=payload)
    return ok(result, message="End navigation session success!")
