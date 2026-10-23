from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["dev", "pro"] = "dev"
    app_port: int = Field(default=3052, validation_alias=AliasChoices("PORT", "APP_PORT"))
    db_uri: SecretStr
    db_name: str = "walkingsg"
    db_max_pool_size: int = 50
    jwt_secret: SecretStr
    api_key: SecretStr = SecretStr("walkingsg-secret-api-key")
    onemap_api_key: SecretStr = SecretStr("mock_key")
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: SecretStr | None = None
    smtp_from: str | None = None

def get_settings() -> Settings:
    return Settings()
