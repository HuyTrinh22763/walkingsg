from fastapi import APIRouter

from src.controllers import location_controller as controller

public_router = APIRouter()
public_router.get("/search")(controller.search_address)
public_router.post("/validate")(controller.validate_coordinates)

router = APIRouter(prefix="/v1/api/location", tags=["location"])
router.include_router(public_router)
