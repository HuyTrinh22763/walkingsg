from beanie import PydanticObjectId

from src.model.navigation_session_model import (
    NavigationSessionModel,
    NavigationStatus,
)
from src.utils.index import utc_now


class NavigationSessionRepository:
    async def create(
        self, *, session: NavigationSessionModel
    ) -> NavigationSessionModel:
        await session.insert()
        return session

    async def find_by_id(
        self, *, session_id: PydanticObjectId
    ) -> NavigationSessionModel | None:
        return await NavigationSessionModel.get(session_id)

    async def find_active_by_user(
        self, *, user_id: PydanticObjectId
    ) -> NavigationSessionModel | None:
        return await NavigationSessionModel.find_one(
            {
                "user_id": user_id,
                "session_status": NavigationStatus.ACTIVE,
            }
        )

    async def update_location(
        self,
        *,
        session: NavigationSessionModel,
        current_location: tuple[float, float],
    ) -> NavigationSessionModel:
        session.current_location = current_location
        await session.save()
        return session

    async def append_traversed_segment(
        self,
        *,
        session: NavigationSessionModel,
        segment_id: str,
    ) -> NavigationSessionModel:
        if segment_id not in session.traversed_segment_ids:
            session.traversed_segment_ids.append(segment_id)
            await session.save()
        return session

    async def update_route(
        self,
        *,
        session: NavigationSessionModel,
        route_id: PydanticObjectId,
    ) -> NavigationSessionModel:
        session.route_id = route_id
        await session.save()
        return session

    async def complete_session(
        self,
        *,
        session: NavigationSessionModel,
        status: NavigationStatus,
    ) -> NavigationSessionModel:
        session.session_status = status
        session.ended_at = utc_now()
        await session.save()
        return session
