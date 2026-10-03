from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["dev", "pro"] = "dev"
    app_port: int = 3052
    db_uri: SecretStr
    db_name: str = "walkingsg"
    db_max_pool_size: int = 50
    jwt_secret: SecretStr
    onemap_api_key: SecretStr = SecretStr("mock_key")

def get_settings() -> Settings:
    return Settings()
