from unittest.mock import AsyncMock, patch

import pytest

from src.model.map_segment_model import MapSegmentModel
from src.model.repository.map_segment_repo import MapSegmentRepository


def _segment(score: float) -> MapSegmentModel:
    return MapSegmentModel.model_construct(
        segment_id="seg-1",
        confidence_score=score,
    )


@pytest.mark.asyncio
async def test_adjust_confidence_applies_delta() -> None:
    repo = MapSegmentRepository()
    segment = _segment(0.0)

    with (
        patch.object(
            MapSegmentModel, "find_one", new_callable=AsyncMock, return_value=segment
        ) as mock_find,
        patch.object(MapSegmentModel, "save", new_callable=AsyncMock) as mock_save,
    ):
        updated = await repo.adjust_confidence(segment_id="seg-1", delta=-2.0)

    mock_find.assert_awaited_once_with({"segment_id": "seg-1"})
    mock_save.assert_awaited_once()
    assert updated is segment
    assert segment.confidence_score == -2.0


@pytest.mark.asyncio
async def test_adjust_confidence_clamps_to_bounds() -> None:
    repo = MapSegmentRepository()
    low = _segment(-19.0)
    high = _segment(19.0)

    with (
        patch.object(
            MapSegmentModel, "find_one", new_callable=AsyncMock, return_value=low
        ),
        patch.object(MapSegmentModel, "save", new_callable=AsyncMock),
    ):
        await repo.adjust_confidence(segment_id="seg-1", delta=-2.0)
    assert low.confidence_score == -20.0

    with (
        patch.object(
            MapSegmentModel, "find_one", new_callable=AsyncMock, return_value=high
        ),
        patch.object(MapSegmentModel, "save", new_callable=AsyncMock),
    ):
        await repo.adjust_confidence(segment_id="seg-1", delta=2.0)
    assert high.confidence_score == 20.0


@pytest.mark.asyncio
async def test_adjust_confidence_missing_segment() -> None:
    repo = MapSegmentRepository()

    with (
        patch.object(
            MapSegmentModel, "find_one", new_callable=AsyncMock, return_value=None
        ),
        patch.object(MapSegmentModel, "save", new_callable=AsyncMock) as mock_save,
    ):
        result = await repo.adjust_confidence(segment_id="missing", delta=-2.0)

    mock_save.assert_not_awaited()
    assert result is None
