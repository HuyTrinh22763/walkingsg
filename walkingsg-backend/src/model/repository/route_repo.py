from beanie import PydanticObjectId

from src.model.route_model import RouteModel


class RouteRepository:
    async def create(self, *, route: RouteModel) -> RouteModel:
        await route.insert()
        return route

    async def find_by_id(self, *, route_id: PydanticObjectId) -> RouteModel | None:
        return await RouteModel.get(route_id)

    async def find_by_user_id(self, *, user_id: PydanticObjectId) -> list[RouteModel]:
        return await (
            RouteModel.find({"user_id": user_id})
            .sort(-RouteModel.updated_at)
            .to_list()
        )
