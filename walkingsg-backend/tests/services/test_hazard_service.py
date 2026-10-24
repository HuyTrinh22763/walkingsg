from datetime import timedelta
from unittest.mock import AsyncMock

import pytest
from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, NotFoundError
from src.model.hazard_model import HazardLocation, HazardModel, HazardStatus, HazardType
from src.model.map_segment_model import MapSegmentModel
from src.model.repository.hazard_repo import HazardRepository
from src.model.repository.map_segment_repo import MapSegmentRepository
from src.schemas.hazard_schema import HazardReportRequest
from src.services.hazard_service import (
    HAZARD_PENALTY,
    HAZARD_RADIUS_M,
    HAZARD_TTL,
    HazardService,
)
from src.utils.index import utc_now


def test_hazard_service_holds_repositories() -> None:
    hazard_repo = HazardRepository()
    map_segment_repo = MapSegmentRepository()
    service = HazardService(
        hazard_repo=hazard_repo,
        map_segment_repo=map_segment_repo,
    )

    assert service._hazard_repo is hazard_repo
    assert service._map_segment_repo is map_segment_repo


def _service() -> tuple[HazardService, AsyncMock, AsyncMock]:
    hazard_repo = AsyncMock(spec=HazardRepository)
    map_segment_repo = AsyncMock(spec=MapSegmentRepository)
    return (
        HazardService(hazard_repo=hazard_repo, map_segment_repo=map_segment_repo),
        hazard_repo,
        map_segment_repo,
    )


def _report() -> HazardReportRequest:
    return HazardReportRequest(
        hazard_type=HazardType.FLOODING, latitude=1.3521, longitude=103.8198
    )


@pytest.mark.asyncio
async def test_report_hazard_links_nearest_segment_and_deducts_confidence() -> None:
    service, hazard_repo, map_segment_repo = _service()
    user_id = PydanticObjectId()
    stored_id = PydanticObjectId()
    map_segment_repo.find_nearest_to_coord.return_value = (
        MapSegmentModel.model_construct(segment_id="seg-1")
    )

    async def create(*, hazard):
        hazard.id = stored_id
        return hazard

    hazard_repo.create.side_effect = create

    result = await service.report_hazard(user_id=user_id, payload=_report())

    stored = hazard_repo.create.await_args.kwargs["hazard"]
    assert stored.reported_by_user_id == user_id
    assert stored.segment_id == "seg-1"
    assert stored.hazard_status == HazardStatus.ACTIVE
    assert stored.location.coordinates == (103.8198, 1.3521)
    map_segment_repo.adjust_confidence.assert_awaited_once_with(
        segment_id="seg-1", delta=-HAZARD_PENALTY
    )
    assert result.hazard_id == str(stored_id)
    assert result.segment_id == "seg-1"
    assert result.latitude == 1.3521
    assert result.longitude == 103.8198


@pytest.mark.asyncio
async def test_report_hazard_rejects_a_point_outside_singapore() -> None:
    service, hazard_repo, map_segment_repo = _service()
    payload = HazardReportRequest(
        hazard_type=HazardType.BLOCKED, latitude=0.0, longitude=0.0
    )

    with pytest.raises(BadRequestError):
        await service.report_hazard(user_id=PydanticObjectId(), payload=payload)

    hazard_repo.create.assert_not_awaited()
    map_segment_repo.find_nearest_to_coord.assert_not_awaited()


@pytest.mark.asyncio
async def test_report_hazard_rejects_a_point_with_no_segment() -> None:
    service, hazard_repo, map_segment_repo = _service()
    map_segment_repo.find_nearest_to_coord.return_value = None

    with pytest.raises(NotFoundError):
        await service.report_hazard(user_id=PydanticObjectId(), payload=_report())

    hazard_repo.create.assert_not_awaited()
    map_segment_repo.adjust_confidence.assert_not_awaited()


@pytest.mark.asyncio
async def test_restore_expired_hazards_expires_then_restores_confidence() -> None:
    service, hazard_repo, map_segment_repo = _service()
    first = HazardModel.model_construct(id=PydanticObjectId(), segment_id="seg-1")
    second = HazardModel.model_construct(id=PydanticObjectId(), segment_id="seg-2")
    hazard_repo.find_expired_active_hazards.return_value = [first, second]
    order: list[str] = []

    async def set_status(*, hazard_id, status):
        order.append(f"status:{hazard_id}")
        return HazardModel.model_construct(id=hazard_id)

    async def adjust_confidence(*, segment_id, delta):
        order.append(f"confidence:{segment_id}:{delta}")

    hazard_repo.set_status.side_effect = set_status
    map_segment_repo.adjust_confidence.side_effect = adjust_confidence

    restored = await service.restore_expired_hazards()

    cutoff = hazard_repo.find_expired_active_hazards.await_args.kwargs["cutoff"]
    age = utc_now() - cutoff
    assert HAZARD_TTL <= age <= HAZARD_TTL + timedelta(seconds=5)
    assert restored == 2
    assert order == [
        f"status:{first.id}",
        f"confidence:seg-1:{HAZARD_PENALTY}",
        f"status:{second.id}",
        f"confidence:seg-2:{HAZARD_PENALTY}",
    ]


@pytest.mark.asyncio
async def test_restore_expired_hazards_skips_a_missing_row() -> None:
    service, hazard_repo, map_segment_repo = _service()
    hazard_repo.find_expired_active_hazards.return_value = [
        HazardModel.model_construct(id=PydanticObjectId(), segment_id="seg-1")
    ]
    hazard_repo.set_status.return_value = None

    restored = await service.restore_expired_hazards()

    assert restored == 0
    map_segment_repo.adjust_confidence.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_nearby_hazards_restores_before_the_feed_query() -> None:
    service, hazard_repo, _map_segment_repo = _service()
    order: list[str] = []
    hazard = HazardModel.model_construct(
        id=PydanticObjectId(),
        segment_id="seg-1",
        hazard_type=HazardType.FLOODING,
        location=HazardLocation(coordinates=(103.8198, 1.3521)),
        report_timestamp=utc_now(),
    )

    async def restore() -> int:
        order.append("restore")
        return 0

    async def find(**_kwargs):
        order.append("find")
        return [hazard]

    service.restore_expired_hazards = AsyncMock(side_effect=restore)
    hazard_repo.find_active_within_radius.side_effect = find

    result = await service.get_nearby_hazards(latitude=1.3521, longitude=103.8198)

    kwargs = hazard_repo.find_active_within_radius.await_args.kwargs
    age = utc_now() - kwargs["since"]
    assert order == ["restore", "find"]
    assert kwargs["radius_m"] == HAZARD_RADIUS_M
    assert HAZARD_TTL <= age <= HAZARD_TTL + timedelta(seconds=5)
    assert len(result) == 1
    assert result[0].segment_id == "seg-1"
    assert result[0].latitude == 1.3521


@pytest.mark.asyncio
async def test_get_nearby_hazards_rejects_a_point_outside_singapore() -> None:
    service, hazard_repo, _map_segment_repo = _service()

    with pytest.raises(BadRequestError):
        await service.get_nearby_hazards(latitude=0.0, longitude=0.0)

    hazard_repo.find_active_within_radius.assert_not_awaited()
