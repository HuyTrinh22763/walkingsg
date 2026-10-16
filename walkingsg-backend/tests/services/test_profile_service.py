from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from beanie import PydanticObjectId

from src.core.error_response import BadRequestError, NotFoundError
from src.model.profile_model import HeatUvSensitivity, MobilityNeeds, PreferredPace
from src.schemas.profile_schema import DeleteAccountRequest, ProfileUpdate
from src.services.profile_service import ProfileService


def make_profile(user_id: PydanticObjectId, **overrides) -> SimpleNamespace:
    data = {
        "id": PydanticObjectId(),
        "user_id": user_id,
        "name": "",
        "age": None,
        "mobility_needs": MobilityNeeds.NONE,
        "heat_uv_sensitivity": HeatUvSensitivity.MEDIUM,
        "max_stairs_per_route": 10,
        "preferred_pace": PreferredPace.RELAXED,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def make_update(**overrides) -> ProfileUpdate:
    data = {
        "name": "Natsu",
        "age": 21,
        "mobility_needs": "None",
        "heat_uv_sensitivity": "High",
        "max_stairs_per_route": 20,
        "preferred_pace": "Slow",
    }
    data.update(overrides)
    return ProfileUpdate(**data)


@pytest.fixture
def mock_dependencies():
    profile_repo = AsyncMock()
    user_repo = AsyncMock()
    creds_repo = AsyncMock()
    otp_repo = AsyncMock()
    key_service = AsyncMock()
    service = ProfileService(
        profile_repo=profile_repo,
        user_repo=user_repo,
        credentials_repo=creds_repo,
        otp_repo=otp_repo,
        key_token_service=key_service,
    )
    return {
        "service": service,
        "profile_repo": profile_repo,
        "user_repo": user_repo,
        "creds_repo": creds_repo,
        "otp_repo": otp_repo,
        "key_service": key_service,
    }


@pytest.mark.asyncio
async def test_get_profile_existing(mock_dependencies):
    service = mock_dependencies["service"]
    profile_repo = mock_dependencies["profile_repo"]

    user_id = PydanticObjectId()
    profile_repo.find_by_user_id.return_value = make_profile(user_id, name="Sam Tan")

    res = await service.get_profile(user_id)

    assert res.name == "Sam Tan"
    assert res.user_id == str(user_id)
    assert not profile_repo.create.called


@pytest.mark.asyncio
async def test_get_profile_creates_default_for_new_user(mock_dependencies):
    service = mock_dependencies["service"]
    profile_repo = mock_dependencies["profile_repo"]

    user_id = PydanticObjectId()
    profile_repo.find_by_user_id.return_value = None
    profile_repo.create.return_value = make_profile(user_id)

    res = await service.get_profile(user_id)

    profile_repo.create.assert_awaited_once_with(user_id=user_id)
    assert res.mobility_needs == MobilityNeeds.NONE
    assert res.heat_uv_sensitivity == HeatUvSensitivity.MEDIUM
    assert res.max_stairs_per_route == 10
    assert res.preferred_pace == PreferredPace.RELAXED


@pytest.mark.asyncio
async def test_update_profile_wheelchair_forces_zero_stairs(mock_dependencies):
    service = mock_dependencies["service"]
    profile_repo = mock_dependencies["profile_repo"]

    user_id = PydanticObjectId()
    profile_repo.update_by_user_id.return_value = make_profile(
        user_id, mobility_needs=MobilityNeeds.WHEELCHAIR, max_stairs_per_route=0
    )

    await service.update_profile(
        user_id, make_update(mobility_needs="Wheelchair", max_stairs_per_route=10)
    )

    saved_fields = profile_repo.update_by_user_id.call_args.kwargs["fields"]
    assert saved_fields["max_stairs_per_route"] == 0


@pytest.mark.asyncio
async def test_update_profile_non_wheelchair_keeps_stairs(mock_dependencies):
    service = mock_dependencies["service"]
    profile_repo = mock_dependencies["profile_repo"]

    user_id = PydanticObjectId()
    profile_repo.update_by_user_id.return_value = make_profile(user_id)

    await service.update_profile(
        user_id, make_update(mobility_needs="Mobility Aid", max_stairs_per_route=20)
    )

    saved_fields = profile_repo.update_by_user_id.call_args.kwargs["fields"]
    assert saved_fields["max_stairs_per_route"] == 20


@pytest.mark.asyncio
async def test_update_profile_creates_if_missing(mock_dependencies):
    service = mock_dependencies["service"]
    profile_repo = mock_dependencies["profile_repo"]

    user_id = PydanticObjectId()
    profile_repo.update_by_user_id.return_value = None
    profile_repo.create.return_value = make_profile(user_id, name="Natsu")

    res = await service.update_profile(user_id, make_update())

    assert profile_repo.create.called
    assert res.name == "Natsu"


@pytest.mark.asyncio
async def test_delete_account_success(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    user_id = PydanticObjectId()
    user_repo.find_by_id.return_value = MagicMock(id=user_id)

    res = await service.delete_account(user_id, DeleteAccountRequest(confirmation=True))

    assert res is True
    assert mock_dependencies["key_service"].delete_by_user_id.called
    assert mock_dependencies["otp_repo"].delete_by_user_id.called
    assert mock_dependencies["profile_repo"].delete_by_user_id.called
    assert mock_dependencies["creds_repo"].delete_by_user_id.called
    assert user_repo.delete_by_id.called


@pytest.mark.asyncio
async def test_delete_account_not_confirmed(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    with pytest.raises(BadRequestError):
        await service.delete_account(
            PydanticObjectId(), DeleteAccountRequest(confirmation=False)
        )
    assert not user_repo.delete_by_id.called


@pytest.mark.asyncio
async def test_delete_account_user_not_found(mock_dependencies):
    service = mock_dependencies["service"]
    user_repo = mock_dependencies["user_repo"]

    user_repo.find_by_id.return_value = None

    with pytest.raises(NotFoundError):
        await service.delete_account(
            PydanticObjectId(), DeleteAccountRequest(confirmation=True)
        )
    assert not user_repo.delete_by_id.called