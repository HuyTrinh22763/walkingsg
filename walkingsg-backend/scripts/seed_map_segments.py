import asyncio
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import httpx
from pymongo import UpdateOne

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.configs.config import get_settings
from src.dbs.init_mongodb import Database
from src.model.map_segment_model import MapSegmentModel

NTU_BBOX = "103.678,1.342,103.692,1.355"
OSM_API_URL = f"https://api.openstreetmap.org/api/0.6/map?bbox={NTU_BBOX}"

PEDESTRIAN_HIGHWAYS = {
    "footway",
    "steps",
    "path",
    "pedestrian",
    "corridor",
    "cycleway",
}

SHELTER_VALUES = {"yes", "canopy", "arcade", "covered_walkway"}


def parse_osm_xml(xml_content: bytes) -> list[dict]:
    root = ET.fromstring(xml_content)

    nodes: dict[str, tuple[float, float]] = {}
    for node in root.findall("node"):
        node_id = node.attrib["id"]
        lat = float(node.attrib["lat"])
        lon = float(node.attrib["lon"])
        nodes[node_id] = (lat, lon)

    segments: list[dict] = []
    for way in root.findall("way"):
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
        highway = tags.get("highway")
        covered = tags.get("covered")
        shelter_type = tags.get("shelter_type")

        is_pedestrian = highway in PEDESTRIAN_HIGHWAYS
        is_shelter_feature = covered in SHELTER_VALUES or shelter_type is not None

        if not (is_pedestrian or is_shelter_feature):
            continue

        coords = [
            nodes[nd.attrib["ref"]]
            for nd in way.findall("nd")
            if nd.attrib["ref"] in nodes
        ]
        if len(coords) < 2:
            continue

        is_sheltered = (
            covered in SHELTER_VALUES
            or shelter_type in {"canopy", "covered_walkway"}
            or tags.get("building") == "roof"
        )
        is_steps = highway == "steps"
        step_count = int(tags.get("step_count", 12)) if is_steps else 0
        is_barrier_free = (step_count == 0) and (tags.get("wheelchair") != "no") and not is_steps

        steps_per_segment = max(1, step_count // (len(coords) - 1)) if is_steps else 0
        way_id = way.attrib["id"]

        for i in range(len(coords) - 1):
            segments.append({
                "segment_id": f"osm_{way_id}_{i}",
                "start_coordinates": coords[i],
                "end_coordinates": coords[i + 1],
                "confidence_score": 1.0,
                "is_barrier_free": is_barrier_free,
                "stair_count": steps_per_segment,
                "is_sheltered": is_sheltered,
            })

    return segments


async def seed() -> None:
    settings = get_settings()
    await Database.connect(settings)

    print(f"Fetching NTU walkway network from OpenStreetMap Core API ({NTU_BBOX})...")
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.get(
            OSM_API_URL,
            headers={"User-Agent": "WalkingSG-NTU-Seeder/1.0"},
        )
        if response.status_code != 200:
            print(f"Failed to fetch OSM data: HTTP {response.status_code}")
            await Database.close()
            sys.exit(1)

    print(f"Parsing OSM XML payload ({len(response.content) // 1024} KB)...")
    segments = parse_osm_xml(response.content)
    print(f"Parsed {len(segments)} pedestrian segments.")

    sheltered = sum(1 for s in segments if s["is_sheltered"])
    stairs = sum(1 for s in segments if s["stair_count"] > 0)
    barrier_free = sum(1 for s in segments if s["is_barrier_free"])
    print(f"Attributes: {sheltered} sheltered, {stairs} stairs, {barrier_free} barrier-free.")

    print("Upserting segments into MongoDB Atlas...")
    collection = MapSegmentModel.get_pymongo_collection()
    operations = [
        UpdateOne({"segment_id": s["segment_id"]}, {"$set": s}, upsert=True)
        for s in segments
    ]

    result = await collection.bulk_write(operations)
    total_in_db = await MapSegmentModel.count()
    print(f"Seeding complete: {result.upserted_count} inserted, {result.modified_count} updated.")
    print(f"Total map_segments in database: {total_in_db}")

    await Database.close()


if __name__ == "__main__":
    asyncio.run(seed())
