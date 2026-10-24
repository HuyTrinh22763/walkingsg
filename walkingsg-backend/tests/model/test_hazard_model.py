from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from beanie import PydanticObjectId
from pymongo import ASCENDING, DESCENDING, GEOSPHERE

from src.model import DOCUMENT_MODELS
from src.model.hazard_model import (
    COLLECTION_NAME,
    HazardLocation,
    HazardModel,
    HazardStatus,
    HazardType,
)
from src.model.repository.hazard_repo import HazardRepository
from src.utils.index import utc_now


def test_hazard_model_defaults() -> None:
    assert HazardModel.model_fields["hazard_status"].default == HazardStatus.ACTIVE
    assert HazardModel.model_fields["report_timestamp"].default_factory is utc_now

    user_id = PydanticObjectId()
    reported_at = utc_now()
    hazard = HazardModel.model_construct(
        reported_by_user_id=user_id,
        segment_id="seg-1",
        hazard_type=HazardType.FLOODING,
        hazard_status=HazardStatus.ACTIVE,
        location=HazardLocation(coordinates=(103.8198, 1.3521)),
        report_timestamp=reported_at,
    )

    assert hazard.reported_by_user_id == user_id
    assert hazard.segment_id == "seg-1"
    assert hazard.hazard_type == HazardType.FLOODING
    assert hazard.hazard_status == HazardStatus.ACTIVE
    assert hazard.location.type == "Point"
    assert hazard.location.coordinates == (103.8198, 1.3521)
    assert hazard.report_timestamp == reported_at


def test_hazard_model_is_registered() -> None:
    assert HazardModel in DOCUMENT_MODELS


def test_hazard_model_indexes() -> None:
    assert HazardModel.Settings.name == COLLECTION_NAME
    keys = [list(index.document["key"].items()) for index in HazardModel.Settings.indexes]
    assert [("location", GEOSPHERE)] in keys
    assert [("hazard_status", ASCENDING), ("report_timestamp", DESCENDING)] in keys


@pytest.mark.asyncio
async def test_hazard_repo_create() -> None:
    repo = HazardRepository()
    hazard = HazardModel.model_construct(
        reported_by_user_id=PydanticObjectId(),
        segment_id="seg-1",
        hazard_type=HazardType.FLOODING,
        location=HazardLocation(coordinates=(103.8198, 1.3521)),
    )

    with patch.object(HazardModel, "insert", new_callable=AsyncMock) as mock_insert:
        created = await repo.create(hazard=hazard)
        mock_insert.assert_awaited_once()
        assert created == hazard


@pytest.mark.asyncio
async def test_hazard_repo_find_active_within_radius() -> None:
    repo = HazardRepository()
    since = utc_now()
    expected = [HazardModel.model_construct(segment_id="seg-1")]
    query = MagicMock()
    query.sort.return_value.to_list = AsyncMock(return_value=expected)

    with patch.object(HazardModel, "find", return_value=query) as mock_find:
        result = await repo.find_active_within_radius(
            latitude=1.3521, longitude=103.8198, since=since
        )

    assert result == expected
    passed = mock_find.call_args.args[0]
    assert passed["hazard_status"] == HazardStatus.ACTIVE
    assert passed["report_timestamp"] == {"$gte": since}
    center, radius = passed["location"]["$geoWithin"]["$centerSphere"]
    assert center == [103.8198, 1.3521]
    assert radius == pytest.approx(5000 / 6_378_100)
    query.sort.assert_called_once_with("-report_timestamp")


@pytest.mark.asyncio
async def test_hazard_repo_find_expired_active_hazards() -> None:
    repo = HazardRepository()
    cutoff = utc_now()
    expected = [HazardModel.model_construct(segment_id="seg-old")]
    query = MagicMock()
    query.to_list = AsyncMock(return_value=expected)

    with patch.object(HazardModel, "find", return_value=query) as mock_find:
        result = await repo.find_expired_active_hazards(cutoff=cutoff)

    assert result == expected
    mock_find.assert_called_once_with(
        {
            "hazard_status": HazardStatus.ACTIVE,
            "report_timestamp": {"$lt": cutoff},
        }
    )


@pytest.mark.asyncio
async def test_hazard_repo_set_status() -> None:
    repo = HazardRepository()
    hazard_id = PydanticObjectId()
    hazard = HazardModel.model_construct(
        id=hazard_id,
        hazard_status=HazardStatus.ACTIVE,
    )

    with (
        patch.object(
            HazardModel, "get", new_callable=AsyncMock, return_value=hazard
        ) as mock_get,
        patch.object(HazardModel, "save", new_callable=AsyncMock) as mock_save,
    ):
        updated = await repo.set_status(
            hazard_id=hazard_id, status=HazardStatus.EXPIRED
        )

    mock_get.assert_awaited_once_with(hazard_id)
    mock_save.assert_awaited_once()
    assert updated is hazard
    assert hazard.hazard_status == HazardStatus.EXPIRED


@pytest.mark.asyncio
async def test_hazard_repo_set_status_missing() -> None:
    repo = HazardRepository()
    hazard_id = PydanticObjectId()

    with patch.object(
        HazardModel, "get", new_callable=AsyncMock, return_value=None
    ) as mock_get:
        result = await repo.set_status(
            hazard_id=hazard_id, status=HazardStatus.EXPIRED
        )

    mock_get.assert_awaited_once_with(hazard_id)
    assert result is None
