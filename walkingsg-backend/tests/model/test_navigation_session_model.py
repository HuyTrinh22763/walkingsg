from unittest.mock import AsyncMock, patch

import pytest
from beanie import PydanticObjectId

from src.model.navigation_session_model import (
    NavigationSessionModel,
    NavigationStatus,
)
from src.model.repository.navigation_session_repo import NavigationSessionRepository
from src.utils.index import utc_now


def test_navigation_status_enum() -> None:
    assert NavigationStatus.ACTIVE == "ACTIVE"
    assert NavigationStatus.COMPLETED == "COMPLETED"
    assert NavigationStatus.CANCELLED == "CANCELLED"


def test_navigation_session_model_fields() -> None:
    user_id = PydanticObjectId()
    route_id = PydanticObjectId()
    session = NavigationSessionModel.model_construct(
        user_id=user_id,
        route_id=route_id,
        current_location=(1.3483, 103.6831),
        traversed_segment_ids=[],
        session_status=NavigationStatus.ACTIVE,
        started_at=utc_now(),
        ended_at=None,
        updated_at=utc_now(),
    )

    assert session.user_id == user_id
    assert session.route_id == route_id
    assert session.current_location == (1.3483, 103.6831)
    assert session.traversed_segment_ids == []
    assert session.session_status == NavigationStatus.ACTIVE
    assert session.started_at is not None
    assert session.ended_at is None
    assert session.updated_at is not None


@pytest.mark.asyncio
async def test_repo_create() -> None:
    repo = NavigationSessionRepository()
    session = NavigationSessionModel.model_construct(
        user_id=PydanticObjectId(),
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
    )

    with patch.object(
        NavigationSessionModel, "insert", new_callable=AsyncMock
    ) as mock_insert:
        created = await repo.create(session=session)
        mock_insert.assert_awaited_once()
        assert created == session


@pytest.mark.asyncio
async def test_repo_find_by_id() -> None:
    repo = NavigationSessionRepository()
    session_id = PydanticObjectId()
    expected = NavigationSessionModel.model_construct(
        id=session_id,
        user_id=PydanticObjectId(),
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
    )

    with patch.object(
        NavigationSessionModel, "get", new_callable=AsyncMock, return_value=expected
    ) as mock_get:
        result = await repo.find_by_id(session_id=session_id)
        mock_get.assert_awaited_once_with(session_id)
        assert result == expected


@pytest.mark.asyncio
async def test_repo_find_active_by_user() -> None:
    repo = NavigationSessionRepository()
    user_id = PydanticObjectId()
    expected = NavigationSessionModel.model_construct(
        user_id=user_id,
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
    )

    with patch.object(
        NavigationSessionModel,
        "find_one",
        new_callable=AsyncMock,
        return_value=expected,
    ) as mock_find_one:
        result = await repo.find_active_by_user(user_id=user_id)
        mock_find_one.assert_awaited_once_with(
            {
                "user_id": user_id,
                "session_status": NavigationStatus.ACTIVE,
            }
        )
        assert result == expected


@pytest.mark.asyncio
async def test_repo_update_location() -> None:
    repo = NavigationSessionRepository()
    session = NavigationSessionModel.model_construct(
        user_id=PydanticObjectId(),
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
    )

    with patch.object(
        NavigationSessionModel, "save", new_callable=AsyncMock
    ) as mock_save:
        updated = await repo.update_location(
            session=session, current_location=(1.3490, 103.6840)
        )
        mock_save.assert_awaited_once()
        assert updated.current_location == (1.3490, 103.6840)


@pytest.mark.asyncio
async def test_repo_append_traversed_segment() -> None:
    repo = NavigationSessionRepository()
    session = NavigationSessionModel.model_construct(
        user_id=PydanticObjectId(),
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
        traversed_segment_ids=["seg-1"],
    )

    with patch.object(
        NavigationSessionModel, "save", new_callable=AsyncMock
    ) as mock_save:
        # Appending new segment
        await repo.append_traversed_segment(session=session, segment_id="seg-2")
        assert session.traversed_segment_ids == ["seg-1", "seg-2"]
        mock_save.assert_awaited_once()

        # Appending existing segment should not duplicate or save
        mock_save.reset_mock()
        await repo.append_traversed_segment(session=session, segment_id="seg-1")
        assert session.traversed_segment_ids == ["seg-1", "seg-2"]
        mock_save.assert_not_awaited()


@pytest.mark.asyncio
async def test_repo_update_route() -> None:
    repo = NavigationSessionRepository()
    session = NavigationSessionModel.model_construct(
        user_id=PydanticObjectId(),
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
    )
    new_route_id = PydanticObjectId()

    with patch.object(
        NavigationSessionModel, "save", new_callable=AsyncMock
    ) as mock_save:
        await repo.update_route(session=session, route_id=new_route_id)
        mock_save.assert_awaited_once()
        assert session.route_id == new_route_id


@pytest.mark.asyncio
async def test_repo_complete_session() -> None:
    repo = NavigationSessionRepository()
    session = NavigationSessionModel.model_construct(
        user_id=PydanticObjectId(),
        route_id=PydanticObjectId(),
        current_location=(1.3483, 103.6831),
    )

    with patch.object(
        NavigationSessionModel, "save", new_callable=AsyncMock
    ) as mock_save:
        await repo.complete_session(session=session, status=NavigationStatus.COMPLETED)
        mock_save.assert_awaited_once()
        assert session.session_status == NavigationStatus.COMPLETED
        assert session.ended_at is not None
