from http import HTTPStatus
from unittest.mock import AsyncMock

import pytest
from beanie import PydanticObjectId

from src.auth.auth_utils import AuthContext, TokenPayload
from src.controllers.hazard_controller import (
    get_hazard_service,
    get_nearby_hazards,
    report_hazard,
)
from src.model.hazard_model import HazardType
from src.model.key_token_model import KeyTokenModel
from src.model.repository.hazard_repo import HazardRepository
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.schemas.hazard_schema import HazardOut, HazardReportRequest, NearbyHazardsQuery
from src.services.hazard_service import HazardService
from src.utils.index import utc_now


def _hazard_out() -> HazardOut:
    return HazardOut(
        hazard_id=str(PydanticObjectId()),
        hazard_type=HazardType.FLOODING,
        segment_id="seg-1",
        latitude=1.3521,
        longitude=103.8198,
        report_timestamp=utc_now(),
    )


def _auth() -> AuthContext:
    user_id = PydanticObjectId()
    return AuthContext(
        user=TokenPayload(user_id=user_id, email="walker@e.ntu.edu.sg"),
        key_store=KeyTokenModel.model_construct(user_id=user_id),
    )


def test_get_hazard_service_wires_repositories() -> None:
    hazard_repo = HazardRepository()
    map_segment_repo = MapSegmentRepository()

    service = get_hazard_service(hazard_repo, map_segment_repo)

    assert isinstance(service, HazardService)
    assert service._hazard_repo is hazard_repo
    assert service._map_segment_repo is map_segment_repo


@pytest.mark.asyncio
async def test_report_hazard_passes_the_signed_in_user() -> None:
    auth = _auth()
    payload = HazardReportRequest(
        hazard_type=HazardType.FLOODING, latitude=1.3521, longitude=103.8198
    )
    hazard = _hazard_out()
    service = AsyncMock(spec=HazardService)
    service.report_hazard.return_value = hazard

    response = await report_hazard(payload, auth, service)

    service.report_hazard.assert_awaited_once_with(
        user_id=auth.user.user_id, payload=payload
    )
    assert response.status == HTTPStatus.CREATED
    assert response.metadata is hazard


@pytest.mark.asyncio
async def test_get_nearby_hazards_passes_the_query_coordinates() -> None:
    query = NearbyHazardsQuery(latitude=1.3521, longitude=103.8198)
    hazard = _hazard_out()
    service = AsyncMock(spec=HazardService)
    service.get_nearby_hazards.return_value = [hazard]

    response = await get_nearby_hazards(query, service)

    service.get_nearby_hazards.assert_awaited_once_with(
        latitude=1.3521, longitude=103.8198
    )
    assert response.status == HTTPStatus.OK
    assert response.metadata == [hazard]
