from typing import Any


def format_hazard_response(value: Any) -> dict[str, Any]:
    """Turn a stored hazard into HazardOut fields."""
    if isinstance(value, dict):
        data = dict(value)
    else:
        hazard_id = getattr(value, "hazard_id", None) or getattr(value, "id", None)
        data = {
            "hazard_id": hazard_id,
            "hazard_type": value.hazard_type,
            "segment_id": value.segment_id,
            "report_timestamp": value.report_timestamp,
            "latitude": getattr(value, "latitude", None),
            "longitude": getattr(value, "longitude", None),
            "location": getattr(value, "location", None),
        }
    location = data.pop("location", None)
    if location is not None:
        coordinates = (
            location["coordinates"]
            if isinstance(location, dict)
            else location.coordinates
        )
        data["longitude"], data["latitude"] = coordinates
    if data.get("hazard_id") is not None:
        data["hazard_id"] = str(data["hazard_id"])
    return data
