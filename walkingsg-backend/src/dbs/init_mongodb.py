from beanie import init_beanie
from pymongo import AsyncMongoClient

from src.configs.config import Settings
from src.model import DOCUMENT_MODELS


class Database:
    _client: AsyncMongoClient | None = None

    @classmethod
    async def connect(cls, settings: Settings) -> None:
        if cls._client is not None:
            return
        cls._client = AsyncMongoClient(
            settings.db_uri.get_secret_value(),
            maxPoolSize=settings.db_max_pool_size,
        )
        await init_beanie(
            database=cls._client[settings.db_name],
            document_models=DOCUMENT_MODELS,
        )

    @classmethod
    async def close(cls) -> None:
        if cls._client is not None:
            await cls._client.close()
            cls._client = None
